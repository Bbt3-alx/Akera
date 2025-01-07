import Company from "../models/Company.js";
import User from "../models/User.js";
import Partner from "../models/Partner.js";

export const createCompany = async (req, res) => {
  const { name, address, contact, balance, partners } = req.body;

  try {
    if (!name || !address || !contact) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    // Check if company already exist
    const existingCompany = await Company.findOne({ contact });
    if (existingCompany) {
      return res.status(403).json({
        success: false,
        message: "A company already exist with this contact.",
      });
    }

    // Create a new company
    const newCompany = new Company({
      name,
      address,
      contact,
      balance,
      manager: req.user.id,
    });
    const savedCompany = await newCompany.save();

    if (partners && Array.isArray(partners)) {
      const partnerPromise = partners.map(async (partnerData) => {
        const partner = await Partner.findOne({
          $or: [{ phone: partnerData.phone }, { email: partnerData.email }],
        });

        // If the partner exist, link to the new company
        if (partner) {
          partner.companies.push(newCompany._id);
          await partner.save();
          return partner._id; // Return the existing partner's ID
        } else {
          // Else Create new partner
          const newPartner = new Partner({
            name: partnerData.name,
            phone: partnerData.phone,
            email: partnerData.email,
            balance: partnerData.balance,
            companies: [newCompany._id], // Link the partner to the company
          });

          const savedPartner = await newPartner.save();
          return savedPartner._id; // Return the newly created partner's ID
        }
      });

      const partnerIDs = await Promise.all(partnerPromise);
      savedCompany.partners = partnerIDs; // Update with all partners IDs
      await savedCompany.save();
    }

    // Update the manager, by linking the new company to the manager's account
    const user = await User.findByIdAndUpdate(req.user.id, {
      company: savedCompany._id,
    });

    res.status(201).json({ success: true, company: savedCompany });
  } catch (error) {
    console.log("Error creating company: ", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const myCompanies = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate(
      "manager",
      "name email"
    );
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "No company found with the given ID",
      });
    }
    res.status(200).json({ success: true, company: company });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
