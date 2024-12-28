import User from "../models/userModel.js";
import Transaction from "../models/transactionModel.js";
import Shipment from "../models/shipmentModel.js";
import Operation from "../models/operationModel.js";
import Company from "../models/companyModel.js";
import Receipt from "../models/invoiceModel.js";

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
