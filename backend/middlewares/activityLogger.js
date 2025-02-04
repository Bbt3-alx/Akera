import morgan from "morgan";

export const activityLogger = morgan((tokens, req, res) => {
  return [
    `[${new Date().toISOString()}]`,
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    `${tokens["response-time"](req, res)}ms`,
    `User: ${req.user?.id || "anonymous"}`,
    `Body: ${JSON.stringify(req.body)}`,
  ].join(" ");
});
