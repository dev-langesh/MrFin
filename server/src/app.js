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

const app = express();

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(helmet());
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

app.use("/api", apiRouter);

app.use(errorHandler);

module.exports = { app };
