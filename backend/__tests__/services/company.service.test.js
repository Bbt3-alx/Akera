import mongoose from "mongoose";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import Company from "../../models/Company.js";
import CompanyMembership from "../../models/CompanyMembership.js";
import { createCompanyForUser } from "../../services/company.service.js";

const TRANSFER_MODULES = [
  "transfers",
  "correspondent_collections",
  "account_operations",
  "company_cash",
  "exchange_rate",
];

const REMOTE_AGENT_PAYOUT_MODULES = [
  "transfers",
  "remote_agent_payout",
  "account_operations",
  "company_cash",
];

const BOTH_TRANSFER_WORKFLOW_MODULES = [
  "transfers",
  "correspondent_collections",
  "remote_agent_payout",
  "account_operations",
  "company_cash",
  "exchange_rate",
];

const GOLD_MODULES = [
  "gold_trading",
  "gold_buy_operations",
  "gold_sell_operations",
  "gold_shipping",
  "company_cash",
];

describe("company service module onboarding", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ["transfer", TRANSFER_MODULES],
    ["gold_trading", GOLD_MODULES],
    [
      "mixed",
      [
        "transfers",
        "correspondent_collections",
        "remote_agent_payout",
        "account_operations",
        "company_cash",
        "exchange_rate",
        "gold_trading",
        "gold_buy_operations",
        "gold_sell_operations",
        "gold_shipping",
      ],
    ],
  ])(
    "creates a %s company with derived enabled modules",
    async (businessType, expectedModules) => {
      mockMongooseSession();
      const ids = createIds();
      mockCompanyQueries({ ids });
      const companyCreate = jest
        .spyOn(Company, "create")
        .mockImplementation(async ([data]) => [
          createCompany({ ...ids, ...data }),
        ]);
      jest
        .spyOn(CompanyMembership, "create")
        .mockImplementation(async ([data]) => [
          createMembership({ ...ids, ...data }),
        ]);

      const result = await createCompanyForUser({
        userId: ids.userId,
        payload: createPayload({ businessType }),
      });

      expect(companyCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            businessType,
            enabledModules: expectedModules,
            transferWorkflows: expect.any(Array),
          }),
        ],
        { session: expect.any(Object) },
      );
      expect(result.company).toEqual(
        expect.objectContaining({
          businessType,
          enabledModules: expectedModules,
          transferWorkflows: expect.any(Array),
        }),
      );
    },
  );

  it.each([
    [["correspondent_collection"], TRANSFER_MODULES],
    [["remote_agent_payout"], REMOTE_AGENT_PAYOUT_MODULES],
    [
      ["correspondent_collection", "remote_agent_payout"],
      BOTH_TRANSFER_WORKFLOW_MODULES,
    ],
  ])(
    "creates a transfer company with %j workflow modules",
    async (transferWorkflows, expectedModules) => {
      mockMongooseSession();
      const ids = createIds();
      mockCompanyQueries({ ids });
      const companyCreate = jest
        .spyOn(Company, "create")
        .mockImplementation(async ([data]) => [
          createCompany({ ...ids, ...data }),
        ]);
      jest
        .spyOn(CompanyMembership, "create")
        .mockImplementation(async ([data]) => [
          createMembership({ ...ids, ...data }),
        ]);

      const result = await createCompanyForUser({
        userId: ids.userId,
        payload: createPayload({
          businessType: "transfer",
          transferWorkflows,
        }),
      });

      expect(companyCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            businessType: "transfer",
            enabledModules: expectedModules,
            transferWorkflows,
          }),
        ],
        { session: expect.any(Object) },
      );
      expect(result.company).toEqual(
        expect.objectContaining({
          businessType: "transfer",
          enabledModules: expectedModules,
          transferWorkflows,
        }),
      );
    },
  );

  it("keeps existing create-company behavior as transfer when businessType is omitted", async () => {
    mockMongooseSession();
    const ids = createIds();
    mockCompanyQueries({ ids });
    const companyCreate = jest
      .spyOn(Company, "create")
      .mockImplementation(async ([data]) => [
        createCompany({ ...ids, ...data }),
      ]);
    jest
      .spyOn(CompanyMembership, "create")
      .mockImplementation(async ([data]) => [
        createMembership({ ...ids, ...data }),
      ]);

    const result = await createCompanyForUser({
      userId: ids.userId,
      payload: createPayload(),
    });

    expect(companyCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          businessType: "transfer",
          enabledModules: TRANSFER_MODULES,
          transferWorkflows: ["correspondent_collection"],
        }),
      ],
      { session: expect.any(Object) },
    );
    expect(result.company).toEqual(
      expect.objectContaining({
        businessType: "transfer",
        enabledModules: TRANSFER_MODULES,
        transferWorkflows: ["correspondent_collection"],
      }),
    );
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

function mockCompanyQueries() {
  jest.spyOn(Company, "findOne").mockReturnValue(createFindOneQuery(null));
  jest.spyOn(Company, "exists").mockReturnValue(createSessionQuery(null));
}

function createFindOneQuery(result) {
  return {
    lean: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
  };
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

function createPayload(overrides = {}) {
  return {
    name: "Akera Trading",
    address: "Bamako",
    contact: "+22370000000",
    baseCurrency: "FCFA",
    ...overrides,
  };
}

function createCompany({
  companyId,
  name,
  code = "AKE",
  baseCurrency,
  businessType,
  enabledModules,
  transferWorkflows,
}) {
  return {
    _id: companyId,
    name,
    code,
    baseCurrency,
    businessType,
    enabledModules,
    transferWorkflows,
  };
}

function createMembership({
  membershipId,
  user,
  company,
  role,
  status,
  permissions,
}) {
  return {
    _id: membershipId,
    user,
    company,
    role,
    status,
    permissions,
  };
}
