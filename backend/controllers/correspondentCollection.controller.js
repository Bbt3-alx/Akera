import {
  cancelCorrespondentCollection,
  confirmCorrespondentCollection,
  createCorrespondentCollection,
  getCorrespondentCollectionByCode,
  listCorrespondentCollections,
} from "../services/correspondentCollection.service.js";
import {
  serializeCorrespondentCollection,
  serializeCorrespondentCollections,
} from "../serializers/correspondentCollection.serializer.js";

export const createCollection = async (req, res) => {
  const collection = await createCorrespondentCollection({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: collection._id,
    targetCode: collection.collectionCode,
    metadata: {
      collectionCode: collection.collectionCode,
      amount: collection.amount,
      currency: collection.currency,
      payoutAmount: collection.payoutAmount,
      payoutCurrency: collection.payoutCurrency,
      status: collection.status,
      correspondentMembership: auditId(collection.correspondentMembership),
      accountOperation: auditId(collection.accountOperation),
    },
  };

  res.status(201).json({
    success: true,
    data: serializeCorrespondentCollection(collection),
  });
};

export const listCollections = async (req, res) => {
  const result = await listCorrespondentCollections({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    code: 200,
    pagination: result.pagination,
    data: serializeCorrespondentCollections(result.collections),
  });
};

export const getCollection = async (req, res) => {
  const collection = await getCorrespondentCollectionByCode({
    collectionCode: req.params.collectionCode,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    data: serializeCorrespondentCollection(collection),
  });
};

async function payCollectionByCode(req, res) {
  const collection = await confirmCorrespondentCollection({
    collectionCode: req.params.collectionCode,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
  });

  res.locals.audit = {
    targetId: collection._id,
    targetCode: collection.collectionCode,
    metadata: {
      collectionCode: collection.collectionCode,
      amount: collection.amount,
      currency: collection.currency,
      payoutAmount: collection.payoutAmount,
      payoutCurrency: collection.payoutCurrency,
      status: collection.status,
      correspondentMembership: auditId(collection.correspondentMembership),
      accountOperation: auditId(collection.accountOperation),
      paidAt: collection.paidAt,
      paidBy: auditId(collection.paidBy),
      paidByMembership: auditId(collection.paidByMembership),
    },
  };

  res.status(200).json({
    success: true,
    data: serializeCorrespondentCollection(collection),
  });
}

export const payCollection = payCollectionByCode;
export const confirmCollection = payCollectionByCode;

export const cancelCollection = async (req, res) => {
  const collection = await cancelCorrespondentCollection({
    collectionCode: req.params.collectionCode,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    userId: req.user.id,
    role: req.context.role,
    payload: req.body,
  });

  res.locals.audit = {
    targetId: collection._id,
    targetCode: collection.collectionCode,
    metadata: {
      collectionCode: collection.collectionCode,
      amount: collection.amount,
      currency: collection.currency,
      payoutAmount: collection.payoutAmount,
      payoutCurrency: collection.payoutCurrency,
      status: collection.status,
      correspondentMembership: auditId(collection.correspondentMembership),
      cancellationAccountOperation: auditId(
        collection.cancellationAccountOperation,
      ),
      cancelReason: collection.cancelReason,
    },
  };

  res.status(200).json({
    success: true,
    data: serializeCorrespondentCollection(collection),
  });
};

function auditId(value) {
  if (value && typeof value === "object" && !value.toHexString) {
    return value._id ?? value.id;
  }

  return value;
}
