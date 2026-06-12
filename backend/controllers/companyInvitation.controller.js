import {
  acceptCompanyInvitation,
  createCompanyInvitation,
  listCompanyInvitations,
  listMyInvitations,
  rejectCompanyInvitation,
  revokeCompanyInvitation,
} from "../services/companyInvitation.service.js";
import {
  serializeCompanyInvitation,
  serializeCompanyInvitations,
  serializeInvitationMembership,
} from "../serializers/companyInvitation.serializer.js";

export const createInvitation = async (req, res) => {
  const invitation = await createCompanyInvitation({
    companyId: req.context.companyId,
    managerId: req.user.id,
    managerRole: req.context.role,
    payload: req.body,
  });

  res.status(201).json({
    success: true,
    data: serializeCompanyInvitation(invitation),
  });
};

export const listInvitations = async (req, res) => {
  const invitations = await listCompanyInvitations({
    companyId: req.context.companyId,
    managerRole: req.context.role,
    status: req.query.status,
  });

  res.status(200).json({
    success: true,
    data: serializeCompanyInvitations(invitations),
  });
};

export const listMine = async (req, res) => {
  const invitations = await listMyInvitations({
    email: req.user.email,
  });

  res.status(200).json({
    success: true,
    data: serializeCompanyInvitations(invitations),
  });
};

export const acceptInvitation = async (req, res) => {
  const result = await acceptCompanyInvitation({
    invitationId: req.params.id,
    userId: req.user.id,
    userEmail: req.user.email,
  });

  res.status(200).json({
    success: true,
    data: {
      invitation: serializeCompanyInvitation(result.invitation),
      membership: serializeInvitationMembership(result.membership),
    },
  });
};

export const rejectInvitation = async (req, res) => {
  const invitation = await rejectCompanyInvitation({
    invitationId: req.params.id,
    userEmail: req.user.email,
  });

  res.status(200).json({
    success: true,
    data: serializeCompanyInvitation(invitation),
  });
};

export const revokeInvitation = async (req, res) => {
  const invitation = await revokeCompanyInvitation({
    invitationId: req.params.id,
    companyId: req.context.companyId,
    managerId: req.user.id,
    managerRole: req.context.role,
  });

  res.status(200).json({
    success: true,
    data: serializeCompanyInvitation(invitation),
  });
};
