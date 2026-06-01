const express = require("express");
const {
  create,
  bulkCreate,
  index,
  show,
  update,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.post("/", create);
router.post("/bulk", bulkCreate);
router.get("/", index);
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

module.exports = router;
