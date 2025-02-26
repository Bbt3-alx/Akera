// Mongoose Transaction options
export const transactionOptions = {
  maxCommitTimeMS: 5000,
  readPreference: "primary",
  readConcern: { level: "local" },
  writeConcern: { w: "majority" },
};
