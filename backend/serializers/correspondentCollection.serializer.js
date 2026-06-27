export function serializeCorrespondentCollection(collection) {
  if (!collection) {
    return null;
  }

  const correspondentMembership = collection.correspondentMembership;
  const correspondentUser = correspondentMembership?.user;
  const createdByUser = collection.createdBy;
  const confirmedByUser = collection.confirmedBy;
  const paidByUser = collection.paidBy ?? collection.confirmedBy;
  const canceledByUser = collection.canceledBy;

  return {
    id: serializeId(collection._id ?? collection.id),
    collectionCode: collection.collectionCode,
    amount: collection.amount,
    beneficiaryName: collection.beneficiaryName ?? collection.customerName,
    beneficiaryPhone: collection.beneficiaryPhone ?? collection.customerPhone,
    currency: collection.currency,
    payoutAmount: collection.payoutAmount,
    payoutCurrency: collection.payoutCurrency,
    status: collection.status,
    customerName: collection.customerName,
    customerPhone: collection.customerPhone,
    note: collection.note ?? collection.description,
    rateValue: collection.rateValue,
    rateBaseAmount: collection.rateBaseAmount,
    rateQuoteCurrency: collection.rateQuoteCurrency,
    rateBaseCurrency: collection.rateBaseCurrency,
    counterAmount: collection.counterAmount,
    counterCurrency: collection.counterCurrency,
    rateNote: collection.rateNote,
    correspondentMembership: serializeId(correspondentMembership),
    correspondentName: resolveUserName(correspondentUser),
    correspondentEmail: correspondentUser?.email,
    createdBy: serializeId(createdByUser),
    createdByName: resolveUserName(createdByUser),
    confirmedBy: serializeId(confirmedByUser),
    confirmedByName: resolveUserName(confirmedByUser),
    paidBy: serializeId(paidByUser),
    paidByName: resolveUserName(paidByUser),
    canceledBy: serializeId(canceledByUser),
    canceledByName: resolveUserName(canceledByUser),
    accountOperation: serializeId(collection.accountOperation),
    cancellationAccountOperation: serializeId(
      collection.cancellationAccountOperation,
    ),
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    confirmedAt: collection.confirmedAt,
    paidAt: collection.paidAt ?? collection.confirmedAt,
    canceledAt: collection.canceledAt,
    cancelReason: collection.cancelReason,
  };
}

export function serializeCorrespondentCollections(collections) {
  return collections.map((collection) =>
    serializeCorrespondentCollection(collection),
  );
}

function resolveUserName(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  if (typeof user.name === "string" && user.name.trim()) {
    return user.name.trim();
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (typeof user.email === "string" && user.email.trim()) {
    return user.email.trim();
  }

  return null;
}

function serializeId(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value.toHexString === "function") {
    return value.toHexString();
  }

  if (typeof value === "object") {
    return serializeId(value._id ?? value.id);
  }

  return value.toString();
}
