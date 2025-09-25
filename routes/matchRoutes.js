const express = require("express");
const {
  createMatch,
  updateMatch,
  setHalfTimeStatus,
  updateTeamMat,
  endMatch,
  startMatch,
  getMatch,
  deleteMatch,
} = require("../controllers/matchController");
const {
  getMatches,
  getUpcomingMatches,
  getCompletedMatches,
  getOngoingMatches,
  getMatchScores,
} = require("../controllers/queryController");
const {
  getMatchStats,
  getMatchStatsLive,
  getMatchTotalPoints,
  getPointsTable,
  getFinalMatchWinner,
  getFullMatchStats,
} = require("../controllers/statsController");

const { getPlayersOfMatch, getPlayerPointsOfMatch } = require("../controllers/playerController");
const { getActiveConnections } = require("../controllers/firebaseController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/pointstable", getPointsTable);
router.get("/final", getFinalMatchWinner);
router.get("/active-connections", getActiveConnections);
router.get("/", getMatches);
router.get("/upcoming", getUpcomingMatches);
router.get("/completed", getCompletedMatches);
router.get("/live", getOngoingMatches);
router.get("/players/:matchId", getPlayersOfMatch);
router.get("/:matchId", getMatch);
router.get("/:matchId/scores", getMatchScores); //26 30
router.get("/:matchId/stats/live", getMatchStatsLive);
router.get("/:matchId/stats/total", getMatchTotalPoints);
router.get("/:matchId/stats", getMatchStats);
router.get("/:matchId/fullstats", getFullMatchStats);
router.get("/:matchId/player/:playerId/sequence",getPlayerPointsOfMatch)
router.use(protect, adminOnly);
router.post("/", createMatch);
router.patch("/:id", updateMatch);
router.delete("/:matchId", deleteMatch);
router.patch("/:matchId/start", startMatch);
router.patch("/:matchId/complete", endMatch);
router.patch("/:matchId/halftime", setHalfTimeStatus);
router.patch("/:matchId/teammat", updateTeamMat);

module.exports = router;
