const Match = require("../models/Match");
const Player = require("../models/Player");
const { syncMatchToFirebase } = require("../utils/firebaseUtils");

/** ─────────────────────────────
 *  Helper functions
 *  ───────────────────────────── */
function updateTeamScore(match, teamId, points) {
  if (match.teamA.equals(teamId)) {
    match.teamAScore += points;
  } else if (match.teamB.equals(teamId)) {
    match.teamBScore += points;
  } else {
    const error = new Error("Team not part of this match");
    error.statusCode = 400;
    throw error;
  }
}

async function getMatchWithPlayer(matchId, playerId) {
  const match = await Match.findById(matchId)
    .populate("teamA", "name logo")
    .populate("teamB", "name logo")
    .populate("playerStats.player", "team");

  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  const playerStat = match.playerStats.find(
    (stat) => stat.player._id.toString() === playerId
  );
  if (!playerStat) {
    const error = new Error("Player not found in match");
    error.statusCode = 404;
    throw error;
  }

  return { match, playerStat, player: playerStat.player };
}

/** ─────────────────────────────
 *  Main operations
 *  ───────────────────────────── */
async function addPointsToTeam({ matchId, teamId, points }) {
  const match = await Match.findById(matchId)
    .populate("teamA", "name logo")
    .populate("teamB", "name logo");

  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  updateTeamScore(match, teamId, points);

  await match.save();
  await syncMatchToFirebase(match, teamId, points);

  return match;
}

async function addPointsToPlayer({ matchId, playerId, points, type }) {
  const { match, playerStat, player } = await getMatchWithPlayer(matchId, playerId);

  if (type === "defense") playerStat.defensePoints.push(points);
  else if (type === "raid") playerStat.raidPoints.push(points);
  else {
    const error = new Error("Invalid point type. Must be 'raid' or 'defense'");
    error.statusCode = 400;
    throw error;
  }

  updateTeamScore(match, player.team, points);

  await match.save();
  await syncMatchToFirebase(match, player.team, points, type, playerId);

  return {
    teamAScore: match.teamAScore,
    teamBScore: match.teamBScore,
    allRaidPoints: playerStat.raidPoints,
    allDefensePoints: playerStat.defensePoints,
  };
}

async function removePointsFromTeam({ matchId, teamId, points }) {
  const match = await Match.findById(matchId)
    .populate("teamA", "name logo")
    .populate("teamB", "name logo");

  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  updateTeamScore(match, teamId, -points);

  await match.save();
  await syncMatchToFirebase(match);

  return match;
}

async function undoPlayerPoints({ matchId, playerId, type }) {
  const { match, playerStat, player } = await getMatchWithPlayer(matchId, playerId);

  if (type === "raid" && playerStat.raidPoints.length === 0)
    throw new Error("No raid points to remove for this player");
  if (type === "defense" && playerStat.defensePoints.length === 0)
    throw new Error("No defense points to remove for this player");

  let removedPoint;
  if (type === "defense") removedPoint = playerStat.defensePoints.pop();
  else if (type === "raid") removedPoint = playerStat.raidPoints.pop();
  else {
    const error = new Error("Invalid point type. Must be 'raid' or 'defense'");
    error.statusCode = 400;
    throw error;
  }

  if (removedPoint) {
    updateTeamScore(match, player.team, -removedPoint);
  }

  await match.save();
  await syncMatchToFirebase(match);

  return removedPoint;
}

module.exports = {
  addPointsToPlayer,
  undoPlayerPoints,
  addPointsToTeam,
  removePointsFromTeam,
};
