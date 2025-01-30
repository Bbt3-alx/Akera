export const logDeletion = async (data) => {
  await AudiLog.create({
    action: "HARD_DELETE",
    collection: data.collection,
    count: data.count,
    initiatedBy: "system",
  });
};
