import BuyOperation from "../models/BuyOperation.js";
import Payment from "../models/Payment.js";
import Partner from "../models/Partner.js";
import User from "../models/User.js";

const payForOperation = async (req, res) => {
  const { amount, method, partnerId } = req.body;
  const { operationId } = req.params;

  if (!isValidObjectId(operationId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid operation ID format." });
  }
  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied, unauthorised" });
    }

    // Check if the user has a company
    if (!manager.company) {
      return res.status(401).json({
        success: false,
        message: "You cannot initiate a payment, create a company first.",
      });
    }

    // Check if the selected partner exist
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .josn({ success: false, message: "Partner not found." });
    }

    const operation = await BuyOperation.findOne({
      _id: operationId,
      partner: partnerId,
      company: manager.company._id,
    });
    if (!operation) {
      return res
        .status(404)
        .json({ success: false, message: "Operation not found" });
    }

    // Validate the payment amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero.",
      });
    }

    // Check if comapany has sufficient balance
    if (manager.company.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Company has insufficient cash for this operation.",
      });
    }

    // Check the remain amount
    const lastPayment = await Payment.findOne({
      operation: operation._id,
      partner: partnerId,
      company: manager.company._id,
    });

    const remainingAmount = lastPayment
      ? lastPayment.remain
      : operation.amount - operation.amountPaid;

    if (amount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: "Amount must not exceed the remaining amount.",
      });
    }

    // Check company balance
    if (manager.company.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Company has insufficient cash for this operation.",
      });
    }

    // Update the paid amount
    operation.amountPaid += amount;

    // Create the new payment
    const payment = new Payment({
      operation: operationId,
      amount: amount.toFixed(0),
      totalAmount: operation.amount.toFixed(0),
      remain: operation.amount - operation.amountPaid,
      method,
      partner: partnerId,
      company: manager.company._id,
      paidBy: req.user.id,
    });

    await payment.save();
    manager.company.balance -= amount;
    await manager.company.save();

    // Update partner's balance
    partner.balance -= amount;
    await partner.save();

    // Check the payment status
    operation.paymentStatus =
      operation.amountPaid >= operation.amount ? "paid" : "partially paid";
    await operation.save();

    res.status(200).json({ success: true, payment: payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default payForOperation;
