import User from "../models/User.js";
import {comparePin} from "../utils/hashPin.js";
import { ApiError, catchAsync } from "./errorHandler.js";

async function verifyTransactionPin(
    req,
    res,
    next
) {

    const {transactionPin} = req.body;

    if(!transactionPin){
        throw new ApiError(
            401,
            "Transaction PIN required",
            "TRANSACTION_PIN_REQUIRED"
        )
    }

    const user = await User.findById(req.user.id)
        .select("+transactionPinHash");

    if (!user?.transactionPinHash) {
        throw new ApiError(
            403,
            "Transaction PIN not configured",
            "TRANSACTION_PIN_NOT_CONFIGURED"
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
            "INVALID_TRANSACTION_PIN"
        );
    }

    next();
}

export default catchAsync(verifyTransactionPin);
