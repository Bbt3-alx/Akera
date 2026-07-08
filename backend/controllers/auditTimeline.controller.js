import { listAuditTimelineLogs } from "../services/auditTimeline.service.js";
import { serializeAuditTimelineList } from "../serializers/auditTimeline.serializer.js";

export const getAuditTimeline = async (req, res) => {
  const result = await listAuditTimelineLogs({
    companyId: req.context.companyId,
    filters: req.query,
    pagination: {
      page: req.query.page,
      limit: req.query.limit,
    },
  });

  res.status(200).json({
    success: true,
    data: serializeAuditTimelineList(result),
  });
};
