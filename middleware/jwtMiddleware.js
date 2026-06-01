const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = JWT_SECRET;
}

const SEND_401_MESSAGE = { message: "No user is authenticated." };
const WRITE_METHODS = ["POST", "PATCH", "PUT", "DELETE", "CONNECT"];

const send401 = (res) => {
  return res.status(StatusCodes.UNAUTHORIZED).json(SEND_401_MESSAGE);
};

module.exports = async (req, res, next) => {
  const token = req?.cookies?.jwt;
  if (!token) {
    return send401(res);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return send401(res);
    }

    req.user = { id: decoded.id };

    if (WRITE_METHODS.includes(req.method)) {
      const csrfToken =
        req.get?.("X-CSRF-TOKEN") ??
        req.headers?.["x-csrf-token"] ??
        req.headers?.["X-CSRF-TOKEN"];

      if (csrfToken !== decoded.csrfToken) {
        return send401(res);
      }
    }

    return next();
  });
};
