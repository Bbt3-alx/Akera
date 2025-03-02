import mongoose from "mongoose";

export const handleTransactionWithRetry = async (handler, retries = 3) => {
  return async (req, res, next) => {
    // let retryAttempts = 0;
    const executeTransaction = async (attempt) => {
      const session = await mongoose.startSession();

      try {
        session.startTransaction();
        const result = await handler(session, req, res);
        await session.commitTransaction();
        return result;
      } catch (error) {
        await session.abortTransaction();

        if (
          error instanceof mongoose.Error.TransactionError &&
          attempt < retries
        ) {
          const delay = Math.pow(2, attempt) * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return executeTransaction(attempt + 1);
        }

        throw error;
      } finally {
        session.endSession();
      }
    };

    try {
      await executeTransaction(0);
    } catch (error) {
      next(error);
    }
  };
};
