const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const pool = require("../db/pg-pool");

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

  const result = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id) VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
    [value.title, value.isCompleted ?? false, global.user_id],
  );
  return res.status(StatusCodes.CREATED).json(result.rows[0]);
};

exports.index = async (req, res) => {
  const tasks = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
    [global.user_id],
  );

  if (!tasks.rows.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks were found" });
  }

  return res.status(StatusCodes.OK).json(tasks.rows);
};

exports.show = async (req, res) => {
  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const result = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE id = $1 AND user_id = $2",
    [taskId, global.user_id],
  );

  if (!result.rows.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  return res.status(StatusCodes.OK).json(result.rows[0]);
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

  let keys = Object.keys(value);
  keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;
  const updatedTask = await pool.query(
    `UPDATE tasks SET ${setClauses} WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
    [...Object.values(value), taskId, global.user_id],
  );

  if (!updatedTask.rows.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  return res.status(StatusCodes.OK).json(updatedTask.rows[0]);
};

exports.deleteTask = async (req, res) => {
  const taskId = parseTaskId(req.params?.id);
  if (taskId === null) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const result = await pool.query(
    "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title, is_completed",
    [taskId, global.user_id],
  );

  if (!result.rows.length) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "That task was not found" });
  }

  return res.status(StatusCodes.OK).json(result.rows[0]);
};
