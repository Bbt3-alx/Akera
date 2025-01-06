import Company from "../models/Company.js";
import Partner from "../models/Partner.js";
import PartnerBalance from "../models/partnerBalance.js";
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

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email address." });
  }

  try {
    const manager = await User.findById(req.user.id);
    const companyId = manager.company;
    const company = await Company.findById(companyId);

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const partner = await Partner.findOne({ $or: [{ phone }, { email }] });

    if (partner) {
      // Verify if a partner is already in a company's partners list

      if (company.partners.includes(partner._id)) {
        console.log(`Existing partner: ${partner.name}`);
        return res.status(409).json({
          success: false,
          message: "Partner already in your list",
        });
      }

      company.partners.push(partner._id); // Link the existing partner to the company

      if (!partner.companies.includes(company._id)) {
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
        companies: [companyId],
      });
      const savedPartner = await newPartner.save();

      // Create partner balance to company
      const newBalance = new PartnerBalance({
        companyId,
        partnerId: savedPartner._id,
        balance,
      });

      const savedBalance = await newBalance.save();
      console.log(savedBalance);
      // Add the new partner to the company's partners list
      company.partners.push(savedPartner._id);
      await company.save();

      return res.status(201).json({
        success: true,
        partner: savedPartner,
        balance: savedBalance.balance,
      });
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
      console.log("Manager not found");
      return res
        .status(404)
        .json({ success: false, message: "Manager not found" });
    }
    if (!manager.company) {
      console.log("You have no company yet, create a company first");
      return res.status(404).json({
        success: false,
        message: "You have no company yet, create a company first.",
      });
    }
    const partners = await Partner.find({
      companies: manager.company._id,
    }).select("-companies");
    if (!partners) {
      console.log("No partner found for this company.");
      return res.status(404).json({
        success: false,
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
    if (!updatePartner) {
      console.log("Partner not found");
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
