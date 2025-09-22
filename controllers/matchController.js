const asyncHandler = require("express-async-handler");
const {
  setHalfTimeStatus,
  setMatchCompleted,
  getHalfTimeStatus,
  updateTeamMat,
  updateMatch,
  startMatch,
  endMatch,
  createMatch,
  deleteMatch,
} = require("../services/matchService");
const { getMatch } = require("../services/matchQueryService");

exports.startMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const match = await startMatch(matchId);

  res.json({ message: "Match started", match });
});

exports.endMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const match = await endMatch(matchId);

  res.json({ message: "Match ended", match });
});

exports.setMatchCompleted = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const updatedMatch = await setMatchCompleted(matchId);

  if (!updatedMatch) {
    res.status(404);
    throw new Error("Match not found");
  }

  res.status(200).json(updatedMatch);
});

exports.setHalfTimeStatus = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const updatedMatch = await setHalfTimeStatus(matchId);

  if (!updatedMatch) {
    res.status(404);
    throw new Error("Match not found");
  }

  res.status(200).json({
    message: "Half Time status updated",
    match: updatedMatch,
  });
});

exports.getHalfTimeStatus = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const halfTime = await getHalfTimeStatus(matchId);

  if (halfTime === null) {
    return res.status(404).json({ error: "Match not found" });
  }

  res.json({ halfTime });
});
exports.updateTeamMat = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { teamAMat, teamBMat } = req.body;

  const updatedMatch = await updateTeamMat(matchId, teamAMat, teamBMat);
  res.json({
    message: "Updated team mat players successfully",
    match: updatedMatch,
  });
});

exports.createMatch = asyncHandler(async (req, res) => {
  const { teamA, teamB, matchType, date } = req.body;

  await createMatch({
    teamA,
    teamB,
    matchType,
    date,
  });
  res.status(201).json({ message: "Match created successfully" });
});

exports.updateMatch = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedMatch = await updateMatch(id, req.body);
  res.status(200).json(updatedMatch);
});

exports.deleteMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  await deleteMatch(matchId);

  res.json({ message: "Match deleted" });
});
exports.getMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const match = await getMatch(matchId);

  res.json({ match });
});
