const crypto = require("crypto");
const util = require("util");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema");
const prisma = require("../db/prisma");

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = JWT_SECRET;
}

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

const cookieFlags = (req) => {
  const isProd = process.env.NODE_ENV === "production";
  const flags = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "None" : "Lax",
  };
  if (isProd && req && req.hostname) {
    flags.domain = req.hostname;
  }
  return flags;
};

const setJwtCookie = (req, res, user) => {
  const payload = { id: user.id, csrfToken: randomUUID() };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

  if (typeof res.cookie === "function") {
    res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 });
  }

  return payload.csrfToken;
};

exports.register = async (req, res, next) => {
  if (!req.body) req.body = {};

  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  const { name, email } = value;
  const hashedPassword = await hashPassword(value.password);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, hashedPassword },
        select: { id: true, name: true, email: true, createdAt: true },
      });

      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: user.id,
          priority: "medium",
        },
        {
          title: "Add your first task",
          userId: user.id,
          priority: "high",
        },
        {
          title: "Explore the app",
          userId: user.id,
          priority: "low",
        },
      ];

      await tx.task.createMany({ data: welcomeTaskData });

      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: user.id,
          title: { in: welcomeTaskData.map((task) => task.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
        },
      });

      return { user, welcomeTasks };
    });
    const csrfToken = setJwtCookie(req, res, result.user);

    return res.status(StatusCodes.CREATED).json({
      user: result.user,
      name: result.user.name,
      email: result.user.email,
      csrfToken,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Email already registered" });
    }

    if (typeof next === "function") {
      return next(err);
    }

    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "An internal server error occurred." });
  }
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
  const csrfToken = setJwtCookie(req, res, user);

  return res.status(StatusCodes.OK).json({
    name: user.name,
    email: user.email,
    csrfToken,
  });
};

exports.logoff = async (req, res) => {
  const flags = cookieFlags(req);
  if (typeof res.clearCookie === "function") {
    res.clearCookie("jwt", flags);
  } else if (typeof res.cookie === "function") {
    res.cookie("jwt", "", { ...flags, expires: new Date(0) });
  }

  return res.sendStatus(StatusCodes.OK);
};
