import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";
import Company from "../models/Company.js";

export const partnerMakeTransaction = async (req, res) => {
  const { amount, description, company } = req.body;

  try {
    if (!amount || !description || !company) {
      console.log("All fields are required.");
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Check the provided amount is a number and greater than 0.
    if (isNaN(amount) || amount < 1) {
      console.log("Amount must be a number.");
      return res.status(403).json({
        success: false,
        message: "Amount must be a number and greater than 0.",
      });
    }

    const partnerId = req.params.partnerId; //await Partner.findById(req.user.id);
    const partner = await Partner.findById(partnerId);

    if (!partner) {
      console.log("Partner not found.");
      return res
        .status(404)
        .json({ success: false, message: "Partner not found." });
    }
    const companyId = await Company.findOne({ name: company });
    if (!companyId) {
      console.log("Company not found.");
      return res
        .status(404)
        .json({ success: false, message: "Company not found." });
    }

    if (!partner.companies.includes(companyId._id)) {
      console.log("This company is not in your list of company", company);
      return res.status(404).json({
        success: false,
        message: "This company is not in your list of company",
      });
    }

    // Verify the company balance
    if (amount > partner.balance) {
      console.log("Insufficient balance !");
      return res.status(401).json({
        success: false,
        message: "You don't have anought money for this operation.",
      });
    }

    // Create the new transaction
    const newTransaction = new Transaction({
      amount,
      description,
      company: companyId,
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

      // Commit the transaction
      await session.commitTransaction();

      res.status(201).json({ success: true, transaction: savedTransaction });
    } catch (error) {
      await session.abortTransaction();
      throw error; // To be caotured in the main catch block
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.log("Error making tansaction:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
