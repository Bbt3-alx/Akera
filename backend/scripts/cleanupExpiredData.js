import mongoose from "mongoose";
import { UsdCustomer, DollarExchange } from "../models/DollarExchange.js";
import { RETENTION_PERIODES } from "../config/retentionPolicy.js";
import { archiveToGlacier } from "../services/archiver.js";

export const hardDeleteExpiredRecords = async () => {
  const session = await mongoose.startSession();

  try {
    if (process.env.NODE_ENV !== "production") {
      throw new Error("Cleanup can only run in production!");
    }

    session.startTransaction();
    //Archive before deletion
    await archiveToGlacier(transactions);

    // delete expired usd transaction
    const transactionsThreshold = new Date(
      Date.now - RETENTION_PERIODES.USD_TRANSACTION
    );

    const transactions = await DollarExchange.find({
      deletedAt: { $lte: transactionsThreshold },
    });

    // Delete from MongoDB
    const deletedUsdTransaction = await DollarExchange.deleteMany({
      _id: { $in: transactions.map((t) => t._id) },
    }).session(session);

    // delete expire usd customer
    const customersThreshold = new Date(
      Date.now - RETENTION_PERIODES.DELETED_CUSTOMER
    );

    const customers = await UsdCustomer.find({
      deletedAt: { $lte: customersThreshold },
    });
    const deletedUsdCustomer = await UsdCustomer.deleteMany({
      _id: { $in: customers.map((c) => t._id) },
    }).session(session);

    await session.commitTransaction();
    console.log(
      `Hard deleted ${deletedUsdTransaction.deletedCount} transactions and ${deletedUsdCustomer.deletedCount} usd customers`
    );
  } catch (error) {
    await sendAlertEmail({
      subject: "Data Retention Cleanup Failed.",
      body: `Error: ${error.message}`,
    });
    await session.abortTransaction();
    console.error("Cleanup failed:", error);
  } finally {
    await session.endSession();
  }
};
