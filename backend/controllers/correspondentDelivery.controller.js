import {
  cancelCorrespondentDelivery,
  cancelCorrespondentDeliveryById,
  confirmCorrespondentDelivery,
  confirmCorrespondentDeliveryById,
  createCorrespondentDelivery,
  getCorrespondentDeliveryByCode,
  listCorrespondentDeliveries,
} from "../services/correspondentDelivery.service.js";
import {
  serializeCorrespondentDelivery,
  serializeCorrespondentDeliveries,
} from "../serializers/correspondentDelivery.serializer.js";

export const createDelivery = async (req, res) => {
  const delivery = await createCorrespondentDelivery({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: delivery._id,
    targetCode: delivery.deliveryCode,
    metadata: {
      deliveryCode: delivery.deliveryCode,
      referenceCode: delivery.referenceCode ?? delivery.deliveryCode ?? null,
      amount: delivery.amount,
      currency: delivery.currency,
      status: delivery.status,
      correspondentMembership: auditId(delivery.correspondentMembership),
    },
  };

  res.status(201).json({
    success: true,
    data: serializeCorrespondentDelivery(delivery),
  });
};

export const confirmDeliveryById = async (req, res) => {
  const delivery = await confirmCorrespondentDeliveryById({
    deliveryId: req.params.deliveryId,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
  });

  res.locals.audit = {
    targetId: delivery._id,
    targetCode: delivery.referenceCode ?? delivery.deliveryCode,
    metadata: {
      deliveryCode: delivery.deliveryCode,
      referenceCode: delivery.referenceCode ?? delivery.deliveryCode ?? null,
      amount: delivery.amount,
      currency: delivery.currency,
      status: delivery.status,
      correspondentMembership: auditId(delivery.correspondentMembership),
      accountOperation: auditId(delivery.accountOperation),
    },
  };

  res.status(200).json({
    success: true,
    data: serializeCorrespondentDelivery(delivery),
  });
};

export const listDeliveries = async (req, res) => {
  const result = await listCorrespondentDeliveries({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    code: 200,
    pagination: result.pagination,
    data: serializeCorrespondentDeliveries(result.deliveries),
  });
};

export const cancelDeliveryById = async (req, res) => {
  const delivery = await cancelCorrespondentDeliveryById({
    deliveryId: req.params.deliveryId,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: delivery._id,
    targetCode: delivery.referenceCode ?? delivery.deliveryCode,
    metadata: {
      deliveryCode: delivery.deliveryCode,
      referenceCode: delivery.referenceCode ?? delivery.deliveryCode ?? null,
      amount: delivery.amount,
      currency: delivery.currency,
      status: delivery.status,
      correspondentMembership: auditId(delivery.correspondentMembership),
      cancelReason: delivery.cancelReason,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeCorrespondentDelivery(delivery),
  });
};

export const getDelivery = async (req, res) => {
  const delivery = await getCorrespondentDeliveryByCode({
    deliveryCode: req.params.deliveryCode,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    data: serializeCorrespondentDelivery(delivery),
  });
};

export const confirmDelivery = async (req, res) => {
  const delivery = await confirmCorrespondentDelivery({
    deliveryCode: req.params.deliveryCode,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
  });

  res.locals.audit = {
    targetId: delivery._id,
    targetCode: delivery.deliveryCode,
    metadata: {
      deliveryCode: delivery.deliveryCode,
      amount: delivery.amount,
      currency: delivery.currency,
      status: delivery.status,
      correspondentMembership: auditId(delivery.correspondentMembership),
      accountOperation: auditId(delivery.accountOperation),
    },
  };

  res.status(200).json({
    success: true,
    data: serializeCorrespondentDelivery(delivery),
  });
};

export const cancelDelivery = async (req, res) => {
  const delivery = await cancelCorrespondentDelivery({
    deliveryCode: req.params.deliveryCode,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: delivery._id,
    targetCode: delivery.deliveryCode,
    metadata: {
      deliveryCode: delivery.deliveryCode,
      amount: delivery.amount,
      currency: delivery.currency,
      status: delivery.status,
      correspondentMembership: auditId(delivery.correspondentMembership),
      cancelReason: delivery.cancelReason,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeCorrespondentDelivery(delivery),
  });
};

function auditId(value) {
  if (value && typeof value === "object" && !value.toHexString) {
    return value._id ?? value.id;
  }

  return value;
}
