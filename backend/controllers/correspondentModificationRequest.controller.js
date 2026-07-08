import {
  approveCorrespondentModificationRequest,
  createCorrespondentCollectionModificationRequest,
  createCorrespondentDeliveryModificationRequest,
  listCorrespondentModificationRequests,
  rejectCorrespondentModificationRequest,
} from "../services/correspondentModificationRequest.service.js";
import {
  serializeCorrespondentModificationRequest,
  serializeCorrespondentModificationRequests,
} from "../serializers/correspondentModificationRequest.serializer.js";

export const createCollectionModificationRequest = async (req, res) => {
  const request = await createCorrespondentCollectionModificationRequest({
    collectionId: req.params.collectionId,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    payload: req.body,
    role: req.context.role,
    userId: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: serializeCorrespondentModificationRequest(request),
  });
};

export const createDeliveryModificationRequest = async (req, res) => {
  const request = await createCorrespondentDeliveryModificationRequest({
    deliveryId: req.params.deliveryId,
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    payload: req.body,
    role: req.context.role,
    userId: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: serializeCorrespondentModificationRequest(request),
  });
};

export const listModificationRequests = async (req, res) => {
  const result = await listCorrespondentModificationRequests({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    query: req.query,
    role: req.context.role,
  });

  res.status(200).json({
    success: true,
    code: 200,
    pagination: result.pagination,
    data: serializeCorrespondentModificationRequests(result.requests),
  });
};

export const approveModificationRequest = async (req, res) => {
  const request = await approveCorrespondentModificationRequest({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    requestId: req.params.requestId,
    role: req.context.role,
    userId: req.user.id,
  });

  res.status(200).json({
    success: true,
    data: serializeCorrespondentModificationRequest(request),
  });
};

export const rejectModificationRequest = async (req, res) => {
  const request = await rejectCorrespondentModificationRequest({
    companyId: req.context.companyId,
    membershipId: req.context.membershipId,
    payload: req.body,
    requestId: req.params.requestId,
    role: req.context.role,
    userId: req.user.id,
  });

  res.status(200).json({
    success: true,
    data: serializeCorrespondentModificationRequest(request),
  });
};
