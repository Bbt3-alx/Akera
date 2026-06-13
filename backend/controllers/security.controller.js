import {
  changeTransactionPin as changeTransactionPinService,
  getTransactionPinStatus as getTransactionPinStatusService,
  setupTransactionPin as setupTransactionPinService,
} from "../services/security.service.js";

export const getTransactionPinStatus = async (req, res) => {
  const data = await getTransactionPinStatusService(req.user.id);

  return res.status(200).json({
    success: true,
    data,
  });
};

export const setupTransactionPin = async (req, res) => {
  const data = await setupTransactionPinService({
    currentPassword: req.body.currentPassword,
    transactionPin: req.body.transactionPin ?? req.body.pin,
    userId: req.user.id,
  });

  res.locals.audit = buildTransactionPinAudit(req);

  return res.status(200).json({
    success: true,
    message: "Transaction PIN configured.",
    data,
  });
};

export const changeTransactionPin = async (req, res) => {
  const data = await changeTransactionPinService({
    currentPassword: req.body.currentPassword,
    currentTransactionPin: req.body.currentTransactionPin,
    newTransactionPin: req.body.newTransactionPin,
    userId: req.user.id,
  });

  res.locals.audit = buildTransactionPinAudit(req);

  return res.status(200).json({
    success: true,
    message: "Transaction PIN changed.",
    data,
  });
};

function buildTransactionPinAudit(req) {
  return {
    targetId: req.user.id,
    metadata: {
      configured: true,
    },
  };
}
