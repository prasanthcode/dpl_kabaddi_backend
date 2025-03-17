const express = require("express");
const { register, login, getProfile } = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register); // Public
router.post("/login", login); // Public
router.get("/profile", protect, getProfile); // Protected route

module.exports = router;
