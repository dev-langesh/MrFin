const { RateLimiterRedis } = require("rate-limiter-flexible");
const { redisService } = require("../lib/redis/redis.service");
const { AppError } = require("../middleware/errorHandler.middleware");

// Helper to create middleware
const createRateLimiter = (options, keyPrefix) => {
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisService.client,
    keyPrefix: keyPrefix,
    points: options.points, // Number of points
    duration: options.duration, // Per second(s)
    blockDuration: options.blockDuration || 0, // Block for N seconds if consumed more than points
    inmemoryBlockOnConsumed: options.points, // Prevent Redis spam if blockDuration is used
  });

  return (req, res, next) => {
    if (require("../config/env").env.NODE_ENV === "test") {
      return next();
    }

    let key = req.ip; // Default to IP for global

    if (options.keyGenerator) {
      key = options.keyGenerator(req);
    } else if (options.useUserId && req.user && req.user._id) {
      key = req.user._id.toString();
    }

    rateLimiter
      .consume(key)
      .then((rateLimiterRes) => {
        // Set standard RateLimit headers
        res.set("X-RateLimit-Limit", options.points);
        res.set("X-RateLimit-Remaining", rateLimiterRes.remainingPoints);
        res.set(
          "X-RateLimit-Reset",
          new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
        );

        next();
      })
      .catch((rateLimiterRes) => {
        // Not enough points = 429
        res.set("Retry-After", Math.ceil(rateLimiterRes.msBeforeNext / 1000));
        res.set("X-RateLimit-Limit", options.points);
        res.set("X-RateLimit-Remaining", rateLimiterRes.remainingPoints);
        res.set(
          "X-RateLimit-Reset",
          new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
        );

        // We can throw a custom error to be handled by the error handler,
        // OR send the response directly. Sending directly is often cleaner for 429.
        res.status(429).json({
          status: "fail",
          message:
            options.errorMessage ||
            "Too many requests, please try again later.",
        });
      });
  };
};

// 1. Global API Limiter: 100 requests per 1 minute (60s)
const globalLimiter = createRateLimiter(
  {
    points: 100,
    duration: 60,
    errorMessage:
      "Too many requests from this IP, please try again after 1 minute",
  },
  "rate_limit_global"
);

// 2. Auth Limiter (Login/Register): 20 requests per 10 minutes
const authLimiter = createRateLimiter(
  {
    points: 20,
    duration: 600,
    errorMessage:
      "Too many login/register attempts, please try again after 10 minutes",
    keyGenerator: (req) => req.body.email || req.ip,
  },
  "rate_limit_auth"
);

// 3. OTP Limiter: 3 requests per 1 hour (3600s)
const otpLimiter = createRateLimiter(
  {
    points: 3,
    duration: 3600,
    errorMessage: "Too many OTP requests, please try again after 1 hour",
    keyGenerator: (req) => req.body.to || req.body.email || req.ip,
  },
  "rate_limit_otp"
);

// 4. User Specific Limiter: 100 requests per 1 minute
const userLimiter = createRateLimiter(
  {
    points: 100,
    duration: 60,
    useUserId: true, // Uses req.user._id
    errorMessage: "You have exceeded your request limit. Please slow down.",
  },
  "rate_limit_user"
);

module.exports = {
  globalLimiter,
  authLimiter,
  otpLimiter,
  userLimiter,
};
