export function serializeCorrespondentDelivery(delivery) {
  if (!delivery) {
    return null;
  }

  const correspondentMembership = delivery.correspondentMembership;
  const correspondentUser = correspondentMembership?.user;
  const createdByUser = delivery.createdBy;
  const confirmedByUser = delivery.confirmedBy;
  const canceledByUser = delivery.canceledBy;

  return {
    id: serializeId(delivery._id ?? delivery.id),
    deliveryCode: delivery.deliveryCode,
    referenceCode: delivery.referenceCode ?? delivery.deliveryCode ?? null,
    amount: delivery.amount,
    currency: delivery.currency,
    status: delivery.status,
    beneficiaryName: delivery.beneficiaryName,
    beneficiaryPhone: delivery.beneficiaryPhone,
    note: delivery.note ?? delivery.description,
    rateValue: delivery.rateValue,
    rateBaseAmount: delivery.rateBaseAmount,
    rateQuoteCurrency: delivery.rateQuoteCurrency,
    rateBaseCurrency: delivery.rateBaseCurrency,
    counterAmount: delivery.counterAmount,
    counterCurrency: delivery.counterCurrency,
    rateNote: delivery.rateNote,
    correspondentMembership: serializeId(correspondentMembership),
    correspondentName: resolveUserName(correspondentUser),
    correspondentEmail: correspondentUser?.email,
    createdBy: serializeId(createdByUser),
    createdByName: resolveUserName(createdByUser),
    confirmedBy: serializeId(confirmedByUser),
    confirmedByName: resolveUserName(confirmedByUser),
    canceledBy: serializeId(canceledByUser),
    canceledByName: resolveUserName(canceledByUser),
    accountOperation: serializeId(delivery.accountOperation),
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
    confirmedAt: delivery.confirmedAt,
    canceledAt: delivery.canceledAt,
    cancelReason: delivery.cancelReason,
  };
}

export function serializeCorrespondentDeliveries(deliveries) {
  return deliveries.map((delivery) => serializeCorrespondentDelivery(delivery));
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
