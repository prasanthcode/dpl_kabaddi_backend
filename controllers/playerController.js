const asyncHandler = require("express-async-handler");

const {
  getPlayersOfMatch,
  getPlayers,
  getPlayerDetails,
  createPlayer,
  getPlayersByTeam,
  deletePlayer,
  bulkInsertPlayers,
  setProfilePic,
  getPlayerById,
  updatePlayer,
  getPlayerPoints,
} = require("../services/playerService");
exports.getPlayerPointsOfMatch = asyncHandler(async (req, res) => {
  const { matchId, playerId } = req.params;
  const { type = "raid" } = req.query;
  const points = await getPlayerPoints(matchId, playerId, type);
  res.status(200).json({ playerId, type, points });
});
exports.getPlayersOfMatch = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const players = await getPlayersOfMatch(matchId);
  res.json(players);
});

exports.getPlayers = asyncHandler(async (req, res) => {
  const { team, order } = req.query;
  const players = await getPlayers({ team, order });
  res.status(200).json(players);
});

exports.getPlayerDetails = asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const result = await getPlayerDetails(playerId);
  res.status(200).json(result);
});

exports.getPlayersByTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const players = await getPlayersByTeam(teamId);
  res.status(200).json(players);
});

exports.createPlayer = asyncHandler(async (req, res) => {
  const { name, team } = req.body;
  const profilePicFile = req.file;

  const newPlayer = await createPlayer({ name, team, profilePicFile });

  res.status(201).json(newPlayer);
});

exports.deletePlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedPlayer = await deletePlayer(id);

  if (!deletedPlayer) {
    return res.status(404).json({ message: "Player not found" });
  }

  res.status(200).json({ message: "Player removed" });
});

exports.setProfilePic = asyncHandler(async (req, res) => {
  const { playerId, profilePic } = req.body;

  if (!playerId || !profilePic) {
    return res
      .status(400)
      .json({ message: "Player ID and profile picture URL are required" });
  }

  const player = await setProfilePic(playerId, profilePic);

  if (!player) {
    return res.status(404).json({ message: "Player not found" });
  }

  res
    .status(200)
    .json({ message: "Profile picture updated successfully", player });
});
exports.bulkPlayer = asyncHandler(async (req, res) => {
  const { players } = req.body;

  if (!players || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ message: "Invalid player data" });
  }

  const insertedPlayers = await bulkInsertPlayers(players);

  res.status(201).json({
    message: "Players added successfully",
    players: insertedPlayers,
  });
});

exports.updatePlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = {
    name: req.body.name,
    team: req.body.team,
    profilePicFile: req.file,
  };

  const updatedPlayer = await updatePlayer(id, updateData);

  res.status(200).json(updatedPlayer);
});

exports.getPlayerById = asyncHandler(async (req, res) => {
  const { playerId } = req.params;
  const player = await getPlayerById(playerId);

  res.json({ player });
});
