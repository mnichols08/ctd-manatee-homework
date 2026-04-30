const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

function sanitizeTask(task) {
  const { userId, ...sanitizedTask } = task;
  return sanitizedTask;
}

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

  const newTask = {
    ...value,
    id: taskCounter(),
    userId: global.user_id.email,
  };

  global.tasks.push(newTask);
  return res.status(StatusCodes.CREATED).json(sanitizeTask(newTask));
};

exports.index = async (req, res) => {
  const userTasks = global.tasks.filter(
    (task) => task.userId === global.user_id.email,
  );

  if (!userTasks.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks were found" });
  }

  const sanitizedTasks = userTasks.map((task) => sanitizeTask(task));
  return res.status(StatusCodes.OK).json(sanitizedTasks);
};

exports.show = async (req, res) => {
  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const task = global.tasks.find(
    (item) => item.id === taskId && item.userId === global.user_id.email,
  );

  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  return res.status(StatusCodes.OK).json(sanitizeTask(task));
};

exports.update = async (req, res) => {
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

  const task = global.tasks.find(
    (item) => item.id === taskId && item.userId === global.user_id.email,
  );
  if (!task) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  Object.assign(task, value);
  return res.status(StatusCodes.OK).json(sanitizeTask(task));
};

exports.deleteTask = async (req, res) => {
  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const taskIndex = global.tasks.findIndex(
    (task) => task.id === taskId && task.userId === global.user_id.email,
  );
  if (taskIndex === -1) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  const taskToDelete = global.tasks[taskIndex];
  global.tasks.splice(taskIndex, 1);
  return res.status(StatusCodes.OK).json(sanitizeTask(taskToDelete));
};
