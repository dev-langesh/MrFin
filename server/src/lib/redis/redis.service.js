const Redis = require("ioredis");
const { env } = require("../../config/env");

const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis Client Connected"));

async function connectRedis() {
  if (
    redisClient.status === "wait" ||
    redisClient.status === "close" ||
    redisClient.status === "end"
  ) {
    await redisClient.connect();
  }
}

/**
 * Set key with optional expiry and stringification
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl]
 * @param {boolean} [stringify=false]
 */
async function set(key, value, ttl, stringify = false) {
  const finalValue = stringify ? JSON.stringify(value) : value;

  if (ttl) {
    return await redisClient.set(key, finalValue, "PX", ttl);
  }
  return await redisClient.set(key, finalValue);
}

/**
 * Get value by key with optional parsing
 * @param {string} key
 * @param {boolean} [parse=false]
 * @returns {Promise<any|null>}
 */
async function get(key, parse = false) {
  const data = await redisClient.get(key);
  if (!data) return null;
  return parse ? JSON.parse(data) : data;
}

/**
 * Delete key
 * @param {string} key
 * @returns {Promise<number>}
 */
async function del(key) {
  return await redisClient.del(key);
}

const redisService = {
  connect: connectRedis,
  set,
  get,
  del,
  client: redisClient,
};

module.exports = { redisService };
