import redisClient from "../config/redis.js";

export const cache =
  (keyPrefix, ttl = 3600) =>
  async (req, res, next) => {
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    try {
      const cacheData = await redisClient.get(cacheKey);
      if (cacheData) {
        console.log("Serving from cache");
        return res.json(JSON.parse(cacheData));
      }

      // Override res.json to cache responses
      const originalJson = res.json;
      res.json = (body) => {
        redisClient.setEx(cacheKey, ttl, JSON.stringify(body));
        originalJson.call(res, body);
      };

      next();
    } catch (error) {
      console.log("Cache middleware error:", error);
    }
  };
