export function serializeCompanyInvitation(invitation) {
  if (!invitation) {
    return null;
  }

  return {
    id: serializeId(invitation._id ?? invitation.id),
    email: invitation.email,
    company: serializeCompany(invitation.company),
    role: invitation.role,
    status: invitation.status,
    currency: invitation.currency,
    startingBalance: invitation.startingBalance,
    invitedBy: serializeUserReference(invitation.invitedBy),
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    rejectedAt: invitation.rejectedAt,
    revokedAt: invitation.revokedAt,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

export function serializeCompanyInvitations(invitations) {
  return invitations.map((invitation) => serializeCompanyInvitation(invitation));
}

export function serializeInvitationMembership(membership) {
  if (!membership) {
    return null;
  }

  return {
    id: serializeId(membership._id ?? membership.id),
    user: serializeId(membership.user),
    company: serializeCompany(membership.company),
    role: membership.role,
    status: membership.status,
    currency: membership.currency,
    balance: membership.balance,
    invitedBy: serializeUserReference(membership.invitedBy),
    permissions: membership.permissions || [],
    joinedAt: membership.joinedAt,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

function serializeCompany(company) {
  if (!company) {
    return company;
  }

  if (isPopulatedObject(company)) {
    return {
      id: serializeId(company._id ?? company.id),
      name: company.name,
      code: company.code,
      baseCurrency: company.baseCurrency,
    };
  }

  return serializeId(company);
}

function serializeUserReference(user) {
  if (!user) {
    return user;
  }

  if (isPopulatedObject(user)) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

    return {
      id: serializeId(user._id ?? user.id),
      name: name || user.name || user.email,
      email: user.email,
    };
  }

  return serializeId(user);
}

function serializeId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (isPopulatedObject(value)) {
    return serializeId(value._id ?? value.id);
  }

  return value.toString();
}

function isPopulatedObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.toHexString !== "function"
  );
}
