const express = require("express");
const {
  create,
  bulkCreate,
  bulkUpdate,
  bulkDelete,
  index,
  show,
  update,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.post("/", create);
router.post("/bulk", bulkCreate);
router.patch("/bulk", bulkUpdate);
router.delete("/bulk", bulkDelete);
router.get("/", index);
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

module.exports = router;
