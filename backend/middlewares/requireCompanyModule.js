import { ApiError } from "./errorHandler.js";

export function requireCompanyModule(moduleName) {
  function companyModuleGuard(req, res, next) {
    const enabledModules = req.context?.company?.enabledModules;

    if (!Array.isArray(enabledModules) || !enabledModules.includes(moduleName)) {
      return next(
        new ApiError(
          403,
          "This module is not enabled for the active company",
          "MODULE_NOT_ENABLED",
          { moduleName },
        ),
      );
    }

    return next();
  }

  companyModuleGuard.moduleName = moduleName;

  return companyModuleGuard;
}
