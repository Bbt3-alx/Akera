import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import { isValidObjectId } from "mongoose";
import { ObjectId } from "mongodb";

// Make a new transaction
export const makeTransaction = async (req, res) => {
  const { amount, description, partnerId } = req.body;

  if (!amount || !description || !partnerId) {
    console.log("All fields are required.");
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  if (!isValidObjectId(partnerId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid partner ID format." });
  }
  // Check if the provided amount is a number and greater than 0.
  if (isNaN(amount) || amount < 1) {
    console.log("Amount must be a number greater than 0.");
    return res.status(403).json({
      success: false,
      message: "Amount must be a number and greater than 0.",
    });
  }

  try {
    const manager = await User.findById(req.user.id).populate("company");

    if (!manager) {
      return res.status(401).json({
        success: false,
        message: "You are not authorize to perform this operation.",
      });
    }

    if (!manager.company) {
      console.log("You don't have a company yet, create one first.");
      return res.status(404).json({
        success: false,
        message: "You don't have a company yet, create one first.",
      });
    }

    const partner = await Partner.findById(partnerId);

    if (!partner) {
      console.log("Partner not found.");
      return res
        .status(404)
        .json({ success: false, message: "Partner not found." });
    }

    // Verify if the partner has enought balance
    if (amount > partner.balance) {
      console.log("Partner has no suffficient balance !");
      return res.status(401).json({
        success: false,
        message: "Partner has no suffficient balance !",
      });
    }

    // Verify if the company has enougth cash for the transaction
    if (amount > manager.company.balance) {
      return res.status(401).json({
        success: false,
        message: "Your balance is insufficient for this transaction.",
      });
    }

    // Create the new transaction
    const newTransaction = new Transaction({
      amount,
      description,
      company: manager.company._id,
      partner: partnerId,
    });

    // Use a mongoDB transaction session to ensure the integrity
    const session = await Transaction.startSession();
    session.startTransaction();

    try {
      // Save the new transaction
      const savedTransaction = await newTransaction.save({ session });

      // Deduct the amount from the balance
      await Partner.findByIdAndUpdate(partnerId, {
        $inc: { balance: -amount },
      });

      // Add the transaction to the partner's transacions list
      partner.transactions.push(savedTransaction);
      await partner.save();

      // Update the company with the new transaction
      manager.company.transactions.push(savedTransaction);
      manager.company.balance -= amount;
      await manager.company.save({ session });

      // Make a transaction with the timestamp (in seconds)

      const objectId = new ObjectId(savedTransaction._id);
      const code = objectId.getTimestamp().getTime() / 1000; // Convert to seconds
      savedTransaction.code = code;
      await savedTransaction.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      res.status(201).json({ success: true, transaction: savedTransaction });
    } catch (error) {
      await session.abortTransaction();
      throw error; // Rethrow the error for handling in the outer catch
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.log("Error making tansaction:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Retrieve all the transaction belonging to a company
export const getTransactions = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to perform this operation.",
      });
    }
    const transactions = await Transaction.find({
      company: manager.company,
    });
    if (transactions.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "You don't have any transaction." });
    }

    res.status(200).json({ success: true, transactions: transactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Retrieve all 's transactions
export const getPartnerTransaction = async (req, res) => {
  const managerId = req.user.id;
  const partnerId = req.params.partnerId;

  try {
    const manager = await User.findById(managerId).populate("company");
    if (!manager) {
      return res.status(401).json({
        success: false,
        message: "You are not authorised to perform this operation.",
      });
    }

    if (!manager.company) {
      return res.status(404).json({
        success: false,
        message: "You don't have a company yet, create one first.",
      });
    }

    // Retrieve the transaction
    const transactions = await Transaction.find({
      partner: partnerId,
      company: manager.company,
    });

    if (transactions === 0) {
      return res.status(200).json({
        success: false,
        message: "There is no transactions for this partner.",
      });
    }

    res.status(200).json({ success: true, transactions: transactions });
  } catch (error) {
    return res.status(500).json({ success: true, message: error.message });
  }
};

// Get specific transaction by its ID
export const getTransaction = async (req, res) => {
  const transactionId = req.params.transactionId;
  try {
    const manager = await User.findById(req.user.id).populate("company");

    if (!manager || !manager.company) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Your are not authorized.",
      });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction record not found." });
    }

    res.status(200).json({ success: true, transaction: transaction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// Edit a transaction
export const editTransaction = async (req, res) => {
  const { description, amount } = req.body;
  const transactionId = req.params.transactionId;
  const partnerId = req.params.partnerId;

  try {
    const manager = await User.findById(req.user.id).populate("company");

    if (!manager || !manager.company) {
      return res.status(401).json({
        success: false,
        message: "Access denied. You are not authorized",
      });
    }

    // Check if valide amount
    if (isNaN(amount) || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid possitive integer.",
      });
    }

    // Check partner's balance
    const partner = await Partner.findById(partnerId);
    if (partner) {
      if (partner.balance < amount) {
        return res.status(401).json({
          success: false,
          message:
            "Partner balance is not sufficient to perform this operation.",
        });
      }
    }

    // Check company's balance
    if (manager.company.balance < amount) {
      return res.status(401).json({
        success: false,
        message: "Insufficient balance to perform this operation.",
      });
    }
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        description,
        amount,
        partnerId,
      },
      { new: true }
    );

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction record not found." });
    }

    // Update balances

    partner.balance -= amount;
    manager.company.balance -= amount;

    await partner.save();
    await manager.company.save();

    res.status(200).json({ success: true, updatedTransaction: transaction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a transaction
export const deleteTransaction = async (req, res) => {
  const transactionId = req.params.transactionId;
  const partnerId = req.params.partnerId;

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied, Unautorized" });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: transactionId,
      partner: partnerId,
      company: manager.company._id,
    });
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction record not found." });
    }

    // Update partner transaction list
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner not found." });
    }
    partner.transactions = partner.transactions.filter(
      (t) => t.toString() !== transactionId
    );

    // Update company transaction list
    manager.company.transactions = manager.company.transactions.filter(
      (t) => t.toString() !== transactionId
    );

    await partner.save();
    await manager.company.save();
    res.status(200).json({
      success: true,
      message: `Transaction with ID ${transactionId} deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
