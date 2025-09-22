const asyncHandler = require("express-async-handler");
const {
  addPointsToTeam,
  addPointsToPlayer,
  removePointsFromTeam,
  undoPlayerPoints,
} = require("../services/pointsService");

exports.addPoints = asyncHandler(async (req, res) => {
  const { matchId, playerId, points, type } = req.body;
  const match = await addPointsToPlayer({ matchId, playerId, points, type });
  res.status(200).json({ message: "Points updated successfully", match });
});

exports.addPointsToOnlyTeam = asyncHandler(async (req, res) => {
  const { matchId, teamId, points } = req.body;
  const match = await addPointsToTeam({ matchId, teamId, points });
  res.status(200).json({ message: "Points updated successfully", match });
});
exports.undoPlayerPoints = asyncHandler(async (req, res) => {
  const { matchId, playerId, type } = req.body;
  const  removedPoint  = await undoPlayerPoints({ matchId, playerId, type });

  res.status(200).json({
    message: `Removed ${removedPoint} point(s) from ${type} of player ${playerId}`,
  });
});
exports.undoTeamPoints = asyncHandler(async (req, res) => {
  const { matchId, teamId, points } = req.body;
  const { match } = await removePointsFromTeam({ matchId, teamId, points });

  res.status(200).json({
    message: `Removed ${points} point(s) from team ${teamId}`,
    match,
  });
});
