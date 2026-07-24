import crypto from "node:crypto";
import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { ACCOUNTS } from "../../constants/accounts.js";
import AccountOperation from "../../models/AccountOperation.js";
import Company from "../../models/Company.js";
import CompanyExchangeRate from "../../models/CompanyExchangeRate.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import CorrespondentCollection from "../../models/CorrespondentCollection.js";
import LedgerEntry from "../../models/LedgerEntry.js";
import {
  cancelCorrespondentCollection,
  cancelCorrespondentCollectionById,
  confirmCorrespondentCollection,
  confirmCorrespondentCollectionById,
  createCorrespondentCollection,
  getCorrespondentCollectionByCode,
  listActiveCorrespondents,
  listCorrespondentCollections,
} from "../../services/correspondentCollection.service.js";

describe("correspondent collection service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("manager creates a pending collection and immediately credits held balance", async () => {
    mockMongooseSession();
    const ids = createIds();
    const membership = createMembership(ids, { role: "partner" });
    const collection = createCollection(ids, {
      save: jest.fn().mockResolvedValue(undefined),
    });
    const operation = createAccountOperation(ids, {
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    const membershipFind = jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(membership));
    const collectionCreate = jest
      .spyOn(CorrespondentCollection, "create")
      .mockResolvedValue([collection]);
    const membershipUpdate = jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue({
        _id: ids.correspondentMembershipId,
        balance: 125000,
      });
    const operationCreate = jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([operation]);
    const companyUpdate = jest.spyOn(Company, "updateOne");
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);

    const result = await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: collectionPayload(ids),
    });

    expect(result).toBe(collection);
    expect(membershipFind).toHaveBeenCalledWith({
      _id: ids.correspondentMembershipId,
      company: ids.companyId,
      status: "active",
      role: "partner",
      currency: "FCFA",
    });
    expect(collectionCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          correspondentMembership: ids.correspondentMembershipId,
          createdByMembership: ids.managerMembershipId,
          createdBy: ids.managerId,
          transactionCode: expect.stringMatching(/^TX-\d{8}$/),
          collectionCode: undefined,
          referenceCode: undefined,
          amount: 25000,
          beneficiaryName: "Client Bamako",
          beneficiaryPhone: "+22370000000",
          currency: "FCFA",
          payoutAmount: 20000000,
          payoutCurrency: "FCFA",
          status: "pending",
          customerName: "Client Bamako",
          customerPhone: "+22370000000",
          note: "Market collection",
          idempotencyKey: "collection-create-1",
          idempotencyPayload: {
            amount: 25000,
            beneficiaryName: "Client Bamako",
            beneficiaryPhone: "+22370000000",
            correspondentMembershipId: ids.correspondentMembershipId.toString(),
            currency: "FCFA",
            note: "Market collection",
            payoutAmount: 20000000,
            payoutCurrency: "FCFA",
          },
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(membershipUpdate).toHaveBeenCalledWith(
      {
        _id: ids.correspondentMembershipId,
        company: ids.companyId,
        role: "partner",
        status: "active",
        currency: "FCFA",
      },
      { $inc: { balance: 25000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(operationCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          company: ids.companyId,
          targetMembership: ids.correspondentMembershipId,
          createdByMembership: ids.managerMembershipId,
          createdBy: ids.managerId,
          linkedCorrespondentCollection: ids.collectionId,
          workflow: "correspondent_collection",
          type: "deposit",
          status: "completed",
          amount: 25000,
          currency: "FCFA",
          previousBalance: 100000,
          currentBalance: 125000,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          debit: 25000,
          credit: 0,
          currency: "FCFA",
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          debit: 0,
          credit: 25000,
          currency: "FCFA",
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(operation.ledgerEntries).toEqual([
      ids.ledgerDebitId,
      ids.ledgerCreditId,
    ]);
    expect(operation.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(collection.accountOperation).toBe(ids.operationId);
    expect(collection.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("retries transaction code generation after a duplicate collision", async () => {
    mockMongooseSession();
    const ids = createIds();
    const collection = createCollection(ids, {
      transactionCode: "TX-22222222",
    });
    jest.spyOn(crypto, "randomInt")
      .mockReturnValueOnce(11111111)
      .mockReturnValueOnce(22222222);
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(createMembership(ids)));
    const collectionCreate = jest
      .spyOn(CorrespondentCollection, "create")
      .mockRejectedValueOnce({
        code: 11000,
        keyPattern: { transactionCode: 1 },
      })
      .mockResolvedValueOnce([collection]);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue({
      _id: ids.correspondentMembershipId,
      balance: 125000,
    });
    jest.spyOn(AccountOperation, "create").mockResolvedValue([
      createAccountOperation(ids, {
        save: jest.fn().mockResolvedValue(undefined),
      }),
    ]);
    jest.spyOn(LedgerEntry, "insertMany").mockResolvedValue([
      { _id: ids.ledgerDebitId },
      { _id: ids.ledgerCreditId },
    ]);

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids),
      }),
    ).resolves.toBe(collection);

    expect(collectionCreate).toHaveBeenCalledTimes(2);
    expect(collectionCreate.mock.calls[0][0][0].transactionCode).toBe(
      "TX-11111111",
    );
    expect(collectionCreate.mock.calls[1][0][0].transactionCode).toBe(
      "TX-22222222",
    );
  });

  it("manager creates a pending GNF collection with rate snapshot fields", async () => {
    mockMongooseSession();
    const ids = createIds();
    const membership = createMembership(ids, { currency: "GNF" });
    const collection = createCollection(ids, { currency: "GNF" });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(membership));
    const collectionCreate = jest
      .spyOn(CorrespondentCollection, "create")
      .mockResolvedValue([collection]);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue({
      _id: ids.correspondentMembershipId,
      balance: 426000000,
    });
    jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([createAccountOperation(ids, {
        amount: 326000000,
        currency: "GNF",
        currentBalance: 426000000,
        previousBalance: 100000000,
        save: jest.fn().mockResolvedValue(undefined),
      })]);
    jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);

    const result = await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: collectionPayload(ids, {
        amount: 326000000,
        currency: "gnf",
        rateValue: 82000,
        rateBaseAmount: 5000,
        rateQuoteCurrency: "GNF",
        rateBaseCurrency: "FCFA",
        counterAmount: 20000000,
        counterCurrency: "FCFA",
        rateNote: "Kalil sold GNF to Abdoulaye",
      }),
    });

    expect(result).toBe(collection);
    expect(CompanyMembership.findOne).toHaveBeenCalledWith({
      _id: ids.correspondentMembershipId,
      company: ids.companyId,
      status: "active",
      role: "partner",
      currency: "GNF",
    });
    expect(collectionCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          amount: 326000000,
          currency: "GNF",
          payoutAmount: 20000000,
          payoutCurrency: "FCFA",
          rateValue: 82000,
          rateBaseAmount: 5000,
          rateQuoteCurrency: "GNF",
          rateBaseCurrency: "FCFA",
          counterAmount: 20000000,
          counterCurrency: "FCFA",
          rateNote: "Kalil sold GNF to Abdoulaye",
          idempotencyPayload: expect.objectContaining({
            amount: 326000000,
            currency: "GNF",
            payoutAmount: 20000000,
            payoutCurrency: "FCFA",
            rateValue: 82000,
            rateBaseAmount: 5000,
            rateQuoteCurrency: "GNF",
            rateBaseCurrency: "FCFA",
            counterAmount: 20000000,
            counterCurrency: "FCFA",
            rateNote: "Kalil sold GNF to Abdoulaye",
          }),
        }),
      ],
      { session: expect.any(Object) },
    );
  });

  it("Kalil creates a 328,000,000 GNF collection and balance becomes 328,000,000 immediately", async () => {
    mockMongooseSession();
    const ids = createIds();
    const membership = createMembership(ids, { balance: 0, currency: "GNF" });
    const collection = createCollection(ids, {
      amount: 328000000,
      beneficiaryName: "Kadidia",
      beneficiaryPhone: "+22371000000",
      currency: "GNF",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      rateValue: 82000,
      rateBaseAmount: 5000,
      rateQuoteCurrency: "GNF",
      rateBaseCurrency: "FCFA",
      save: jest.fn().mockResolvedValue(undefined),
    });
    const operation = createAccountOperation(ids, {
      amount: 328000000,
      currency: "GNF",
      currentBalance: 328000000,
      previousBalance: 0,
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .spyOn(CompanyExchangeRate, "findOne")
      .mockReturnValue(createLeanQuery(createExchangeRate(ids, { rate: 82000 })));
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    const membershipFind = jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(membership));
    const collectionCreate = jest
      .spyOn(CorrespondentCollection, "create")
      .mockResolvedValue([collection]);
    const membershipUpdate = jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue({
        _id: ids.correspondentMembershipId,
        balance: 328000000,
      });
    const operationCreate = jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([operation]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      userId: ids.partnerUserId,
      role: "partner",
      payload: collectionPayload(ids, {
        amount: 328000000,
        beneficiaryName: " Kadidia ",
        beneficiaryPhone: " +22371000000 ",
        currency: "gnf",
        payoutAmount: undefined,
        payoutCurrency: undefined,
      }),
    });

    expect(result).toBe(collection);
    expect(membershipFind).toHaveBeenCalledWith({
      _id: ids.correspondentMembershipId,
      company: ids.companyId,
      status: "active",
      role: "partner",
      currency: "GNF",
    });
    expect(collectionCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          correspondentMembership: ids.correspondentMembershipId,
          createdByMembership: ids.correspondentMembershipId,
          createdBy: ids.partnerUserId,
          amount: 328000000,
          beneficiaryName: "Kadidia",
          beneficiaryPhone: "+22371000000",
          currency: "GNF",
          payoutAmount: 20000000,
          payoutCurrency: "FCFA",
          rateValue: 82000,
          rateBaseAmount: 5000,
          rateQuoteCurrency: "GNF",
          rateBaseCurrency: "FCFA",
          status: "pending",
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(membershipUpdate).toHaveBeenCalledWith(
      {
        _id: ids.correspondentMembershipId,
        company: ids.companyId,
        role: "partner",
        status: "active",
        currency: "GNF",
      },
      { $inc: { balance: 328000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(operationCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          linkedCorrespondentCollection: ids.collectionId,
          workflow: "correspondent_collection",
          type: "deposit",
          status: "completed",
          amount: 328000000,
          currency: "GNF",
          previousBalance: 0,
          currentBalance: 328000000,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          debit: 328000000,
          credit: 0,
          currency: "GNF",
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          debit: 0,
          credit: 328000000,
          currency: "GNF",
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(collection.accountOperation).toBe(ids.operationId);
    expect(collection.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("partner-created GNF collections compute floor payout and store the current rate snapshot", async () => {
    mockMongooseSession();
    const ids = createIds();
    const membership = createMembership(ids, { balance: 0, currency: "GNF" });
    const collection = createCollection(ids, {
      amount: 328000001,
      beneficiaryName: "Kadidia",
      beneficiaryPhone: "+22371000000",
      currency: "GNF",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      rateValue: 82000,
      rateBaseAmount: 5000,
      rateQuoteCurrency: "GNF",
      rateBaseCurrency: "FCFA",
      save: jest.fn().mockResolvedValue(undefined),
    });
    const operation = createAccountOperation(ids, {
      amount: 328000001,
      currency: "GNF",
      currentBalance: 328000001,
      previousBalance: 0,
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .spyOn(CompanyExchangeRate, "findOne")
      .mockReturnValue(createLeanQuery(createExchangeRate(ids, { rate: 82000 })));
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(membership));
    const collectionCreate = jest
      .spyOn(CorrespondentCollection, "create")
      .mockResolvedValue([collection]);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue({
      _id: ids.correspondentMembershipId,
      balance: 328000001,
    });
    jest.spyOn(AccountOperation, "create").mockResolvedValue([operation]);
    jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);

    await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      userId: ids.partnerUserId,
      role: "partner",
      payload: collectionPayload(ids, {
        amount: 328000001,
        beneficiaryName: " Kadidia ",
        beneficiaryPhone: " +22371000000 ",
        currency: "gnf",
        payoutAmount: undefined,
        payoutCurrency: undefined,
      }),
    });

    expect(CompanyExchangeRate.findOne).toHaveBeenCalledWith({
      company: ids.companyId,
    });
    expect(collectionCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          amount: 328000001,
          currency: "GNF",
          payoutAmount: 20000000,
          payoutCurrency: "FCFA",
          rateValue: 82000,
          rateBaseAmount: 5000,
          rateQuoteCurrency: "GNF",
          rateBaseCurrency: "FCFA",
          idempotencyPayload: expect.objectContaining({
            amount: 328000001,
            currency: "GNF",
            payoutAmount: 20000000,
            payoutCurrency: "FCFA",
            rateValue: 82000,
            rateBaseAmount: 5000,
            rateQuoteCurrency: "GNF",
            rateBaseCurrency: "FCFA",
          }),
        }),
      ],
      { session: expect.any(Object) },
    );
  });

  it("blocks partner-created GNF collections when no current rate is configured", async () => {
    const ids = createIds();
    jest.spyOn(CompanyExchangeRate, "findOne").mockReturnValue(createLeanQuery(null));
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        userId: ids.partnerUserId,
        role: "partner",
        payload: collectionPayload(ids, {
          amount: 328000000,
          currency: "gnf",
          payoutAmount: undefined,
          payoutCurrency: undefined,
        }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "CORRESPONDENT_TRANSACTION_RATE_NOT_CONFIGURED",
    });
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("rejects client-supplied payout or rate fields for partner-created collections", async () => {
    const ids = createIds();
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        userId: ids.partnerUserId,
        role: "partner",
        payload: collectionPayload(ids, {
          amount: 328000000,
          currency: "gnf",
          payoutAmount: 20000000,
          payoutCurrency: undefined,
        }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "CORRESPONDENT_TRANSACTION_RATE_FIELDS_NOT_ALLOWED",
    });
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("partner-created company-currency collections compute account amount from FCFA input", async () => {
    mockMongooseSession();
    const ids = createIds();
    const membership = createMembership(ids, { balance: 0, currency: "GNF" });
    const collection = createCollection(ids, {
      amount: 328000000,
      currency: "GNF",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      inputAmount: 20000000,
      inputCurrency: "FCFA",
      inputSide: "company",
      conversionDirection: "FCFA_TO_GNF",
      referenceCode: null,
    });
    const operation = createAccountOperation(ids, {
      amount: 328000000,
      currency: "GNF",
      currentBalance: 328000000,
      previousBalance: 0,
      save: jest.fn().mockResolvedValue(undefined),
    });
    jest
      .spyOn(CompanyExchangeRate, "findOne")
      .mockReturnValue(createLeanQuery(createExchangeRate(ids, { rate: 82000 })));
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(membership));
    const collectionCreate = jest
      .spyOn(CorrespondentCollection, "create")
      .mockResolvedValue([collection]);
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue({
      _id: ids.correspondentMembershipId,
      balance: 328000000,
    });
    jest.spyOn(AccountOperation, "create").mockResolvedValue([operation]);
    jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);

    await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      userId: ids.partnerUserId,
      role: "partner",
      payload: collectionPayload(ids, {
        amount: undefined,
        currency: undefined,
        inputAmount: 20000000,
        inputCurrency: "fcfa",
        inputSide: "company",
        payoutAmount: undefined,
        payoutCurrency: undefined,
        referenceCode: "",
      }),
    });

    expect(collectionCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          collectionCode: undefined,
          referenceCode: undefined,
          transactionCode: expect.stringMatching(/^TX-\d{8}$/),
          amount: 328000000,
          currency: "GNF",
          payoutAmount: 20000000,
          payoutCurrency: "FCFA",
          inputAmount: 20000000,
          inputCurrency: "FCFA",
          inputSide: "company",
          conversionDirection: "FCFA_TO_GNF",
          idempotencyPayload: expect.objectContaining({
            amount: 328000000,
            currency: "GNF",
            payoutAmount: 20000000,
            payoutCurrency: "FCFA",
            inputAmount: 20000000,
            inputCurrency: "FCFA",
            inputSide: "company",
            conversionDirection: "FCFA_TO_GNF",
          }),
        }),
      ],
      { session: expect.any(Object) },
    );
  });

  it("rejects partner collection creation for another partner membership", async () => {
    const ids = createIds();
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        userId: ids.partnerUserId,
        role: "partner",
        payload: collectionPayload(ids, {
          correspondentMembershipId: ids.otherPartnerMembershipId.toString(),
        }),
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "CORRESPONDENT_COLLECTION_OWN_MEMBERSHIP_REQUIRED",
    });
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("rejects employee collection creation", async () => {
    const ids = createIds();
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.employeeMembershipId,
        userId: ids.employeeUserId,
        role: "employee",
        payload: collectionPayload(ids),
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "CORRESPONDENT_COLLECTION_PARTNER_OR_MANAGER_REQUIRED",
    });
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("lists active partner correspondents with balances for managers", async () => {
    const ids = createIds();
    const find = jest.spyOn(CompanyMembership, "find").mockReturnValue(
      createPopulateLeanQuery([
        createMembership(ids, {
          balance: 328000000,
          currency: "GNF",
          reservedBalance: 2000000,
          user: {
            _id: ids.partnerUserId,
            firstName: "Kalil",
            lastName: "Diallo",
            email: "kalil@example.com",
          },
        }),
      ]),
    );

    const correspondents = await listActiveCorrespondents({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      query: { search: "kalil" },
    });

    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      role: "partner",
      status: "active",
    });
    expect(correspondents).toHaveLength(1);
    expect(correspondents[0]).toEqual(
      expect.objectContaining({
        _id: ids.correspondentMembershipId,
        balance: 328000000,
        reservedBalance: 2000000,
        currency: "GNF",
      }),
    );
  });

  it("lists only the active partner's own correspondent summary for partners", async () => {
    const ids = createIds();
    const find = jest.spyOn(CompanyMembership, "find").mockReturnValue(
      createPopulateLeanQuery([createMembership(ids, { role: "partner" })]),
    );

    await listActiveCorrespondents({
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      role: "partner",
      query: {},
    });

    expect(find).toHaveBeenCalledWith({
      _id: ids.correspondentMembershipId,
      company: ids.companyId,
      role: "partner",
      status: "active",
    });
  });

  it("requires beneficiaryName for partner-created collections", async () => {
    const ids = createIds();
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        userId: ids.partnerUserId,
        role: "partner",
        payload: collectionPayload(ids, {
          beneficiaryName: undefined,
          customerName: undefined,
        }),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: "INVALID_BENEFICIARY_NAME",
    });
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["employee", { role: "employee", status: "active" }],
    ["inactive partner", { role: "partner", status: "suspended" }],
  ])("rejects collection creation for %s membership", async (_label, override) => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(null));

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids, override),
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "CORRESPONDENT_MEMBERSHIP_NOT_FOUND",
    });
  });

  it.each([
    [{ amount: 0 }, "INVALID_COLLECTION_AMOUNT"],
    [{ amount: 25000.5 }, "INVALID_COLLECTION_AMOUNT"],
    [{ amount: 326000000.5, currency: "GNF" }, "INVALID_COLLECTION_AMOUNT"],
    [{ currency: "USD" }, "INVALID_COLLECTION_CURRENCY"],
    [{ payoutAmount: 0 }, "INVALID_COLLECTION_PAYOUT_AMOUNT"],
    [{ payoutAmount: 20000000.5 }, "INVALID_COLLECTION_PAYOUT_AMOUNT"],
    [{ payoutCurrency: "USD" }, "INVALID_COLLECTION_PAYOUT_CURRENCY"],
  ])("validates collection amount and payout fields", async (override, errorCode) => {
    const ids = createIds();
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids, override),
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode,
    });
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("rejects collection creation when membership currency does not match", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(null));
    jest
      .spyOn(CompanyMembership, "findOne")
      .mockReturnValue(createSessionQuery(null));

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids, { currency: "GNF" }),
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "CORRESPONDENT_MEMBERSHIP_NOT_FOUND",
    });
    expect(CompanyMembership.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "GNF" }),
    );
  });

  it("returns the existing collection for matching create idempotency", async () => {
    mockMongooseSession();
    const ids = createIds();
    const existing = createCollection(ids, {
      idempotencyPayload: {
        amount: 25000,
        beneficiaryName: "Client Bamako",
        beneficiaryPhone: "+22370000000",
        correspondentMembershipId: ids.correspondentMembershipId.toString(),
        currency: "FCFA",
        note: "Market collection",
        payoutAmount: 20000000,
        payoutCurrency: "FCFA",
      },
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionLeanQuery(existing));
    const membershipFind = jest.spyOn(CompanyMembership, "findOne");
    const collectionCreate = jest.spyOn(CorrespondentCollection, "create");

    const result = await createCorrespondentCollection({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
      payload: collectionPayload(ids),
    });

    expect(result).toBe(existing);
    expect(membershipFind).not.toHaveBeenCalled();
    expect(collectionCreate).not.toHaveBeenCalled();
  });

  it("rejects reused create idempotency keys with different normalized payloads", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest.spyOn(CorrespondentCollection, "findOne").mockReturnValue(
      createSessionLeanQuery(
        createCollection(ids, {
          idempotencyPayload: {
            amount: 99999,
            correspondentMembershipId: ids.correspondentMembershipId.toString(),
            currency: "FCFA",
            customerName: "Different",
          },
        }),
      ),
    );

    await expect(
      createCorrespondentCollection({
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        userId: ids.managerId,
        role: "manager",
        payload: collectionPayload(ids),
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "IDEMPOTENCY_KEY_CONFLICT",
    });
  });

  it("lists all company collections for managers and only own collections for partners", async () => {
    const ids = createIds();
    const find = jest
      .spyOn(CorrespondentCollection, "find")
      .mockReturnValue(createFindManyQuery([]));
    jest.spyOn(CorrespondentCollection, "countDocuments").mockResolvedValue(0);

    await listCorrespondentCollections({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      query: { status: "pending" },
    });

    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      status: "pending",
    });

    await listCorrespondentCollections({
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      role: "partner",
      query: {},
    });

    expect(find).toHaveBeenLastCalledWith({
      company: ids.companyId,
      correspondentMembership: ids.correspondentMembershipId,
    });
  });

  it("lets managers filter one partner and search transaction code or beneficiary", async () => {
    const ids = createIds();
    const find = jest
      .spyOn(CorrespondentCollection, "find")
      .mockReturnValue(createFindManyQuery([]));
    jest.spyOn(CorrespondentCollection, "countDocuments").mockResolvedValue(0);

    await listCorrespondentCollections({
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      role: "manager",
      query: {
        correspondentMembershipId: ids.correspondentMembershipId.toString(),
        search: "TX-9921",
      },
    });

    expect(find).toHaveBeenCalledWith({
      company: ids.companyId,
      correspondentMembership: ids.correspondentMembershipId,
      $or: [
        { transactionCode: /TX-9921/i },
        { collectionCode: /TX-9921/i },
        { beneficiaryName: /TX-9921/i },
        { customerName: /TX-9921/i },
      ],
    });
  });

  it("prevents partners from seeing another partner collection", async () => {
    const ids = createIds();
    const findOne = jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createFindOneLeanQuery(null));

    await expect(
      getCorrespondentCollectionByCode({
        collectionCode: "TX-99210452",
        companyId: ids.companyId,
        membershipId: ids.otherPartnerMembershipId,
        role: "partner",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "CORRESPONDENT_COLLECTION_NOT_FOUND",
    });
    expect(findOne).toHaveBeenCalledWith({
      company: ids.companyId,
      $or: [
        { transactionCode: "TX-99210452" },
        { collectionCode: "TX-99210452" },
      ],
      correspondentMembership: ids.otherPartnerMembershipId,
    });
  });

  it("manager can get any collection by code", async () => {
    const ids = createIds();
    const collection = createCollection(ids);
    const findOne = jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createFindOneLeanQuery(collection));

    await expect(
      getCorrespondentCollectionByCode({
        collectionCode: "TX-99210452",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        role: "manager",
      }),
    ).resolves.toBe(collection);
    expect(findOne).toHaveBeenCalledWith({
      company: ids.companyId,
      $or: [
        { transactionCode: "TX-99210452" },
        { collectionCode: "TX-99210452" },
      ],
    });
  });

  it("reads legacy records by collection code during migration", async () => {
    const ids = createIds();
    const collection = createCollection(ids, {
      transactionCode: undefined,
    });
    const findOne = jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createFindOneLeanQuery(collection));

    await expect(
      getCorrespondentCollectionByCode({
        collectionCode: "CCL-260625-ABCD",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        role: "manager",
      }),
    ).resolves.toBe(collection);
    expect(findOne).toHaveBeenCalledWith({
      company: ids.companyId,
      $or: [
        { transactionCode: "CCL-260625-ABCD" },
        { collectionCode: "CCL-260625-ABCD" },
      ],
    });
  });

  it("Abdoulaye pays by code and balance is not credited a second time", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      currency: "GNF",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "pending",
    });
    const paid = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      currency: "GNF",
      paidAt: new Date("2026-06-27T10:00:00.000Z"),
      paidBy: ids.managerId,
      paidByMembership: ids.managerMembershipId,
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
      status: "paid",
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(paid);
    const membershipUpdate = jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue({ _id: ids.correspondentMembershipId, balance: 656000000 });
    const operationCreate = jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([createAccountOperation(ids)]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await confirmCorrespondentCollection({
      collectionCode: "CCL-260625-ABCD",
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
    });

    expect(result).toBe(paid);
    expect(CorrespondentCollection.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.collectionId,
        company: ids.companyId,
        status: "pending",
      },
      {
        $set: {
          status: "paid",
          paidBy: ids.managerId,
          paidByMembership: ids.managerMembershipId,
          paidAt: expect.any(Date),
        },
      },
      { new: true, session: expect.any(Object) },
    );
    expect(membershipUpdate).not.toHaveBeenCalled();
    expect(operationCreate).not.toHaveBeenCalled();
    expect(ledgerInsert).not.toHaveBeenCalled();
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("manager pays a code-less collection by id", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, {
      collectionCode: undefined,
      referenceCode: null,
      status: "pending",
    });
    const paid = createCollection(ids, {
      collectionCode: undefined,
      referenceCode: null,
      paidAt: new Date("2026-06-27T10:00:00.000Z"),
      paidBy: ids.managerId,
      paidByMembership: ids.managerMembershipId,
      status: "paid",
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(paid);

    const result = await confirmCorrespondentCollectionById({
      collectionId: ids.collectionId.toString(),
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
    });

    expect(result).toBe(paid);
    expect(CorrespondentCollection.findOne).toHaveBeenCalledWith({
      _id: ids.collectionId,
      company: ids.companyId,
    });
  });

  it("Kalil cancels own pending collection and balance returns to 0", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      correspondentMembership: ids.correspondentMembershipId,
      currency: "GNF",
      status: "pending",
    });
    const canceled = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      cancellationAccountOperation: ids.cancellationOperationId,
      cancelReason: "Customer reversed",
      correspondentMembership: ids.correspondentMembershipId,
      currency: "GNF",
      save: jest.fn().mockResolvedValue(undefined),
      status: "canceled",
    });
    const reversalOperation = createAccountOperation(ids, {
      _id: ids.cancellationOperationId,
      amount: 328000000,
      currency: "GNF",
      currentBalance: 0,
      previousBalance: 328000000,
      save: jest.fn().mockResolvedValue(undefined),
      type: "withdrawal",
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(canceled);
    const membershipUpdate = jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue({ _id: ids.correspondentMembershipId, balance: 0 });
    const operationCreate = jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([reversalOperation]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await cancelCorrespondentCollection({
      collectionCode: "CCL-260625-ABCD",
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      payload: { reason: "Customer reversed" },
      role: "partner",
      userId: ids.partnerUserId,
    });

    expect(result).toBe(canceled);
    expect(CorrespondentCollection.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.collectionId,
        company: ids.companyId,
        status: "pending",
      },
      {
        $set: {
          status: "canceled",
          canceledBy: ids.partnerUserId,
          canceledByMembership: ids.correspondentMembershipId,
          canceledAt: expect.any(Date),
          cancelReason: "Customer reversed",
        },
      },
      { new: true, session: expect.any(Object) },
    );
    expect(membershipUpdate).toHaveBeenCalledWith(
      {
        _id: ids.correspondentMembershipId,
        company: ids.companyId,
        role: "partner",
        status: "active",
        currency: "GNF",
        balance: { $gte: 328000000 },
        $expr: {
          $gte: [
            {
              $subtract: [
                "$balance",
                { $ifNull: ["$reservedBalance", 0] },
              ],
            },
            328000000,
          ],
        },
      },
      { $inc: { balance: -328000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(operationCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          linkedCorrespondentCollection: ids.collectionId,
          type: "withdrawal",
          status: "completed",
          amount: 328000000,
          currency: "GNF",
          previousBalance: 328000000,
          currentBalance: 0,
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          debit: 328000000,
          credit: 0,
          currency: "GNF",
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          debit: 0,
          credit: 328000000,
          currency: "GNF",
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(reversalOperation.ledgerEntries).toEqual([
      ids.ledgerDebitId,
      ids.ledgerCreditId,
    ]);
    expect(reversalOperation.save).toHaveBeenCalledWith({
      session: expect.any(Object),
    });
    expect(canceled.cancellationAccountOperation).toBe(
      ids.cancellationOperationId,
    );
    expect(canceled.save).toHaveBeenCalledWith({ session: expect.any(Object) });
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it("partner cancels a code-less own collection by id", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, {
      accountOperation: ids.operationId,
      collectionCode: undefined,
      correspondentMembership: ids.correspondentMembershipId,
      referenceCode: null,
      status: "pending",
    });
    const canceled = createCollection(ids, {
      cancellationAccountOperation: ids.cancellationOperationId,
      collectionCode: undefined,
      correspondentMembership: ids.correspondentMembershipId,
      referenceCode: null,
      save: jest.fn().mockResolvedValue(undefined),
      status: "canceled",
    });
    const reversalOperation = createAccountOperation(ids, {
      _id: ids.cancellationOperationId,
      currentBalance: 75000,
      previousBalance: 100000,
      save: jest.fn().mockResolvedValue(undefined),
      type: "withdrawal",
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(canceled);
    jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue({ _id: ids.correspondentMembershipId, balance: 75000 });
    jest.spyOn(AccountOperation, "create").mockResolvedValue([reversalOperation]);
    jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);

    const result = await cancelCorrespondentCollectionById({
      collectionId: ids.collectionId.toString(),
      companyId: ids.companyId,
      membershipId: ids.correspondentMembershipId,
      payload: {},
      role: "partner",
      userId: ids.partnerUserId,
    });

    expect(result).toBe(canceled);
    expect(CorrespondentCollection.findOne).toHaveBeenCalledWith({
      _id: ids.collectionId,
      company: ids.companyId,
    });
  });

  it("rejects partner cancellation for another partner collection", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(createCollection(ids, {
        correspondentMembership: ids.correspondentMembershipId,
        status: "pending",
      })));
    const update = jest.spyOn(CorrespondentCollection, "findOneAndUpdate");

    await expect(
      cancelCorrespondentCollection({
        collectionCode: "CCL-260625-ABCD",
        companyId: ids.companyId,
        membershipId: ids.otherPartnerMembershipId,
        payload: {},
        role: "partner",
        userId: ids.otherPartnerUserId,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "CORRESPONDENT_COLLECTION_ASSIGNED_PARTNER_REQUIRED",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("manager pay-by-code does not increase 328,000,000 GNF balance to 656,000,000", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      currency: "GNF",
      status: "pending",
    });
    const paid = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      currency: "GNF",
      paidBy: ids.managerId,
      paidByMembership: ids.managerMembershipId,
      paidAt: new Date("2026-06-27T10:00:00.000Z"),
      status: "paid",
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(paid);
    const membershipUpdate = jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue({ _id: ids.correspondentMembershipId, balance: 656000000 });
    const operationCreate = jest
      .spyOn(AccountOperation, "create")
      .mockResolvedValue([createAccountOperation(ids)]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);
    const companyUpdate = jest.spyOn(Company, "updateOne");

    const result = await confirmCorrespondentCollection({
      collectionCode: "CCL-260625-ABCD",
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      userId: ids.managerId,
      role: "manager",
    });

    expect(result).toBe(paid);
    expect(membershipUpdate).not.toHaveBeenCalled();
    expect(operationCreate).not.toHaveBeenCalled();
    expect(ledgerInsert).not.toHaveBeenCalled();
    expect(companyUpdate).not.toHaveBeenCalled();
  });

  it.each(["paid", "confirmed", "canceled"])(
    "rejects manager pay when collection is %s",
    async (status) => {
      mockMongooseSession();
      const ids = createIds();
      jest
        .spyOn(CorrespondentCollection, "findOne")
        .mockReturnValue(createSessionQuery(createCollection(ids, { status })));
      const operationCreate = jest.spyOn(AccountOperation, "create");

      await expect(
        confirmCorrespondentCollection({
          collectionCode: "CCL-260625-ABCD",
          companyId: ids.companyId,
          membershipId: ids.managerMembershipId,
          userId: ids.managerId,
          role: "manager",
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "CORRESPONDENT_COLLECTION_PAY_NOT_ALLOWED",
      });
      expect(operationCreate).not.toHaveBeenCalled();
    },
  );

  it("rejects non-manager payment by collection code", async () => {
    const ids = createIds();
    const findOne = jest.spyOn(CorrespondentCollection, "findOne");

    await expect(
      confirmCorrespondentCollection({
        collectionCode: "CCL-260625-ABCD",
        companyId: ids.companyId,
        membershipId: ids.correspondentMembershipId,
        role: "partner",
        userId: ids.partnerUserId,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errorCode: "CORRESPONDENT_COLLECTION_MANAGER_REQUIRED",
    });
    expect(findOne).not.toHaveBeenCalled();
  });

  it("manager cancels a pending collection with the same balance reversal", async () => {
    mockMongooseSession();
    const ids = createIds();
    const pending = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      currency: "GNF",
      status: "pending",
    });
    const canceled = createCollection(ids, {
      accountOperation: ids.operationId,
      amount: 328000000,
      cancellationAccountOperation: ids.cancellationOperationId,
      cancelReason: "Customer reversed",
      currency: "GNF",
      save: jest.fn().mockResolvedValue(undefined),
      status: "canceled",
    });
    const reversalOperation = createAccountOperation(ids, {
      _id: ids.cancellationOperationId,
      amount: 328000000,
      currency: "GNF",
      currentBalance: 0,
      previousBalance: 328000000,
      save: jest.fn().mockResolvedValue(undefined),
      type: "withdrawal",
    });
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(pending));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(canceled);
    const membershipUpdate = jest
      .spyOn(CompanyMembership, "findOneAndUpdate")
      .mockResolvedValue({ _id: ids.correspondentMembershipId, balance: 0 });
    jest.spyOn(AccountOperation, "create").mockResolvedValue([reversalOperation]);
    const ledgerInsert = jest
      .spyOn(LedgerEntry, "insertMany")
      .mockResolvedValue([{ _id: ids.ledgerDebitId }, { _id: ids.ledgerCreditId }]);

    const result = await cancelCorrespondentCollection({
      collectionCode: "CCL-260625-ABCD",
      companyId: ids.companyId,
      membershipId: ids.managerMembershipId,
      payload: { reason: "Customer reversed" },
      role: "manager",
      userId: ids.managerId,
    });

    expect(result).toBe(canceled);
    expect(CorrespondentCollection.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: ids.collectionId,
        company: ids.companyId,
        status: "pending",
      },
      {
        $set: {
          status: "canceled",
          canceledBy: ids.managerId,
          canceledByMembership: ids.managerMembershipId,
          canceledAt: expect.any(Date),
          cancelReason: "Customer reversed",
        },
      },
      { new: true, session: expect.any(Object) },
    );
    expect(membershipUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: ids.correspondentMembershipId,
        balance: { $gte: 328000000 },
        currency: "GNF",
      }),
      { $inc: { balance: -328000000 } },
      { new: true, session: expect.any(Object) },
    );
    expect(ledgerInsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          accountCode: ACCOUNTS.PARTNER_BALANCE,
          debit: 328000000,
          credit: 0,
        }),
        expect.objectContaining({
          accountCode: ACCOUNTS.CASH_HELD_BY_CORRESPONDENT,
          debit: 0,
          credit: 328000000,
        }),
      ],
      { session: expect.any(Object) },
    );
  });

  it.each(["paid", "confirmed"])(
    "rejects cancellation for %s collections",
    async (status) => {
      mockMongooseSession();
      const ids = createIds();
      jest
        .spyOn(CorrespondentCollection, "findOne")
        .mockReturnValue(createSessionQuery(createCollection(ids, { status })));

      await expect(
        cancelCorrespondentCollection({
          collectionCode: "CCL-260625-ABCD",
          companyId: ids.companyId,
          membershipId: ids.managerMembershipId,
          payload: {},
          role: "manager",
          userId: ids.managerId,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        errorCode: "CORRESPONDENT_COLLECTION_CANCEL_NOT_ALLOWED",
      });
    },
  );

  it("rejects cancellation when collection funds are no longer available to reverse", async () => {
    mockMongooseSession();
    const ids = createIds();
    jest
      .spyOn(CorrespondentCollection, "findOne")
      .mockReturnValue(createSessionQuery(createCollection(ids, {
        amount: 328000000,
        currency: "GNF",
        status: "pending",
      })));
    jest
      .spyOn(CorrespondentCollection, "findOneAndUpdate")
      .mockResolvedValue(createCollection(ids, {
        amount: 328000000,
        currency: "GNF",
        status: "canceled",
      }));
    jest.spyOn(CompanyMembership, "findOneAndUpdate").mockResolvedValue(null);
    const operationCreate = jest.spyOn(AccountOperation, "create");

    await expect(
      cancelCorrespondentCollection({
        collectionCode: "CCL-260625-ABCD",
        companyId: ids.companyId,
        membershipId: ids.managerMembershipId,
        payload: {},
        role: "manager",
        userId: ids.managerId,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "CORRESPONDENT_COLLECTION_REVERSAL_BALANCE_UNAVAILABLE",
    });
    expect(operationCreate).not.toHaveBeenCalled();
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

function createFindManyQuery(result) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createFindOneLeanQuery(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createLeanQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createPopulateLeanQuery(result) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
}

function createIds() {
  return {
    collectionId: new mongoose.Types.ObjectId(),
    cancellationOperationId: new mongoose.Types.ObjectId(),
    companyId: new mongoose.Types.ObjectId(),
    correspondentMembershipId: new mongoose.Types.ObjectId(),
    employeeMembershipId: new mongoose.Types.ObjectId(),
    employeeUserId: new mongoose.Types.ObjectId(),
    ledgerCreditId: new mongoose.Types.ObjectId(),
    ledgerDebitId: new mongoose.Types.ObjectId(),
    managerId: new mongoose.Types.ObjectId(),
    managerMembershipId: new mongoose.Types.ObjectId(),
    operationId: new mongoose.Types.ObjectId(),
    otherPartnerMembershipId: new mongoose.Types.ObjectId(),
    otherPartnerUserId: new mongoose.Types.ObjectId(),
    partnerUserId: new mongoose.Types.ObjectId(),
  };
}

function createMembership(
  { companyId, correspondentMembershipId, partnerUserId },
  override = {},
) {
  return {
    _id: correspondentMembershipId,
    company: companyId,
    user: partnerUserId,
    role: "partner",
    status: "active",
    currency: "FCFA",
    balance: 100000,
    ...override,
  };
}

function createCollection(
  {
    collectionId,
    companyId,
    correspondentMembershipId,
    managerId,
    managerMembershipId,
  },
  override = {},
) {
  return {
    _id: collectionId,
    company: companyId,
    correspondentMembership: correspondentMembershipId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    transactionCode: "TX-99210452",
    collectionCode: "CCL-260625-ABCD",
    amount: 25000,
    beneficiaryName: "Client Bamako",
    beneficiaryPhone: "+22370000000",
    currency: "FCFA",
    payoutAmount: 20000000,
    payoutCurrency: "FCFA",
    status: "pending",
    customerName: "Client Bamako",
    customerPhone: "+22370000000",
    note: "Market collection",
    idempotencyKey: "collection-create-1",
    idempotencyPayload: {
      amount: 25000,
      beneficiaryName: "Client Bamako",
      beneficiaryPhone: "+22370000000",
      correspondentMembershipId: correspondentMembershipId.toString(),
      currency: "FCFA",
      note: "Market collection",
      payoutAmount: 20000000,
      payoutCurrency: "FCFA",
    },
    save: jest.fn().mockResolvedValue(undefined),
    ...override,
  };
}

function createExchangeRate({ companyId, managerId }, override = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    company: companyId,
    rate: 82000,
    from: "FCFA",
    to: "GNF",
    setBy: managerId,
    createdAt: new Date("2026-06-27T10:00:00.000Z"),
    updatedAt: new Date("2026-06-27T10:00:00.000Z"),
    ...override,
  };
}

function createAccountOperation({ companyId, correspondentMembershipId, managerId, managerMembershipId, operationId }, override = {}) {
  return {
    _id: operationId,
    company: companyId,
    targetMembership: correspondentMembershipId,
    createdByMembership: managerMembershipId,
    createdBy: managerId,
    workflow: "correspondent_collection",
    type: "deposit",
    status: "completed",
    amount: 25000,
    currency: "FCFA",
    previousBalance: 100000,
    currentBalance: 125000,
    operationCode: "AOP-260625-ABCD",
    ledgerEntries: [],
    ...override,
  };
}

function collectionPayload({ correspondentMembershipId }, override = {}) {
  return {
    amount: 25000,
    beneficiaryName: " Client Bamako ",
    beneficiaryPhone: " +22370000000 ",
    currency: "fcfa",
    correspondentMembershipId: correspondentMembershipId.toString(),
    customerName: " Client Bamako ",
    customerPhone: " +22370000000 ",
    note: " Market collection ",
    payoutAmount: 20000000,
    payoutCurrency: "fcfa",
    idempotencyKey: "collection-create-1",
    transactionPin: "123456",
    ...override,
  };
}
