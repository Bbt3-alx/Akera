import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("../../utils/generateReceiptPdf.js", () => ({
  generateReceiptPdf: jest.fn(async ({ receiptNumber }) =>
    `/tmp/receipt-${receiptNumber}.pdf`
  ),
}));

import { ACCOUNTS } from "../../constants/accounts.js";
import Company from "../../models/Company.js";
import AccountOperation from "../../models/AccountOperation.js";
import CompanyBranding from "../../models/CompanyBranding.js";
import CompanyExchangeRate from "../../models/CompanyExchangeRate.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import Receipt from "../../models/Receipt.js";
import Transaction from "../../models/Transaction.js";
import {
  createCollectionTransactionService,
  createTransactionService,
  finalizeReversedTransaction,
  cancelPendingTransactionService,
  getTransactionByCodeForContext,
  getTrialBalanceForCompany,
  listCompanyTransactions,
  listMyTransactions,
  payTransactionService,
  reverseCompletedTransactionService,
} from "../../services/transaction.service.js";

describe("transaction service helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("transaction read services", () => {
    it("lists company transactions with pagination for company-wide readers", async () => {
      const ids = createIds();
      const transaction = createTransaction(ids);
      const find = jest
        .spyOn(Transaction, "find")
        .mockReturnValue(createFindManyQuery([transaction]));
      const countDocuments = jest
        .spyOn(Transaction, "countDocuments")
        .mockResolvedValue(1);

      const result = await listCompanyTransactions({
        companyId: ids.companyId,
        query: { page: "2", limit: "5", status: "pending" },
      });

      const expectedFilter = {
        company: ids.companyId,
        status: "pending",
      };
      expect(find).toHaveBeenCalledWith(expectedFilter);
      expect(countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(result).toEqual({
        pagination: {
          page: 2,
          limit: 5,
          total: 1,
          totalPages: 1,
        },
        transactions: [transaction],
      });
    });

    it("lists only the requesting partner's transactions", async () => {
      const ids = createIds();
      const transaction = createTransaction(ids);
      const find = jest
        .spyOn(Transaction, "find")
        .mockReturnValue(createFindManyQuery([transaction]));
      const countDocuments = jest
        .spyOn(Transaction, "countDocuments")
        .mockResolvedValue(1);

      await listMyTransactions({
        companyId: ids.companyId,
        userId: ids.userId,
        query: { status: "pending" },
      });

      const expectedFilter = {
        company: ids.companyId,
        createdBy: ids.userId,
        status: "pending",
      };
      expect(find).toHaveBeenCalledWith(expectedFilter);
      expect(countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(find.mock.calls[0][0]).not.toHaveProperty("initiatedBy");
    });

    it("prevents partners from reading another partner's transaction by code", async () => {
      const ids = createIds();
      const findOne = jest
        .spyOn(Transaction, "findOne")
        .mockReturnValue(createFindOneQuery(null));

      await expect(
        getTransactionByCodeForContext({
          companyId: ids.companyId,
          userId: ids.userId,
          role: "partner",
          transactionCode: "AKR-000002",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorCode: "TRANSACTION_NOT_FOUND",
      });

      expect(findOne).toHaveBeenCalledWith({
        transactionCode: "AKR-000002",
        company: ids.companyId,
        createdBy: ids.userId,
      });
    });

    it("allows managers to read company transactions by code", async () => {
      const ids = createIds();
      const transaction = createTransaction(ids);
      const findOne = jest
        .spyOn(Transaction, "findOne")
        .mockReturnValue(createFindOneQuery(transaction));

      const result = await getTransactionByCodeForContext({
        companyId: ids.companyId,
        userId: ids.userId,
        role: "manager",
        transactionCode: "AKR-000001",
      });

      expect(result).toBe(transaction);
      expect(findOne).toHaveBeenCalledWith({
        transactionCode: "AKR-000001",
        company: ids.companyId,
      });
    });

    it("rejects trial balance reads for partners", async () => {
      const ids = createIds();
      const aggregate = jest.spyOn(LedgerEntry, "aggregate");

      await expect(
        getTrialBalanceForCompany({
          companyId: ids.companyId,
          role: "partner",
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: "TRIAL_BALANCE_MANAGER_REQUIRED",
      });

      expect(aggregate).not.toHaveBeenCalled();
    });

    it("allows managers to read trial balance", async () => {
      const ids = createIds();
      jest.spyOn(LedgerEntry, "aggregate").mockResolvedValue([
        {
          _id: { currency: "FCFA", accountCode: "1000" },
          totalDebit: 100,
          totalCredit: 100,
        },
      ]);

      const result = await getTrialBalanceForCompany({
        companyId: ids.companyId,
        role: "manager",
      });

      expect(result).toEqual({
        FCFA: {
          1000: 0,
        },
      });
    });
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

  describe("createCollectionTransactionService", () => {
    it("creates a collection transaction, completed deposit operation, ledger refs, and one balance credit", async () => {
      const session = mockMongooseSession();
      const ids = createIds();
      const membership = createMembership(ids, {
        balance: 100000,
        currency: "GNF",
      });
      const createdTransaction = createTransaction(ids, {
        inputAmount: 2000000,
        inputCurrency: "GNF",
        partnerAmount: 2000000,
        partnerCurrency: "GNF",
        companyAmount: 117647,
        companyCurrency: "FCFA",
        sourceType: "correspondent_collection",
      });
      const accountOperation = createAccountOperation(ids, {
        _id: ids.operationId,
        amount: 2000000,
        currency: "GNF",
        previousBalance: 100000,
        currentBalance: 2100000,
      });
      jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(membership));
      jest
        .spyOn(AccountOperation, "findOne")
        .mockReturnValue(createSessionLeanQuery(null));
      jest.spyOn(Company, "findById").mockReturnValue(
        createSessionQuery({
          _id: ids.companyId,
          baseCurrency: "FCFA",
          code: "AKR",
        }),
      );
      jest
        .spyOn(CompanyExchangeRate, "findOne")
        .mockReturnValue(createSessionQuery({ rate: 85000 }));
      jest.spyOn(Transaction, "create").mockResolvedValue([createdTransaction]);
      jest
        .spyOn(AccountOperation, "create")
        .mockResolvedValue([accountOperation]);
      const ledgerInsert = jest
        .spyOn(LedgerEntry, "insertMany")
        .mockResolvedValue([{ _id: ids.debitLedgerId }, { _id: ids.creditLedgerId }]);
      const membershipCredit = jest
        .spyOn(CompanyMembership, "updateOne")
        .mockResolvedValue({ modifiedCount: 1 });
      const companyUpdate = jest.spyOn(Company, "updateOne");

      const result = await createCollectionTransactionService({
        companyId: ids.companyId,
        membershipId: ids.membershipId,
        userId: ids.userId,
        payload: collectionPayload(),
      });

      expect(result).toEqual({
        transaction: createdTransaction,
        accountOperation,
      });
      expect(Transaction.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            company: ids.companyId,
            membership: ids.membershipId,
            inputAmount: 2000000,
            inputCurrency: "GNF",
            partnerAmount: 2000000,
            partnerCurrency: "GNF",
            companyAmount: 117647,
            companyCurrency: "FCFA",
            exchangeRate: 85000,
            beneficiaryName: "Kadidia",
            idempotencyKey: "collection-1",
            createdBy: ids.userId,
            sourceType: "correspondent_collection",
          }),
        ],
        { session },
      );
      expect(AccountOperation.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            company: ids.companyId,
            targetMembership: ids.membershipId,
            createdByMembership: ids.membershipId,
            createdBy: ids.userId,
            linkedTransaction: createdTransaction._id,
            type: "deposit",
            status: "completed",
            amount: 2000000,
            currency: "GNF",
            previousBalance: 100000,
            currentBalance: 2100000,
            idempotencyKey: "collection-1",
            idempotencyPayload: {
              beneficiaryName: "Kadidia",
              collectedAmount: 2000000,
              collectedCurrency: "GNF",
              description: "Bamako payout",
            },
          }),
        ],
        { session },
      );
      expect(membershipCredit).toHaveBeenCalledWith(
        { _id: ids.membershipId, company: ids.companyId },
        { $inc: { balance: 2000000 } },
        { session },
      );
      expect(ledgerInsert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
            accountOperation: ids.operationId,
            currency: "GNF",
            debit: 2000000,
            credit: 0,
          }),
          expect.objectContaining({
            accountCode: ACCOUNTS.PARTNER_BALANCE,
            accountOperation: ids.operationId,
            currency: "GNF",
            debit: 0,
            credit: 2000000,
          }),
        ],
        { session },
      );
      expect(accountOperation.ledgerEntries).toEqual([
        ids.debitLedgerId,
        ids.creditLedgerId,
      ]);
      expect(accountOperation.save).toHaveBeenCalledWith({ session });
      expect(companyUpdate).not.toHaveBeenCalled();
    });

    it("returns an existing collection transaction for the same normalized idempotency payload", async () => {
      mockMongooseSession();
      const ids = createIds();
      const existingTransaction = createTransaction(ids, {
        sourceType: "correspondent_collection",
      });
      const existingOperation = createAccountOperation(ids, {
        idempotencyPayload: {
          beneficiaryName: "Kadidia",
          collectedAmount: 2000000,
          collectedCurrency: "GNF",
          description: "Bamako payout",
        },
        linkedTransaction: existingTransaction._id,
      });
      jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(createMembership(ids, { currency: "GNF" })));
      jest
        .spyOn(AccountOperation, "findOne")
        .mockReturnValue(createSessionLeanQuery(existingOperation));
      jest
        .spyOn(Transaction, "findById")
        .mockReturnValue(createSessionQuery(existingTransaction));
      const transactionCreate = jest.spyOn(Transaction, "create");
      const membershipUpdate = jest.spyOn(CompanyMembership, "updateOne");
      const ledgerInsert = jest.spyOn(LedgerEntry, "insertMany");

      const result = await createCollectionTransactionService({
        companyId: ids.companyId,
        membershipId: ids.membershipId,
        userId: ids.userId,
        payload: {
          collectedAmount: "2000000",
          collectedCurrency: "gnf",
          beneficiaryName: " Kadidia ",
          description: " Bamako payout ",
          transactionPin: "123456",
          clientOnly: true,
          idempotencyKey: "collection-1",
        },
      });

      expect(result).toEqual({
        transaction: existingTransaction,
        accountOperation: existingOperation,
      });
      expect(transactionCreate).not.toHaveBeenCalled();
      expect(membershipUpdate).not.toHaveBeenCalled();
      expect(ledgerInsert).not.toHaveBeenCalled();
    });

    it("rejects collection idempotency retries with changed normalized payload", async () => {
      mockMongooseSession();
      const ids = createIds();
      jest
        .spyOn(CompanyMembership, "findOne")
        .mockReturnValue(createSessionQuery(createMembership(ids, { currency: "GNF" })));
      jest.spyOn(AccountOperation, "findOne").mockReturnValue(
        createSessionLeanQuery(
          createAccountOperation(ids, {
            idempotencyPayload: {
              beneficiaryName: "Someone Else",
              collectedAmount: 2000000,
              collectedCurrency: "GNF",
              description: "Bamako payout",
            },
          }),
        ),
      );

      await expect(
        createCollectionTransactionService({
          companyId: ids.companyId,
          membershipId: ids.membershipId,
          userId: ids.userId,
          payload: collectionPayload(),
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: "IDEMPOTENCY_KEY_CONFLICT",
      });
    });
  });

  describe("payTransactionService", () => {
    it("returns a receipt when completing a pending transaction", async () => {
      mockMongooseSession();
      const ids = createIds();
      const transaction = createTransaction(ids);
      transaction.save = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(CompanyMembership, "findOne").mockReturnValue(
        createSessionQuery({
          _id: ids.membershipId,
          user: ids.userId,
          company: ids.companyId,
          role: "manager",
          status: "active",
        }),
      );
      jest
        .spyOn(Transaction, "findOneAndUpdate")
        .mockResolvedValue(transaction);
      jest.spyOn(LedgerEntry, "insertMany").mockResolvedValue([]);
      jest
        .spyOn(Company, "updateOne")
        .mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(Receipt, "findOne").mockReturnValue(createSessionQuery(null));
      jest.spyOn(Company, "findById").mockReturnValue(
        createSessionQuery({
          _id: ids.companyId,
          name: "Akera Gold",
          receiptPrefix: "RCPT",
        }),
      );
      jest.spyOn(CompanyBranding, "findOneAndUpdate").mockResolvedValue({
        receiptPrefix: "RCPT",
        receiptCounter: 1,
        primaryColor: "#1A73E8",
        footerText: "Generated securely by Akera system",
      });
      jest.spyOn(Receipt, "create").mockImplementation(async ([data]) => [
        {
          _id: new mongoose.Types.ObjectId(),
          ...data,
        },
      ]);

      const result = await payTransactionService({
        companyId: ids.companyId,
        transactionCode: "AKR-000001",
        managerId: ids.userId,
      });

      expect(result.transaction).toBe(transaction);
      expect(result.receipt).toEqual(
        expect.objectContaining({
          transaction: transaction._id,
          receiptNumber: `RCPT-${ids.companyId.toString().slice(-6).toUpperCase()}-000001`,
        }),
      );
    });

    it("does not change membership balance when paying a collection-backed transaction", async () => {
      mockMongooseSession();
      const ids = createIds();
      const transaction = createTransaction(ids, {
        sourceType: "correspondent_collection",
      });
      transaction.save = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(CompanyMembership, "findOne").mockReturnValue(
        createSessionQuery({
          _id: ids.membershipId,
          user: ids.userId,
          company: ids.companyId,
          role: "manager",
          status: "active",
        }),
      );
      jest
        .spyOn(Transaction, "findOneAndUpdate")
        .mockResolvedValue(transaction);
      jest.spyOn(LedgerEntry, "insertMany").mockResolvedValue([]);
      jest
        .spyOn(Company, "updateOne")
        .mockResolvedValue({ modifiedCount: 1 });
      jest.spyOn(Receipt, "findOne").mockReturnValue(createSessionQuery(null));
      jest.spyOn(Company, "findById").mockReturnValue(
        createSessionQuery({
          _id: ids.companyId,
          name: "Akera Gold",
          receiptPrefix: "RCPT",
        }),
      );
      jest.spyOn(CompanyBranding, "findOneAndUpdate").mockResolvedValue({
        receiptPrefix: "RCPT",
        receiptCounter: 1,
        primaryColor: "#1A73E8",
        footerText: "Generated securely by Akera system",
      });
      jest.spyOn(Receipt, "create").mockImplementation(async ([data]) => [
        {
          _id: new mongoose.Types.ObjectId(),
          ...data,
        },
      ]);
      const membershipUpdate = jest.spyOn(CompanyMembership, "updateOne");

      await payTransactionService({
        companyId: ids.companyId,
        transactionCode: "AKR-000001",
        managerId: ids.userId,
      });

      expect(membershipUpdate).not.toHaveBeenCalled();
    });
  });

  describe("collection transaction cancel/reverse guards", () => {
    it("blocks canceling collection-backed transactions", async () => {
      mockMongooseSession();
      const ids = createIds();
      jest.spyOn(CompanyMembership, "findOne").mockReturnValue(
        createSessionQuery({
          _id: ids.membershipId,
          user: ids.userId,
          company: ids.companyId,
          role: "manager",
          status: "active",
        }),
      );
      jest.spyOn(Transaction, "findOneAndUpdate").mockResolvedValue(
          createTransaction(ids, {
            sourceType: "correspondent_collection",
          }),
      );
      const membershipUpdate = jest.spyOn(CompanyMembership, "updateOne");

      await expect(
        cancelPendingTransactionService({
          companyId: ids.companyId,
          transactionCode: "AKR-000001",
          managerId: ids.userId,
          reason: "No longer needed",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "COLLECTION_TRANSACTION_CANCEL_UNSUPPORTED",
      });
      expect(membershipUpdate).not.toHaveBeenCalled();
    });

    it("blocks reversing collection-backed transactions", async () => {
      mockMongooseSession();
      const ids = createIds();
      jest.spyOn(CompanyMembership, "findOne").mockReturnValue(
        createSessionQuery({
          _id: ids.membershipId,
          user: ids.userId,
          company: ids.companyId,
          role: "manager",
          status: "active",
        }),
      );
      jest.spyOn(Transaction, "findOneAndUpdate").mockResolvedValue(
          createTransaction(ids, {
            sourceType: "correspondent_collection",
          }),
      );
      const membershipUpdate = jest.spyOn(CompanyMembership, "updateOne");

      await expect(
        reverseCompletedTransactionService({
          companyId: ids.companyId,
          transactionCode: "AKR-000001",
          managerId: ids.userId,
          reason: "Correction",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "COLLECTION_TRANSACTION_REVERSE_UNSUPPORTED",
      });
      expect(membershipUpdate).not.toHaveBeenCalled();
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

function createSessionLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    session: jest.fn().mockReturnThis(),
  };
}

function createFindOneQuery(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createFindManyQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    creditLedgerId: new mongoose.Types.ObjectId(),
    debitLedgerId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    membershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
  };
}

function createMembership({ companyId, membershipId, userId }, override = {}) {
  return {
    _id: membershipId,
    user: userId,
    company: companyId,
    role: "partner",
    status: "active",
    balance: 5000,
    currency: "FCFA",
    ...override,
  };
}

function createTransaction({
  companyId,
  membershipId,
  userId,
}, override = {}) {
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
    ...override,
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

function createAccountOperation(
  { companyId, membershipId, operationId, userId },
  override = {},
) {
  return {
    _id: operationId,
    company: companyId,
    targetMembership: membershipId,
    createdByMembership: membershipId,
    createdBy: userId,
    linkedTransaction: override.linkedTransaction ?? new mongoose.Types.ObjectId(),
    type: "deposit",
    status: "completed",
    amount: 2000000,
    currency: "GNF",
    previousBalance: 100000,
    currentBalance: 2100000,
    operationCode: "AOP-260619-ABCD",
    idempotencyKey: "collection-1",
    idempotencyPayload: {
      beneficiaryName: "Kadidia",
      collectedAmount: 2000000,
      collectedCurrency: "GNF",
      description: "Bamako payout",
    },
    ledgerEntries: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function collectionPayload(override = {}) {
  return {
    collectedAmount: "2000000",
    collectedCurrency: "gnf",
    beneficiaryName: " Kadidia ",
    description: " Bamako payout ",
    idempotencyKey: "collection-1",
    ...override,
  };
}
