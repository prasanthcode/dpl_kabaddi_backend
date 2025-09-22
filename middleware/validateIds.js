const mongoose = require("mongoose");
const Player = require("../models/Player");
const Match = require("../models/Match");
const Team = require("../models/Team");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const validatePlayerId = async (req, res, next) => {
  const { playerId } = req.params;
  if (!isValidObjectId(playerId)) {
    return res.status(400).json({ message: "Invalid Player ID format" });
  }

  const player = await Player.findById(playerId);
  if (!player) {
    return res.status(404).json({ message: "Player not found" });
  }

  req.player = player;
  next();
};

const validateMatchId = async (req, res, next) => {
  const { matchId } = req.params;
  if (!isValidObjectId(matchId)) {
    return res.status(400).json({ message: "Invalid Match ID format" });
  }

  const match = await Match.findById(matchId);
  if (!match) {
    return res.status(404).json({ message: "Match not found" });
  }

  req.match = match;
  next();
};

const validateTeamId = async (req, res, next) => {
  const { teamId } = req.params;
  if (!isValidObjectId(teamId)) {
    return res.status(400).json({ message: "Invalid Team ID format" });
  }

  const team = await Team.findById(teamId);
  if (!team) {
    return res.status(404).json({ message: "Team not found" });
  }

  req.team = team;
  next();
};

module.exports = {
  validatePlayerId,
  validateMatchId,
  validateTeamId,
};
