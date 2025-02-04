export const paginate =
  (defaultLimit = 10) =>
  (req, res, next) => {
    req.pagination = {
      page: Math.abs(parseInt(req.query.page)) || 1,
      limit: Math.min(Math.abs(parseInt(req.query.limit)) || defaultLimit, 100),
    };
    next();
  };
