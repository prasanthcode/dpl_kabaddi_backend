const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const {
  syncMatchToFirebase,
  clearMatchFromFirebase,
} = require("../utils/firebaseUtils");

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
    await clearMatchFromFirebase();
    await syncMatchToFirebase(updatedMatch);
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
  const match = await Match.findById(matchId)
    .populate("teamA teamB")
    .select("-playerStats");
  if (!match) throw new Error("Match not found");

  if (match.status !== "Ongoing") {
    throw new Error("Match cannot be ended");
  }

  match.status = "Completed";
  await match.save();
  await clearMatchFromFirebase();
  await syncMatchToFirebase(match);
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
  setHalfTimeStatus,
  createMatch,
  updateMatch,
  startMatch,
  endMatch,
  deleteMatch,
};
