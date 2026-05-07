import User from "../models/User.js";
import bcrypt from "bcrypt";
import {hashPin} from "../utils/hashPin.js";
import {ApiError} from "../middlewares/errorHandler.js";

export const setupTransactionPin = async (req, res) => {
    const {pin, currentPassword} = req.body;

    if (!pin) {
        throw new ApiError(
            400,
            "PIN is required",
            "PIN_REQUIRED"
        )
    }

    const normalizedPin = String(pin || "").trim();

    if (!/^\d{6}$/.test(normalizedPin)) {
        throw new ApiError(
            400,
            "PIN must contain exactly 6 digits",
            "INVALID_PIN"
        );
    }

    const user = await User.findById(req.user.id)
        .select("+password +transactionPinHash");
    
    if (!user) {
        throw new ApiError(
            404,
            "User not found",
            "USER_NOT_FOUND"
        )
    }

    const passwordValid = await bcrypt.compare(
        currentPassword,
        user.password
    )

    if (!passwordValid) {
        throw new ApiError(
            401,
            "Invalid password",
            "INVALID_PASSWORD"
        )
    }
    
    user.transactionPinHash = await hashPin(normalizedPin);

    await user.save();

    return res.status(200).json({
        success: true,
        message: "Transaction PIN configured successfully",
    });
};