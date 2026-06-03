export function serializeUser(user) {
  const firstName = user.firstName;
  const lastName = user.lastName;

  return {
    id: user._id,
    email: user.email,
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" "),
    isVerified: user.isVerified,
  };
}

export function serializeMembership(membership) {
  return {
    membershipId: membership._id,
    companyId: membership.company?._id,
    companyName: membership.company?.name,
    role: membership.role,
    permissions: membership.permissions || [],
    status: membership.status,
  };
}
