const asyncHandler = require("express-async-handler");
const {
  getTopPlayersService,
  getMatchStats,
  getMatchStatsByTeam,
  getMatchTotalPoints,
  getPointsTable,
  getFinalMatchWinners,
  getFullMatchStats,
  getTopTeamsService,
} = require("../services/statsService");
exports.getTopPlayers = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const allowedCategories = [
    "top10TotalPoints",
    "top10RaidPoints",
    "top10Tackles",
    "top10SuperRaids",
    "top5High5s",
    "top5Super10s",
  ];

  if (category && !allowedCategories.includes(category)) {
    return res.status(400).json({
      error: "Invalid category",
      allowedCategories,
    });
  }

  const topPlayers = await getTopPlayersService(category);
  res.json(topPlayers);
});

exports.getTopTeams = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const allowedCategories = [
    "totalPoints",
    "totalRaids",
    "totalDefense",
    "super10s",
    "high5s",
    "superRaids",
    "avgTotalPoints",
    "avgRaids",
    "avgDefense",
  ];

  // Validate category
  if (category && !allowedCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      error: "Invalid category",
      allowedCategories,
    });
  }

  // Fetch leaderboard
  const topTeams = await getTopTeamsService(category);

  res.status(200).json(topTeams);
});
exports.getPointsTable = asyncHandler(async (req, res) => {
  const table = await getPointsTable();
  res.status(200).json(table);
});

exports.getFinalMatchWinner = asyncHandler(async (req, res) => {
  const winners = await getFinalMatchWinners();

  if (!winners) {
    res.status(404);
    throw new Error("No completed final matches found");
  }

  res.status(200).json(winners);
});

exports.getMatchTotalPoints = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const teamStats = await getMatchTotalPoints(matchId);

  if (!teamStats) {
    return res.status(404).json({ message: "Match not found" });
  }

  res.json(teamStats);
});

exports.getMatchStatsLive = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { team } = req.query;

  const stats = await getMatchStatsByTeam(matchId, team);
  res.json(stats);
});
exports.getMatchStats = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const stats = await getMatchStats(matchId);

  if (!stats) {
    res.status(404);
    throw new Error("Match not found");
  }

  res.status(200).json(stats);
});
exports.getFullMatchStats = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const stats = await getFullMatchStats(matchId);

  if (!stats) {
    res.status(404);
    throw new Error("Match not found");
  }

  res.status(200).json(stats);
});
