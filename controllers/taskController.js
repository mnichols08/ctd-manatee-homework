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
      priority: value.priority ?? "medium",
      userId: global.user_id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      userId: true,
    },
  });
  return res.status(StatusCodes.CREATED).json({
    id: task.id,
    title: task.title,
    is_completed: task.isCompleted,
    isCompleted: task.isCompleted,
    priority: task.priority,
    userId: task.userId,
  });
};

exports.index = async (req, res) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 10;
  if (page < 1 || limit < 1 || limit > 100) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Invalid pagination parameters. page must be >= 1 and limit must be 1-100.",
    });
  }

  const skip = (page - 1) * limit;
  const whereClause = { userId: global.user_id };

  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find,
      mode: "insensitive",
    };
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  const pages = Math.ceil(totalTasks / limit);
  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages,
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  return res.status(StatusCodes.OK).json({
    tasks,
    pagination,
  });
};

exports.show = async (req, res) => {
  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const task = await prisma.task.findUnique({
    where: {
      id_userId: {
        id: taskId,
        userId: global.user_id,
      },
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true,
      User: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!task) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "The task was not found." });
  }

  return res.status(StatusCodes.OK).json(task);
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
      select: { title: true, isCompleted: true, id: true, priority: true },
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

exports.bulkCreate = async (req, res, next) => {
  const { tasks } = req.body || {};

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task, { abortEarly: false });
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Validation failed",
        details: error.details,
      });
    }

    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted ?? false,
      priority: value.priority ?? "medium",
      userId: global.user_id,
    });
  }

  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    return res.status(StatusCodes.CREATED).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
};
