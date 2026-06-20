import { Schema, model } from "mongoose";

export const REMOTE_AGENT_GROUP_PERMISSIONS = [
  "remote_payout:view",
  "remote_payout:deposit",
  "remote_payout:pay",
  "remote_payout:manage_group",
];

const remoteAgentGroupMemberSchema = new Schema(
  {
    membership: {
      type: Schema.Types.ObjectId,
      ref: "CompanyMembership",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["agent", "supervisor"],
      default: "agent",
      required: true,
    },
    permissions: [
      {
        type: String,
        enum: REMOTE_AGENT_GROUP_PERMISSIONS,
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const remoteAgentGroupSchema = new Schema(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    currency: {
      type: String,
      enum: ["FCFA"],
      default: "FCFA",
      required: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    reservedBalance: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
      index: true,
    },
    members: {
      type: [remoteAgentGroupMemberSchema],
      default: [],
    },
  },
  { timestamps: true },
);

remoteAgentGroupSchema.index({
  company: 1,
  status: 1,
  name: 1,
});

remoteAgentGroupSchema.index(
  {
    company: 1,
    name: 1,
  },
  {
    unique: true,
  },
);

remoteAgentGroupSchema.index({
  company: 1,
  "members.membership": 1,
  status: 1,
});

const RemoteAgentGroup = model("RemoteAgentGroup", remoteAgentGroupSchema);

export default RemoteAgentGroup;
