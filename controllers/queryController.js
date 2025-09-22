const asyncHandler = require("express-async-handler");

const {
  getAllMatches,
  getUpcomingMatches,
  getOngoingMatches,
  getCompletedMatches,
  getMatchScoresById,
} = require("../services/matchQueryService");

exports.getMatches = asyncHandler(async (req, res) => {
  const matches = await getAllMatches();
  res.status(200).json(matches);
});

exports.getUpcomingMatches = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const matches = await getUpcomingMatches(limit);
  res.status(200).json(matches);
});

exports.getCompletedMatches = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const matches = await getCompletedMatches(limit);
  res.status(200).json(matches);
});

exports.getOngoingMatches = asyncHandler(async (req, res) => {
  const matches = await getOngoingMatches();
  res.status(200).json(matches);
});

exports.getMatchScores = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const scores = await getMatchScoresById(matchId);
  res.status(200).json(scores);
});
