const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

function parseTaskId(idParam) {
  const taskId = Number.parseInt(idParam, 10);
  if (Number.isNaN(taskId)) {
    return null;
  }

  return taskId;
}

exports.create = async (req, res) => {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted ?? false,
      userId: global.user_id,
    },
    select: { id: true, title: true, isCompleted: true },
  });
  return res.status(StatusCodes.CREATED).json({
    id: task.id,
    title: task.title,
    is_completed: task.isCompleted,
  });
};

exports.index = async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: { title: true, isCompleted: true, id: true },
  });

  if (!tasks.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks were found" });
  }

  return res.status(StatusCodes.OK).json(tasks);
};

exports.show = async (req, res, next) => {
  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.findUnique({
      where: {
        id_userId: {
          id: taskId,
          userId: global.user_id,
        },
      },
      select: { id: true, title: true, isCompleted: true },
    });

    if (!task) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }

    return res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }

    if (typeof next === "function") {
      return next(err);
    }

    throw err;
  }
};

exports.update = async (req, res, next) => {
  if (!req.body) req.body = {};

  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id_userId: {
          id: taskId,
          userId: global.user_id,
        },
      },
      select: { title: true, isCompleted: true, id: true },
    });

    return res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "The task was not found." });
    }

    return next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.delete({
      where: {
        id_userId: {
          id: taskId,
          userId: global.user_id,
        },
      },
      select: { id: true, title: true, isCompleted: true },
    });

    return res.status(StatusCodes.OK).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }

    if (typeof next === "function") {
      return next(err);
    }

    throw err;
  }
};
