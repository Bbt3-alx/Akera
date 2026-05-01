import express from "express"
import verifyToken from "../middlewares/verifyToken.js"
import resolveCompanyContext from "../middlewares/resolveCompanyContext.js";
import {
    getBranding,
    updateBranding,
} from "../controllers/companyBranding.controller.js"

const router = express.Router();

router.get(
    "/",
    verifyToken,
    resolveCompanyContext,
    getBranding
);

router.put(
    "/",
    verifyToken,
    resolveCompanyContext,
    updateBranding
)

export default router