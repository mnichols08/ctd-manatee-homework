const { StatusCodes } = require("http-status-codes");

const errorHandlerMiddleware = (err, req, res, next) => {
  if (err.code === "ECONNREFUSED" && err.port === 5432) {
    console.error("Database connection refused:", err.message);
    if (!res.headersSent) {
      return res
        .status(StatusCodes.SERVICE_UNAVAILABLE)
        .json({ message: "Database connection refused." });
    }
  }

  console.error(
    "Internal server error: ",
    err.constructor.name,
    JSON.stringify(err, ["name", "message", "stack"]),
  );

  if (!res.headersSent) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
};

module.exports = errorHandlerMiddleware;
