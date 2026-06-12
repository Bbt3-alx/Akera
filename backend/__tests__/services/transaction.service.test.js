import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import Company from "../../models/Company.js";
import CompanyExchangeRate from "../../models/CompanyExchangeRate.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import Transaction from "../../models/Transaction.js";
import {
  createTransactionService,
  finalizeReversedTransaction,
} from "../../services/transaction.service.js";

describe("transaction service helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createTransactionService", () => {
    it("validates active partner membership before returning an idempotent transaction", async () => {
      const session = mockMongooseSession();
      const ids = createIds();
      const membership = createMembership(ids);
      const existingTransaction = createTransaction(ids);
      const membershipFindOne = jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(membership));
      const transactionFindOne = jest
        .spyOn(Transaction, "findOne")
        .mockReturnValue(createSessionQuery(existingTransaction));

      const result = await createTransactionService(createServiceInput(ids));

      expect(result).toBe(existingTransaction);
      expect(membershipFindOne).toHaveBeenCalledWith({
        _id: ids.membershipId,
        user: ids.userId,
        company: ids.companyId,
        role: "partner",
        status: "active",
      });
      expect(transactionFindOne).toHaveBeenCalledWith({
        idempotencyKey: "idem-1",
        company: ids.companyId,
        createdBy: ids.userId,
        membership: ids.membershipId,
      });
      expect(
        membershipFindOne.mock.invocationCallOrder[0],
      ).toBeLessThan(transactionFindOne.mock.invocationCallOrder[0]);
      expect(session.endSession).toHaveBeenCalled();
    });

    it("rejects managers before idempotency lookup can return an existing transaction", async () => {
      mockMongooseSession();
      const ids = createIds();
      const membershipFindOne = jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(null));
      const transactionFindOne = jest
        .spyOn(Transaction, "findOne")
        .mockReturnValue(createSessionQuery(createTransaction(ids)));

      await expect(
        createTransactionService(createServiceInput(ids)),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "PARTNER_ACCOUNT_NOT_FOUND",
      });

      expect(membershipFindOne).toHaveBeenCalledWith({
        _id: ids.membershipId,
        user: ids.userId,
        company: ids.companyId,
        role: "partner",
        status: "active",
      });
      expect(transactionFindOne).not.toHaveBeenCalled();
    });

    it("does not return another partner's transaction for the same idempotency key", async () => {
      mockMongooseSession();
      const ids = createIds();
      const otherPartnerId = new mongoose.Types.ObjectId();
      const membership = createMembership(ids);
      const existingOtherPartnerTransaction = createTransaction({
        ...ids,
        userId: otherPartnerId,
      });
      jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(membership));
      const transactionFindOne = jest
        .spyOn(Transaction, "findOne")
        .mockImplementation((filter) =>
          createSessionQuery(
            filter.createdBy?.toString() === otherPartnerId.toString()
              ? existingOtherPartnerTransaction
              : null,
          ),
        );
      jest.spyOn(Company, "findById").mockReturnValue(
        createSessionQuery({
          _id: ids.companyId,
          baseCurrency: "FCFA",
          code: "AKR",
        }),
      );
      jest
        .spyOn(CompanyExchangeRate, "findOne")
        .mockReturnValue(createSessionQuery({ rate: 1 }));
      jest
        .spyOn(Transaction, "create")
        .mockResolvedValue([createTransaction(ids)]);
      jest
        .spyOn(CompanyMembership, "updateOne")
        .mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(LedgerEntry, "insertMany").mockResolvedValue([]);

      const result = await createTransactionService(createServiceInput(ids));

      expect(result.createdBy).toBe(ids.userId);
      expect(transactionFindOne).toHaveBeenCalledWith({
        idempotencyKey: "idem-1",
        company: ids.companyId,
        createdBy: ids.userId,
        membership: ids.membershipId,
      });
      expect(Transaction.create).toHaveBeenCalled();
    });

    it("rejects inactive or missing partner membership before idempotency lookup", async () => {
      mockMongooseSession();
      const ids = createIds();
      jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(null));
      const transactionFindOne = jest
        .spyOn(Transaction, "findOne")
        .mockReturnValue(createSessionQuery(createTransaction(ids)));

      await expect(
        createTransactionService(createServiceInput(ids)),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "PARTNER_ACCOUNT_NOT_FOUND",
      });

      expect(transactionFindOne).not.toHaveBeenCalled();
    });

    it("creates a transaction for an active partner when the idempotency key is new", async () => {
      mockMongooseSession();
      const ids = createIds();
      const membership = createMembership(ids);
      const createdTransaction = createTransaction(ids);
      jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(membership));
      jest.spyOn(Transaction, "findOne").mockReturnValue(createSessionQuery(null));
      jest.spyOn(Company, "findById").mockReturnValue(
        createSessionQuery({
          _id: ids.companyId,
          baseCurrency: "FCFA",
          code: "AKR",
        }),
      );
      jest
        .spyOn(CompanyExchangeRate, "findOne")
        .mockReturnValue(createSessionQuery({ rate: 1 }));
      const transactionCreate = jest
        .spyOn(Transaction, "create")
        .mockResolvedValue([createdTransaction]);
      jest
        .spyOn(CompanyMembership, "updateOne")
        .mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(LedgerEntry, "insertMany").mockResolvedValue([]);

      const result = await createTransactionService(createServiceInput(ids));

      expect(result).toBe(createdTransaction);
      expect(transactionCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            company: ids.companyId,
            membership: ids.membershipId,
            idempotencyKey: "idem-1",
            createdBy: ids.userId,
          }),
        ],
        { session: expect.any(Object) },
      );
    });
  });

  describe("finalizeReversedTransaction", () => {
    it("persists reversedReason and not legacy reverseReason", async () => {
      const reversedAt = new Date("2026-06-12T12:00:00.000Z");
      const transaction = {
        save: jest.fn().mockResolvedValue(undefined),
      };

      const result = await finalizeReversedTransaction({
        managerId: "manager-1",
        now: reversedAt,
        reason: "Manager correction",
        session: "session-1",
        transaction,
      });

      expect(result).toBe(transaction);
      expect(transaction.status).toBe("reversed");
      expect(transaction.reversedAt).toBe(reversedAt);
      expect(transaction.reversedBy).toBe("manager-1");
      expect(transaction.reversedReason).toBe("Manager correction");
      expect(transaction).not.toHaveProperty("reverseReason");
      expect(transaction.save).toHaveBeenCalledWith({ session: "session-1" });
    });
  });
});

function mockMongooseSession() {
  const session = {
    endSession: jest.fn().mockResolvedValue(undefined),
    withTransaction: jest.fn(async (work) => {
      await work();
    }),
  };

  jest.spyOn(mongoose, "startSession").mockResolvedValue(session);

  return session;
}

function createSessionQuery(result) {
  return {
    session: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    companyId: new mongoose.Types.ObjectId(),
    membershipId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
  };
}

function createMembership({ companyId, membershipId, userId }) {
  return {
    _id: membershipId,
    user: userId,
    company: companyId,
    role: "partner",
    status: "active",
    balance: 5000,
    currency: "FCFA",
  };
}

function createTransaction({
  companyId,
  membershipId,
  userId,
}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    transactionCode: "AKR-000001",
    company: companyId,
    membership: membershipId,
    inputAmount: 1000,
    inputCurrency: "FCFA",
    partnerAmount: 1000,
    partnerCurrency: "FCFA",
    companyAmount: 1000,
    companyCurrency: "FCFA",
    beneficiaryName: "Awa Diallo",
    status: "pending",
    idempotencyKey: "idem-1",
    createdBy: userId,
  };
}

function createServiceInput({ companyId, membershipId, userId }) {
  return {
    companyId,
    membershipId,
    userId,
    payload: {
      inputAmount: 1000,
      inputCurrency: "FCFA",
      beneficiaryName: "Awa Diallo",
      idempotencyKey: "idem-1",
    },
  };
}
