import ShippingOperation from "../models/ShippingOperation.js";
import BuyOperation from "../models/BuyOperation.js";
import User from "../models/User.js";

// Create new shipping operation
export const createShippingOperation = async (req, res) => {
  const { operationId } = req.params;
  const { transport = 150 } = req.body;

  if (typeof transport !== "number" || transport <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid transport fee." });
  }

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }
    const operation = await BuyOperation.findById(operationId).populate(
      "partner"
    );
    if (!operation) {
      return res
        .status(404)
        .json({ success: false, message: "Operation not found." });
    }

    if (manager.company._id.toString() !== operation.company.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    // Calculate the shipping fees
    let goldData = [];
    let totalFees = 0;
    let totalWeight = 0;
    let totalBars = operation.golds.length;

    for (const gold of operation.golds) {
      const fees = gold.weight * transport; // 150 default transportation fees per gram
      if (isNaN(fees)) {
        return res.status(400).json({
          success: false,
          message: "Calculated fees are not a valid number.",
        });
      }

      totalBars += 1;
      totalFees += fees;
      totalWeight += gold.weight;

      const golds = {
        base: gold.base,
        weight: gold.weight,
        w_weight: gold.w_weight,
        carat: gold.carat,
        amount: gold.value,
        situation: gold.situation,
        fees: fees,
        partner: operation.partner._id || undefined,
      };

      goldData.push(golds);
    }

    const newShipment = new ShippingOperation({
      golds: goldData,
      company: manager.company._id,
      buyOperationId: operationId,
      totalBars,
      totalWeight,
      totalFees,
    });

    await newShipment.save();

    // Update linked operation status as shipped
    operation.status = "shipped";
    await operation.save();

    res.status(201).json({
      success: true,
      message: "Shiped successfully.",
      shipment: newShipment,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all the shipping hystories of a company
export const getShipmentHistory = async (req, res) => {
  try {
    const manager = await User.findById(req.user.id).populate("company");
    const history = await ShippingOperation.find({
      company: manager.company._id,
    }).sort({ createdAt: -1 }); // Sort by date newest first

    if (history.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No shipping history found." });
    }

    res.status(200).json({
      success: true,
      message: "Shipping history retrieved successfully.",
      history: history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single shipment byt its ID
export const getShipment = async (req, res) => {
  const { shipmentId } = req.params;

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(403)
        .json({ sucess: false, message: "Access denied. Unauthorized." });
    }

    const shipment = await ShippingOperation.findById(shipmentId);
    if (
      !shipment ||
      shipment.company.toString() !== manager.company._id.toString()
    ) {
      return res
        .status(404)
        .json({ success: false, message: "Shipment record not found." });
    }

    res.status(200).json({ success: true, shipment: shipment });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update a shipment
export const updateShippingOperation = async (req, res) => {
  const { shipmentId } = req.params;
  const { status } = req.body;

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    const shipment = await ShippingOperation.findById(shipmentId);
    if (!shipment) {
      return res
        .status(404)
        .json({ success: false, message: "Shipment record not found." });
    }

    const updatedShipment = await ShippingOperation.findByIdAndUpdate(
      shipmentId,
      {
        status,
      },
      { new: true }
    );

    // Update associeted buy operation status
    await BuyOperation.findByIdAndUpdate(updatedShipment.buyOperationId, {
      status: status,
    });

    res.status(200).json({
      success: true,
      message: `Shipment status changed to ${status}`,
      updatedShipment,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a shipment
export const deleteShippingOperation = async (req, res) => {
  const { shipmentId } = req.params;

  try {
    const manager = await User.findById(req.user.id).populate("company");
    if (!manager || !manager.company) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Unauthorized." });
    }

    const shipment = await ShippingOperation.findOne({
      _id: shipmentId,
      company: manager.company._id,
    });

    if (!shipment) {
      return res
        .status(404)
        .json({ success: false, message: "Shipment record not found." });
    }

    // Update the buy operation status as cancelled
    console.log(shipment.buyOperationId);
    await BuyOperation.findByIdAndUpdate(shipment.buyOperationId, {
      status: "pending",
    });

    await ShippingOperation.findByIdAndDelete(shipmentId);

    res.status(200).json({
      success: true,
      message: `Shipment with ID ${shipmentId} deleted successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong." });
  }
};
