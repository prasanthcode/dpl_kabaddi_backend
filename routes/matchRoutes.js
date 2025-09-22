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

const { getPlayersOfMatch } = require("../controllers/playerController");
const { getActiveConnections } = require("../controllers/firebaseController");

const router = express.Router();

router.get("/pointstable", getPointsTable);
router.get("/final", getFinalMatchWinner);
router.get("/active-connections", getActiveConnections);
router.get("/", getMatches);
router.get("/upcoming", getUpcomingMatches);
router.get("/completed", getCompletedMatches);
router.get("/live", getOngoingMatches);
router.get("/players/:matchId", getPlayersOfMatch);
router.post("/", createMatch);
router.patch("/:id", updateMatch);
router.get("/:matchId", getMatch);
router.delete("/:matchId", deleteMatch);
router.patch("/:matchId/start", startMatch);
router.patch("/:matchId/complete", endMatch);
router.patch("/:matchId/halftime", setHalfTimeStatus);
router.patch("/:matchId/teammat", updateTeamMat);
router.get("/:matchId/scores", getMatchScores); //26 30
router.get("/:matchId/stats/live", getMatchStatsLive);
router.get("/:matchId/stats/total", getMatchTotalPoints);
router.get("/:matchId/stats", getMatchStats);
router.get("/:matchId/fullstats", getFullMatchStats);

module.exports = router;
