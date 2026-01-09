const client = require("prom-client");

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "MrFin-server",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Define custom metrics

// HTTP Request Duration Histogram
const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5], // Define buckets for duration in seconds
});

// Active Requests Gauge
const httpRequestsActive = new client.Gauge({
  name: "http_requests_active",
  help: "Number of active HTTP requests",
  labelNames: ["method", "route"],
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsActive);

module.exports = {
  register,
  httpRequestDurationMicroseconds,
  httpRequestsActive,
};
