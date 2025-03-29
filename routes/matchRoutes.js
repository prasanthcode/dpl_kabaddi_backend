const express = require("express");
const { getMatches, createMatch, updateMatch, addPoints, getUpcomingMatches, getPlayersOfMatch, addPointsToOnlyTeam, getMatchScores, getCompletedMatches, getOngoingMatches, getMatchStats, getMatchStatsLive, getMatchTotalPoints, getPointsTable, undoPlayerPoints, undoTeamPoints, setMatchCompleted, markMatchHalfTime, getHalfTimeStatus, setHalfTimeStatus, updateTeamMat, getFinalMatchWinner } = require("../controllers/matchController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getMatches);
router.get("/upcoming", getUpcomingMatches);
router.get("/completed", getCompletedMatches);
router.get("/live", getOngoingMatches);
router.get("/players/:matchId", getPlayersOfMatch);
router.post("/", createMatch);
router.put("/:id", updateMatch);
router.post("/addPoints", addPoints);
router.post("/addPointstoteam", addPointsToOnlyTeam);
router.post("/undoPointstoteam", undoTeamPoints);
router.post("/undoPointstoplayer", undoPlayerPoints);
router.get("/matchscores/:matchId", getMatchScores);
router.get("/matchstat/:matchId", getMatchStats);
router.get("/matchstatlive/:matchId", getMatchStatsLive);
router.get("/matchstattotal/:matchId", getMatchTotalPoints);
router.get("/final", getFinalMatchWinner);
router.get("/pointstable", getPointsTable);
router.put("/:matchId/complete", setMatchCompleted);
router.put("/:matchId/halftime", setHalfTimeStatus);
router.put("/matches/:matchId/teammat", updateTeamMat);


module.exports = router;
