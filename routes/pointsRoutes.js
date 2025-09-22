const express = require("express");
const {
  addPointsToOnlyTeam,
  addPoints,
  undoTeamPoints,
  undoPlayerPoints,
} = require("../controllers/pointsController");
const router = express.Router();
router.patch("/player", addPoints);
router.patch("/team", addPointsToOnlyTeam);
router.patch("/player/undo", undoPlayerPoints);
router.patch("/team/undo", undoTeamPoints);

module.exports = router;
