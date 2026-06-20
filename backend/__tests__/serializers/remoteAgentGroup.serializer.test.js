import { describe, expect, it } from "@jest/globals";

import { serializeRemoteAgentGroup } from "../../serializers/remoteAgentGroup.serializer.js";

describe("remote agent group serializer", () => {
  it("computes available balance and returns safe member fields", () => {
    const result = serializeRemoteAgentGroup({
      _id: "group-1",
      company: "company-1",
      name: "Agents Bamako",
      currency: "FCFA",
      balance: 100000,
      reservedBalance: 25000,
      status: "active",
      members: [
        {
          membership: {
            _id: "membership-1",
            user: {
              _id: "user-1",
              firstName: "Moussa",
              lastName: "Keita",
              email: "moussa@example.com",
              transactionPinHash: "secret-pin-hash",
            },
            balance: 50000,
            reservedBalance: 10000,
          },
          role: "agent",
          permissions: ["remote_payout:view", "remote_payout:pay"],
          status: "active",
          joinedAt: "2026-06-20T09:00:00.000Z",
          updatedAt: "2026-06-20T10:00:00.000Z",
          auditMetadata: { ipAddress: "127.0.0.1" },
        },
      ],
      idempotencyKey: "secret-idem",
      transactionPin: "123456",
      auditMetadata: { ipAddress: "127.0.0.1" },
      createdAt: "2026-06-20T08:00:00.000Z",
      updatedAt: "2026-06-20T11:00:00.000Z",
    });

    expect(result).toEqual({
      id: "group-1",
      company: "company-1",
      name: "Agents Bamako",
      currency: "FCFA",
      balance: 100000,
      reservedBalance: 25000,
      availableBalance: 75000,
      status: "active",
      members: [
        {
          membership: "membership-1",
          agentName: "Moussa Keita",
          agentEmail: "moussa@example.com",
          user: {
            id: "user-1",
            name: "Moussa Keita",
            email: "moussa@example.com",
          },
          role: "agent",
          permissions: ["remote_payout:view", "remote_payout:pay"],
          status: "active",
          joinedAt: "2026-06-20T09:00:00.000Z",
          updatedAt: "2026-06-20T10:00:00.000Z",
        },
      ],
      createdAt: "2026-06-20T08:00:00.000Z",
      updatedAt: "2026-06-20T11:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("secret-pin-hash");
    expect(JSON.stringify(result)).not.toContain("secret-idem");
    expect(JSON.stringify(result)).not.toContain("transactionPin");
    expect(JSON.stringify(result)).not.toContain("ipAddress");
    expect(JSON.stringify(result)).not.toContain("balance\":50000");
  });

  it("falls back to email for agentName and hides sensitive user fields", () => {
    const result = serializeRemoteAgentGroup({
      _id: "group-1",
      company: "company-1",
      name: "Agents Bamako",
      currency: "FCFA",
      members: [
        {
          membership: {
            _id: "membership-1",
            user: {
              _id: "user-1",
              email: "agent@example.com",
              password: "secret-password",
              transactionPinHash: "secret-pin-hash",
              resetPasswordToken: "secret-token",
            },
          },
          role: "agent",
          permissions: ["remote_payout:view"],
          status: "active",
        },
      ],
    });

    expect(result.members[0]).toEqual(expect.objectContaining({
      membership: "membership-1",
      agentName: "agent@example.com",
      agentEmail: "agent@example.com",
      user: {
        id: "user-1",
        name: "agent@example.com",
        email: "agent@example.com",
      },
    }));
    expect(JSON.stringify(result)).not.toContain("secret-password");
    expect(JSON.stringify(result)).not.toContain("secret-pin-hash");
    expect(JSON.stringify(result)).not.toContain("secret-token");
  });
});
