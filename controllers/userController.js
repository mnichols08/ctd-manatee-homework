const crypto = require("crypto");
const util = require("util");
const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
const pool = require("../db/pg-pool");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

exports.register = async (req, res, next) => {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  const hashedPassword = await hashPassword(value.password);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, hashed_password) VALUES ($1, $2, $3) RETURNING id, name, email`,
      [value.name, value.email, hashedPassword],
    );
    global.user_id = result.rows[0].id;
    return res.status(StatusCodes.CREATED).json({
      name: result.rows[0].name,
      email: result.rows[0].email,
    });
  } catch (e) {
    if (e.code === "23505") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "User already exists" });
    }
    return next(e);
  }
};

exports.logon = async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;

  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Email and password are required" });
  }

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (result.rows.length === 0) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid credentials" });
  }

  const isValidPassword = await comparePassword(
    password,
    result.rows[0].hashed_password,
  );
  if (!isValidPassword) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid credentials" });
  }

  global.user_id = result.rows[0].id;

  return res.status(StatusCodes.OK).json({
    name: result.rows[0].name,
    email: result.rows[0].email,
  });
};

exports.logoff = async (req, res) => {
  global.user_id = null;
  return res.sendStatus(StatusCodes.OK);
};
