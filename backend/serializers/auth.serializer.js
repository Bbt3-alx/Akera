export function serialzeUser(user) {
    return {
        id: user._id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        name: [user.firstname, user.lastname]
            .filter(Boolean)
            .join(" "),
        isVerified: user.isVerified,
    };
}

export function serializeMembership(membership) {
    return {
        membershipId: membership._id,
        companyId: membership.company._id,
        companyName: membership.company.name,
        role: membership.role,
        permission: membership.permission || [],
        status: membership.status,
    }
}