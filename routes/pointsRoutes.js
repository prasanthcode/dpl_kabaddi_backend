const express = require("express");
const {
  addPointsToOnlyTeam,
  addPoints,
  undoTeamPoints,
  undoPlayerPoints,
} = require("../controllers/pointsController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const router = express.Router();
router.use(protect, adminOnly);
router.patch("/player", addPoints);
router.patch("/team", addPointsToOnlyTeam);
router.patch("/player/undo", undoPlayerPoints);
router.patch("/team/undo", undoTeamPoints);

module.exports = router;
