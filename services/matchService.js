const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const {
  syncMatchToFirebase,
  clearMatchFromFirebase,
} = require("../utils/firebaseUtils");

async function setMatchCompleted(matchId) {
  const updatedMatch = await Match.findByIdAndUpdate(
    matchId,
    { status: "Completed" },
    { new: true }
  ).populate("teamA teamB"); 

  if (!updatedMatch) return null;

  await syncMatchToFirebase(updatedMatch);
  return updatedMatch;
}

async function setHalfTimeStatus(matchId) {
  const updatedMatch = await Match.findByIdAndUpdate(
    matchId,
    { halfTime: true },
    { new: true }
  ).populate("teamA teamB"); 

  if (!updatedMatch) return null;

  await syncMatchToFirebase(updatedMatch);
  return updatedMatch;
}


async function getHalfTimeStatus(matchId) {
  const match = await Match.findById(matchId).select("halfTime");
  if (!match) return null;
  return match.halfTime;
}

async function updateTeamMat(matchId, teamAMat, teamBMat) {
  const updateData = {};
  if (teamAMat !== undefined) updateData.teamAMat = teamAMat;
  if (teamBMat !== undefined) updateData.teamBMat = teamBMat;

  const updatedMatch = await Match.findByIdAndUpdate(matchId, updateData, {
    new: true,
  });

  if (!updatedMatch) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  return updatedMatch;
}

async function createMatch({ teamA, teamB, matchType, date }) {
  const teamAExists = await Team.findById(teamA).select("_id");
  const teamBExists = await Team.findById(teamB).select("_id");

  if (!teamAExists) {
    const error = new Error("Team A not found");
    error.statusCode = 404;
    throw error;
  }

  if (!teamBExists) {
    const error = new Error("Team B not found");
    error.statusCode = 404;
    throw error;
  }

  const latestMatch = await Match.findOne()
    .sort({ matchNumber: -1 })
    .select("matchNumber");
  const nextMatchNumber = latestMatch ? latestMatch.matchNumber + 1 : 1;

  const teamAPlayers = await Player.find({ team: teamA }).select("_id");
  const teamBPlayers = await Player.find({ team: teamB }).select("_id");

  const playerStats = [...teamAPlayers, ...teamBPlayers].map((player) => ({
    player: player._id,
    raidPoints: [],
    defensePoints: [],
  }));

  const newMatch = new Match({
    matchType,
    date,
    matchNumber: nextMatchNumber, // auto assigned
    teamA,
    teamB,
    playerStats,
  });

  await newMatch.save();
  return newMatch;
}

async function updateMatch(matchId, updateData) {
  const existingMatch = await Match.findById(matchId);
  if (!existingMatch) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  const updatedMatch = await Match.findByIdAndUpdate(matchId, updateData, {
    new: true,
  })
    .populate("teamA", "name logo")
    .populate("teamB", "name logo");

  if (existingMatch.status === "Ongoing" && updateData.status === "Completed") {
    await clearMatchFromFirebase(matchId);
  } else {
    await syncMatchToFirebase(updatedMatch);
  }

  return updatedMatch;
}

async function startMatch(matchId) {
  const match = await Match.findById(matchId);
  if (!match) throw new Error("Match not found");

  if (match.status !== "Upcoming") {
    throw new Error("Match cannot be started");
  }

  match.status = "Ongoing";
  await match.save();
  return match;
}

async function endMatch(matchId) {
  const match = await Match.findById(matchId);
  if (!match) throw new Error("Match not found");

  if (match.status !== "Ongoing") {
    throw new Error("Match cannot be ended");
  }

  match.status = "Completed";
  await match.save();
  return match;
}
async function deleteMatch(matchId) {
  const match = await Match.findById(matchId);
  if (!match) throw new Error("Match not found");
  await clearMatchFromFirebase(matchId);

  await match.deleteOne();
  return match;
}

module.exports = {
  setMatchCompleted,
  setHalfTimeStatus,
  getHalfTimeStatus,
  updateTeamMat,
  createMatch,
  updateMatch,
  startMatch,
  endMatch,
  deleteMatch,
};
