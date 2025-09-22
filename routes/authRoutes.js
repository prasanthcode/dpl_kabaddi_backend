const express = require("express");
const {
  register,
  getProfile,
  getToken,
  refreshToken,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.get("/profile", protect, getProfile);
router.post("/token", getToken);
router.post("/token/refresh", refreshToken);

module.exports = router;
