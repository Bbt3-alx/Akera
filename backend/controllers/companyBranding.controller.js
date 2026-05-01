import CompanyBranding from "../models/CompanyBranding.js"
import CompanyMembership from "../models/CompanyMembership.js"
import {ApiError} from "../middlewares/errorHandler.js"

export const getBranding = async (req, res) => {
    if (!req.context?.companyId){
        throw new ApiError(
            400,
            "Company context missing",
            "COMPANY_CONTEXT_MISSING"
        );
    }
    
    const {companyId} = req.context;

    const branding = await CompanyBranding.findOne({company: companyId})

    return res.status(200).json({
        success: true,
        data: branding
    })
}

export const updateBranding = async (req, res) => {
    const {companyId} = req.context;
    const userId = req.user.id

    const membership = await CompanyMembership.findOne({
        user: userId,
        company: companyId,
        role: "manager",
        status: "active",
    })

    if (!membership) {
        throw new ApiError(
            403,
            "Only managers can update branding",
            "UNAUTHORIZED"
        )
    }

    const {
        logoUrl,
        primaryColor,
        footerText,
        receiptPrefix,
    } = req.body

    const branding = await CompanyBranding.findOneAndUpdate(
        {company: companyId},
        {
            $set: {
                ...(logoUrl && {logoUrl}),
                ...(primaryColor && {primaryColor}),
                ...(footerText && {footerText}),
                ...(receiptPrefix && {receiptPrefix})
            }
        },
        {
            new: true,
            upsert: true,
        }
    )

    return res.status(200).json({
        success: true,
        data: branding,
    });
};