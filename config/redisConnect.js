const Redis = require("ioredis");

// Create Redis client
// const redis = new Redis({
//   host: "127.0.0.1", // Change if Redis is running on a different host
//   port: 6379, // Default Redis port
//   retryStrategy: (times) => Math.min(times * 50, 2000), // Reconnect strategy
// });
const redis = new Redis({
  host: process.env.REDIS_HOST, // Change if Redis is running on a different host
  port: process.env.REDIS_PORT, // Default Redis port
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000), // Reconnect strategy
});

// Event listeners for better debugging
redis.on("connect", () => console.log("✅ Connected to Redis"));
redis.on("error", (err) => console.error("❌ Redis Error:", err));

module.exports = redis;
