const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { corsOptions } = require("./config/corsOptions");
const morgan = require("morgan");
const { env } = require("./config/env");
const { apiRouter } = require("./routes");
const cookieParser = require("cookie-parser");
const { errorHandler } = require("./middleware/errorHandler.middleware");
const mongoSanitize = require("express-mongo-sanitize");
const { globalLimiter } = require("./middleware/rateLimiter.middleware");
const { metricsMiddleware } = require("./middleware/metrics.middleware");
const { register } = require("./lib/metrics/metrics.service");

const app = express();

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(helmet());
app.use(metricsMiddleware);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express 5 workaround: req.query is a getter, make it writable for mongoSanitize
app.use((req, res, next) => {
  if (req.query) {
    const query = req.query;
    try {
      Object.defineProperty(req, "query", {
        value: query,
        writable: true,
        configurable: true,
      });
    } catch (error) {
      console.error("Failed to make req.query writable", error);
    }
  }
  next();
});

app.use(mongoSanitize());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).send(ex);
  }
});

app.use("/api", globalLimiter, apiRouter);

app.use(errorHandler);

module.exports = { app };
