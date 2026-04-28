const crypto = require("crypto");
const util = require("util");
const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");

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

exports.register = async (req, res) => {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: error.message });
  }

  const existingUser = global.users.find((user) => user.email === value.email);
  if (existingUser) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "User already exists" });
  }

  const hashedPassword = await hashPassword(value.password);
  const newUser = {
    name: value.name,
    email: value.email,
    hashedPassword,
  };

  global.users.push(newUser);
  global.user_id = newUser;

  return res.status(StatusCodes.CREATED).json({
    name: newUser.name,
    email: newUser.email,
  });
};

exports.logon = async (req, res) => {
  const email = req.body?.email;
  const password = req.body?.password;

  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Email and password are required" });
  }

  const user = global.users.find((u) => u.email === String(email).toLowerCase());
  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid credentials" });
  }

  const isValidPassword = await comparePassword(password, user.hashedPassword);
  if (!isValidPassword) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Invalid credentials" });
  }

  global.user_id = user;

  return res.status(StatusCodes.OK).json({
    name: user.name,
    email: user.email,
  });
};

exports.logoff = async (req, res) => {
  global.user_id = null;
  return res.sendStatus(StatusCodes.OK);
};
