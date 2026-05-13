const crypto = require("crypto");
const util = require("util");
const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

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

  const { name, email } = value;
  const hashedPassword = await hashPassword(value.password);

  let user = null;
  try {
    user = await prisma.user.create({
      data: { name, email, hashedPassword },
      select: { name: true, email: true, id: true },
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "User already exists" });
    } else {
      return next(err);
    }
  }

  global.user_id = user.id;
  return res.status(StatusCodes.CREATED).json({
    name: user.name,
    email: user.email,
  });
};

exports.logon = async (req, res) => {
  let email = req.body?.email;
  const password = req.body?.password;

  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Email and password are required" });
  }

  email = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

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

  global.user_id = user.id;

  return res.status(StatusCodes.OK).json({
    name: user.name,
    email: user.email,
  });
};

exports.logoff = async (req, res) => {
  global.user_id = null;
  return res.sendStatus(StatusCodes.OK);
};
