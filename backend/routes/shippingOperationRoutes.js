import express from "express";
import verifyToken from "../middlewares/verifyToken.js";
import authorizedRoles from "../middlewares/roleAuthorization.js";
import {
  getShipmentHistory,
  getShipment,
  createShippingOperation,
  updateShippingOperation,
  deleteShippingOperation,
} from "../controllers/manageShipment.js";
import authorizeRoles from "../middlewares/roleAuthorization.js";
import { cache } from "../middlewares/cache.js";
import { ROLES } from "../constants/roles.js";
import { audit } from "../middlewares/audit.js";

const router = express.Router();

// ROUTE TO MAKE A NEW SHIPMENT
router.post(
  "/ship/:id",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("CREATE", "ShipmentOperation"),
  createShippingOperation
);

// ROUTE TO GET ALL THE SHIPMENTS
router.get(
  "/",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  cache("Shipments", 3600),
  getShipmentHistory
);

// ROUTE TO GET A SINGLE SHIPMENT
router.get(
  "/:id",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE),
  getShipment
);

// ROUTE TO UPDATE A SHIPMENT

router.put(
  "/:id",
  verifyToken,
  authorizedRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("UPDATE", "ShipmentOperation"),
  updateShippingOperation
);

//ROUTE TO DELETE A SHIPMENT
router.delete(
  "/cancel/:id",
  verifyToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  audit("DELETE", "ShipmentOperation"),
  deleteShippingOperation
);
export default router;
