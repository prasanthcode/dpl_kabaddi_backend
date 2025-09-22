const Match = require("../models/Match");
const Player = require("../models/Player");
const { syncMatchToFirebase } = require("../utils/firebaseUtils");

async function addPointsToTeam({ matchId, teamId, points }) {
  const match = await Match.findById(matchId);
  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  if (match.teamA.equals(teamId)) {
    match.teamAScore += points;
  } else if (match.teamB.equals(teamId)) {
    match.teamBScore += points;
  } else {
    const error = new Error("Team not part of this match");
    error.statusCode = 400;
    throw error;
  }

  await match.save();
  await syncMatchToFirebase(matchId, teamId, points);
  return match;
}

async function addPointsToPlayer({ matchId, playerId, points, type }) {
  const match = await Match.findById(matchId);
  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  const playerStat = match.playerStats.find(
    (stat) => stat.player.toString() === playerId
  );
  if (!playerStat) {
    const error = new Error("Player not found in match");
    error.statusCode = 404;
    throw error;
  }

  const player = await Player.findById(playerId).select("team");
  if (!player) {
    const error = new Error("Player not found in database");
    error.statusCode = 404;
    throw error;
  }

  if (type === "defense") {
    playerStat.defensePoints.push(points);
  } else if (type === "raid") {
    playerStat.raidPoints.push(points);
  } else {
    const error = new Error("Invalid point type. Must be 'raid' or 'defense'");
    error.statusCode = 400;
    throw error;
  }

  if (match.teamA.equals(player.team)) {
    match.teamAScore += points;
  } else if (match.teamB.equals(player.team)) {
    match.teamBScore += points;
  }

  await match.save();
  await syncMatchToFirebase(matchId, player.team, points, type, playerId);

  return {
    teamAScore: match.teamAScore,
    teamBScore: match.teamBScore,
    allRaidPoints: playerStat.raidPoints,
    allDefensePoints: playerStat.defensePoints,
  };
}

async function removePointsFromTeam({ matchId, teamId, points }) {
  const match = await Match.findById(matchId);
  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  if (match.teamA.equals(teamId)) {
    match.teamAScore -= points;
  } else if (match.teamB.equals(teamId)) {
    match.teamBScore -= points;
  } else {
    const error = new Error("Team not part of this match");
    error.statusCode = 400;
    throw error;
  }

  await match.save();
  await syncMatchToFirebase(matchId);

  return match;
}

async function undoPlayerPoints({ matchId, playerId, type }) {
  const match = await Match.findById(matchId);
  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  const playerStat = match.playerStats.find(
    (stat) => stat.player.toString() === playerId
  );
  if (!playerStat) {
    const error = new Error("Player not found in match");
    error.statusCode = 404;
    throw error;
  }

  const player = await Player.findById(playerId).select("team");
  if (!player) {
    const error = new Error("Player not found in database");
    error.statusCode = 404;
    throw error;
  }

  if (
    (type === "raid" && playerStat.raidPoints.length === 0) ||
    (type === "defense" && playerStat.defensePoints.length === 0)
  ) {
    const error = new Error(`No ${type} points to remove for this player`);
    error.statusCode = 400;
    throw error;
  }

  let removedPoint = 0;

  if (type === "defense") {
    removedPoint = playerStat.defensePoints.pop();
  } else if (type === "raid") {
    removedPoint = playerStat.raidPoints.pop();
  } else {
    const error = new Error("Invalid point type. Must be 'raid' or 'defense'");
    error.statusCode = 400;
    throw error;
  }

  if (removedPoint !== undefined) {
    if (match.teamA.equals(player.team)) {
      match.teamAScore -= removedPoint;
    } else if (match.teamB.equals(player.team)) {
      match.teamBScore -= removedPoint;
    }
  }

  await match.save();
  await syncMatchToFirebase(matchId);

  return removedPoint;
}
module.exports = {
  addPointsToPlayer,
  undoPlayerPoints,
  addPointsToTeam,
  removePointsFromTeam,
};
