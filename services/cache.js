const redis = require("../config/redisConnect");

async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("[CacheService] GET error:", err);
    return null;
  }
}

async function setCache(key, value, ttl = 3600) {
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttl });
  } catch (err) {
    console.error("[CacheService] SET error:", err);
  }
}

async function clearCache(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("[CacheService] DEL error:", err);
  }
}

function cacheMiddleware(ttl = 3600) {
  return async (req, res, next) => {
    if (req.method !== "GET") return next();

    const cacheKey = req.originalUrl;
    const cachedData = await getCache(cacheKey);
    if (cachedData) return res.json(cachedData);

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      await setCache(cacheKey, body, ttl);
      return originalJson(body);
    };

    next();
  };
}

module.exports = {
  getCache,
  setCache,
  clearCache,
  cacheMiddleware,
};
