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

    global.user_id = result.user.id;

    return res.status(StatusCodes.CREATED).json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Email already registered" });
    }

    return next(err);
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
