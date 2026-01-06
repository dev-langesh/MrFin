const responseTime = require("response-time");
const {
  httpRequestDurationMicroseconds,
  httpRequestsActive,
} = require("../lib/metrics/metrics.service");

// Middleware to normalize routes to avoid high cardinality
// e.g., /api/users/123 -> /api/users/:id
const normalizeRoute = (req) => {
  const route = req.route ? req.route.path : "";
  const baseUrl = req.baseUrl || "";

  // If no route matched (404), return "not_found" to avoid high cardinality
  if (!route) {
    return "not_found";
  }

  // Combine baseUrl and route path
  // Remove trailing slash if present (except for root)
  let fullPath = (baseUrl + route).replace(/\/$/, "") || "/";
  return fullPath;
};

const metricsMiddleware = responseTime((req, res, time) => {
  const normalizePath = normalizeRoute(req);

  // Convert time from ms to seconds
  const durationInSeconds = time / 1000;

  httpRequestDurationMicroseconds.observe(
    {
      method: req.method,
      route: normalizePath,
      status_code: res.statusCode,
    },
    durationInSeconds
  );
});

// Wrap responseTime with active request tracking
const wrappedMetricsMiddleware = (req, res, next) => {
  const normalizePath = normalizeRoute(req);

  // Increment active requests
  httpRequestsActive.inc({ method: req.method, route: normalizePath });

  // Decrement on finish
  res.on("finish", () => {
    httpRequestsActive.dec({ method: req.method, route: normalizePath });
  });

  metricsMiddleware(req, res, next);
};

module.exports = { metricsMiddleware: wrappedMetricsMiddleware };
