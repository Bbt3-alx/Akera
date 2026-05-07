import User from "../models/User.js";
import {comparePin} from "../utils/pin.js";
import { ApiError } from "./errorHandler.js";

export default async function verifyTransactionPin(
    req,
    res,
    next
) {

    const {transactionPin} = req.body;

    if(!transactionPin){
        throw new ApiError(
            401,
            "Transaction PIN required",
            "PIN_REQUIRED"
        )
    }

    const user = await User.findById(req.user.id)
        .select("+transactionPinHash");

    if (!user?.transactionPinHash) {
        throw new ApiError(
            403,
            "Transaction PIN not configured",
            "PIN_NOT_CONFIGURED"
        )
    }

    const valid = await comparePin(
        transactionPin,
        user.transactionPinHash
    );

    if(!valid){
        throw new ApiError(
            401,
            "Invalid Transaction PIN",
            "INVALID_PIN"
        );
    }

    next();
}