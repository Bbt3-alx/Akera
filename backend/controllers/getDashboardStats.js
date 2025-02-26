import Transaction from "../models/Transaction.js";
import BuyOperation from "../models/BuyOperation.js";
import SellOperation from "../models/SellOperation.js";
import Partner from "../models/Partner.js";
import ShippingOperation from "../models/ShippingOperation.js";
import Company from "../models/Company.js";
import AuditLog from "../models/AuditLog.js";
import redisClient from "../config/redis.js";

// Cache timeout (15 mnutes)
const DASHBOARD_CACHE_TTL = 15 * 60;

export const getDashboardData = async (req, res) => {
  try {
    const companyId = req.user.company;
    const cacheKey = `dashboard:${companyId}`;

    // Try to get cached data
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        code: 200,
        source: "cache",
        data: JSON.parse(cachedData),
      });
    }

    // Try to get all data in parallel
    const [
      company,
      recentTransactions,
      partners,
      buyOperations,
      sellOperations,
      activities,
    ] = await Promise.all([
      Company.findById(companyId).select("balance usdBalance currency").lean(),
      Transaction.find({ company: companyId })
        .sort("-date")
        .limit(10)
        .populate("partner", "name")
        .lean(),
      Partner.find({ companies: companyId })
        .select("name balance")
        .sort("-balance")
        .limit(5)
        .lean(),
      BuyOperation.aggregate([
        { $match: { company: companyId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      SellOperation.aggregate([
        { $match: { company: companyId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      AuditLog.find({ companyId }).sort("-timestamp").limit(10).lean(),
    ]);

    // Calculate metrics
    const totalBuy = buyOperations[0]?.total || 0;
    const totalSell = sellOperations[0]?.total || 0;
    const netCahFlow = totalSell - totalBuy;
    const partnerBalances = partners.reduce((sum, p) => sum + p.balance, 0);

    // Gold metrics
    const goldMetrics = await BuyOperation.aggregate([
      { $match: { company: companyId } },
      { $unwind: "$golds" },
      {
        $group: {
          _id: null,
          totalWeight: { $sum: "$golds.weight" },
          avgCarat: { $avg: "$golds.carat" },
          totalItems: { $sum: 1 },
        },
      },
    ]);

    // Format response
    const dashboardData = {
      overview: {
        currentBalance: company.balance,
        currency: company.currency,
        totalBuy,
        totalSell,
        netCahFlow,
        partnerBalances,
      },
      gold: {
        totalWeight: goldMetrics[0]?.totalWeight || 0,
        avgCarat: goldMetrics[0]?.avgCarat?.toFixed(2) || 0,
        totalItems: goldMetrics[0]?.totalItems || 0,
      },
      partners: {
        count: partners.length,
        topPartners: partners,
        totalBalances: partnerBalances,
      },
      recentActivities: {
        transactions: recentTransactions,
        operations: activities,
      },
      performance: {
        monthlyAvgBuy: await getMonthlyAverage("BuyOperation", companyId),
        monthlyAvgSell: await getMonthlyAverage("SellOperation", companyId),
        ytdTotal: await getYearToDateTotal(companyId),
      },
    };

    //Cache the data
    await redisClient.setEx(
      cacheKey,
      DASHBOARD_CACHE_TTL,
      JSON.stringify(dashboardData)
    );

    res.status(200).json({
      success: true,
      code: 200,
      source: "database",
      data: dashboardData,
    });
  } catch (error) {
    console.error("Dashboard", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "Failed to load dashboard data",
    });
  }
};

// Helper function
const getMonthlyAverage = async (modelType, companyId) => {
  const model = modelType === "BuyOperation" ? BuyOperation : SellOperation;

  const result = await model.aggregate([
    { $match: { company: companyId } },
    {
      $group: {
        _id: { $month: "$date" },
        monthlyTotal: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$monthlyTotal" },
        count: { $avg: "$count" },
      },
    },
  ]);

  return {
    amount: result[0]?.average || 0,
    transactionCount: result[0]?.count || 0,
  };
};

const getYearToDateTotal = async (companyId) => {
  const currentYear = new Date().getFullYear();

  const [buy, sell] = await Promise.all([
    BuyOperation.aggregate([
      {
        $match: {
          company: companyId,
          date: { $gte: new Date(`${currentYear}-01-01`) },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    SellOperation.aggregate([
      {
        $match: {
          company: companyId,
          date: { $gte: new Date(`${currentYear}-01-01`) },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    buy: buy[0]?.total || 0,
    sell: sell[0]?.total || 0,
  };
};
