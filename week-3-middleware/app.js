const express = require("express");
const path = require("path");
const dogsRouter = require("./routes/dogs");
const {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} = require("./errors");

const app = express();

const createRequestId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

app.use((req, res, next) => {
  req.requestId = createRequestId();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]: ${req.method} ${req.path} (${req.requestId})`);
  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (req.method === "POST") {
    const contentType = req.get("Content-Type");
    if (
      !contentType ||
      !contentType.toLowerCase().includes("application/json")
    ) {
      return res.status(400).json({
        error: "Content-Type must be application/json",
        requestId: req.requestId,
      });
    }
  }

  next();
});

app.use("/images", express.static(path.join(__dirname, "../public/images")));

app.use("/", dogsRouter); // Do not remove this line

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let errorName = "Error";
  let message = "Internal Server Error";

  if (error instanceof ValidationError) {
    statusCode = 400;
    errorName = "ValidationError";
    message = error.message;
  } else if (error instanceof NotFoundError) {
    statusCode = 404;
    errorName = "NotFoundError";
    message = error.message;
  } else if (error instanceof UnauthorizedError) {
    statusCode = 401;
    errorName = "UnauthorizedError";
    message = error.message;
  }

  if (statusCode >= 400 && statusCode < 500) {
    console.warn(`WARN: ${errorName} ${message}`);
  } else {
    console.error(`ERROR: Error ${error.message || "Internal Server Error"}`);
  }

  return res.status(statusCode).json({
    error: message,
    requestId: req.requestId,
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestId: req.requestId,
  });
});

const server = app.listen(3000, () =>
  console.log("Server listening on port 3000"),
);
module.exports = server;
