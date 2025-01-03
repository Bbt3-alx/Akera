import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import Shipment from "../models/Shipment.js";
import Operation from "../models/Operation.js";
import Company from "../models/Company.js";
import Receipt from "../models/Incoice.js";

const getDashboardStats = async () => {
  const totalCompanies = await Company.countDocuments();
  const totalManagers = await User.countDocuments({ roles: "manager" });
  const totalPartners = await User.countDocuments({ roles: "partner" });
  const totalTransactions = await Transaction.countDocuments();
  const totalOperations = await Operation.countDocuments();
  const totalShipments = await Shipment.countDocuments();
  const totalReceipts = await Receipt.countDocuments();

  return {
    totalCompanies,
    totalManagers,
    totalPartners,
    totalTransactions,
    totalOperations,
    totalShipments,
    totalReceipts,
  };
};

export default getDashboardStats;
