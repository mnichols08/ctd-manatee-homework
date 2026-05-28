const express = require("express");
const router = express.Router();
const { logon, register, logoff } = require("../controllers/userController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

router.post("/register", register);
router.post("/logon", logon);
router.post("/logoff", jwtMiddleware, logoff);

module.exports = router;
