import Company from "../models/Company.js";
import Partner from "../models/Partner.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// CREATE A PARTNER
export const addPartner = async (req, res) => {
  const { name, phone, balance, email } = req.body;
  const contact = phone || email;

  if (!name || !contact) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields." });
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address." });
  }

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager) {
      return res.status(401).json({
        success: false,
        message: "Access denied. You are not authorized.",
      });
    }
    if (!manager.company) {
      return res
        .status(401)
        .json({ success: true, message: "You don't have a company yet." });
    }

    const query = {};
    if (phone) query.phone = phone;
    if (email) query.email = email;
    const partner = await Partner.findOne(query);
    const company = manager.company;

    console.log("Ici", company.name);
    if (partner) {
      // Check for existing partner in the company's list
      if (company.partners.some((id) => id.equals(partner._id))) {
        console.log(`Existing partner: ${partner.name}`);
        return res.status(409).json({
          success: false,
          message: "Partner already in your list",
        });
      }

      company.partners.push(partner._id); // Link the existing partner to the company

      if (!partner.companies.some((id) => id.equals(company._id))) {
        partner.companies.push(company._id);
      }
      await company.save();
      await partner.save();

      return res.status(200).json({ success: true, partner: partner });
    } else {
      const newPartner = new Partner({
        name,
        phone,
        email,
        balance,
        companies: [company._id],
      });
      const savedPartner = await newPartner.save();

      // Link new partner to company
      company.partners.push(savedPartner._id);
      await company.save();

      return res.status(201).json({ success: true, partner: savedPartner });
    }
  } catch (error) {
    console.log("Error creating partner", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// READ PARTNERS LIST (Manager route)
export const myPartners = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager) {
      return res
        .status(404)
        .json({ success: false, message: "Manager not found" });
    }
    if (!manager.company) {
      return res.status(404).json({
        success: false,
        message: "You have no company yet, create a company first.",
      });
    }
    const partners = await Partner.find({
      companies: manager.company._id,
    }).select("-companies");

    // Check if partner list is empty
    if (partners.length === 0) {
      console.log("No partner found for this company.");
      return res.status(200).json({
        success: true,
        message: "No partner found for this company.",
      });
    }

    res.status(200).json({ success: true, partners: partners });
  } catch (error) {
    console.log("Error fetching partners:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE A PARTNER
export const updatePartner = async (req, res) => {
  const { name, phone, email, balance } = req.body;
  const partnerId = req.params.partnerId;
  try {
    const updatedPartner = await Partner.findByIdAndUpdate(
      partnerId,
      {
        name,
        phone,
        email,
        balance,
      },
      { new: true }
    );
    if (!updatedPartner) {
      console.log("Partner not found.");
      return res
        .status(404)
        .json({ success: false, message: "Partner not found" });
    }
    res.status(200).json({ success: true, partner: updatedPartner });
  } catch (error) {
    console.log("Error updating partner:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET A PARTNER BALANCES FROM EACH ASSOCIETED COMPANIES
export const getPartnerBalance = async (req, res) => {
  const partnerId = req.params.partnerId;
  const managerId = req.user.id;

  try {
    const manager = await User.findById(managerId).populate("company");
    if (!manager || !manager.company) {
      return res.status(401).json({
        success: false,
        message: "You are not allowed to do this action.",
      });
    }
    if (!manager.company.partners.includes(partnerId)) {
      return res.status(401).json({
        success: false,
        message: "You can only see your partner balance.",
      });
    }
    const partner = await Partner.findOne({ _id: partnerId });
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "Partner doesn't exist anymore." });
    }
    res.status(200).json({ success: true, balance: partner.balance });
  } catch (error) {
    return res.status(500).json({ success: true, messsge: error.message });
  }
};

// REMOVE A PARTNER
export const removePartner = async (req, res) => {
  const partnerId = req.params.partnerId;
  const managerId = req.user.id;

  try {
    const manager = await User.findById(managerId).populate("company");
    if (!manager || !manager.company) {
      return res.status(401).json({
        success: false,
        message: "You are not allowed to do this action.",
      });
    }
    if (!manager.company.partners.includes(partnerId)) {
      return res
        .status(401)
        .json({ success: false, message: "You can only remove your partner." });
    }
    const removedPartner = await Partner.findByIdAndDelete(partnerId);
    if (!removedPartner) {
      return res.status(404).json({
        success: false,
        message: "We can't find any partner with this id.",
      });
    }

    // Remove the partner from the company's partners list
    manager.company.partners = manager.company.partners.filter(
      (item) => item.toString() !== partnerId
    );
    await manager.company.save();

    // Remove all the transaction related to the partner
    const transactions = await Transaction.find({
      company: manager.company._id,
      partner: partnerId,
    });

    if (transactions.length > 0) {
      await Transaction.deleteMany({
        company: manager.company._id,
        partner: partnerId,
      });
    }

    // Update company transaction list
    manager.company.transactions = manager.company.transactions.filter(
      (transaction) =>
        !transactions.some(
          (trans) => trans._id.toString() === transaction.toString()
        )
    );
    await manager.company.save();

    res.status(200).json({
      success: true,
      message: `Partner removed successfully!`,
      removedPartner: removedPartner,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET SPECIFIC PARTNER BY IT'S ID
export const getpartner = async (req, res) => {
  const partnerId = req.params.partnerId;

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    if (!manager.company.partners.includes(partnerId.toString())) {
      return res.status(401).json({
        success: false,
        message: "You can only get your own partners.",
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: "This partner no longer exists." });
    }

    res.status(200).json({ success: true, partner: partner });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
