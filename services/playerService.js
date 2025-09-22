const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const {
  replaceImage,
  uploadImageFromFile,
  deleteImageByUrl,
} = require("./imageService");

async function getPlayersOfMatch(matchId) {
  const match = await Match.findById(matchId);
  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  const { teamA, teamB } = match;

  const teamAInfo = await Team.findById(teamA).select("_id name");
  const teamBInfo = await Team.findById(teamB).select("_id name");

  if (!teamAInfo || !teamBInfo) {
    const error = new Error("One or both teams not found");
    error.statusCode = 404;
    throw error;
  }

  const teamAPlayers = await Player.find({ team: teamA }).select("_id name");
  const teamBPlayers = await Player.find({ team: teamB }).select("_id name");

  return {
    matchId,
    teamA: {
      id: teamAInfo._id,
      name: teamAInfo.name,
      players: teamAPlayers,
    },
    teamB: {
      id: teamBInfo._id,
      name: teamBInfo.name,
      players: teamBPlayers,
    },
  };
}

async function getPlayers({ team, order }) {
  let query = Player.find();

  if (team) {
    query = query.where("team").equals(team);
  }

  query = query
    .populate({
      path: "team",
      select: "name",
    })
    .select("name team profilePic");

  if (order) {
    const sortOrder = order.toLowerCase() === "desc" ? -1 : 1;
    query = query.sort({ name: sortOrder });
  }

  return await query.exec();
}

async function getPlayerById(playerId) {
  const player = await Player.findById(playerId).populate("team", "name");
  if (!player) {
    const error = new Error("Player not found");
    error.statusCode = 404;
    throw error;
  }
  return player;
}

async function updatePlayer(playerId, updateData) {
  const player = await Player.findById(playerId);
  if (!player) throw new Error("Player not found");

  if (updateData.name) {
    player.name = updateData.name;
  }

  if (updateData.team) {
    player.team = updateData.team;
  }

  if (updateData.profilePicFile) {
    player.profilePic = await replaceImage(
      player.profilePic,
      updateData.profilePicFile
    );
  }

  await player.save();
  return player;
}

async function getPlayerDetails(playerId) {
  const player = await Player.findById(playerId).populate("team");
  if (!player) throw new Error("Player not found");

  const matches = await Match.find({
    "playerStats.player": playerId,
    status: "Completed",
  })
    .populate("teamA teamB")
    .lean();

  let matchStats = [];
  let totalRaidPoints = 0,
    totalDefensePoints = 0,
    totalPoints = 0,
    totalSuper10s = 0,
    totalHigh5s = 0,
    totalSuperRaids = 0;

  matches.forEach((match) => {
    const playerStats = match.playerStats.find(
      (p) => p.player.toString() === playerId
    );
    if (!playerStats) return;

    const raidPoints = playerStats.raidPoints.reduce((a, b) => a + b, 0);
    const defensePoints = playerStats.defensePoints.reduce((a, b) => a + b, 0);
    const matchTotalPoints = raidPoints + defensePoints;

    const super10 = raidPoints >= 10 ? 1 : 0;
    const high5 = defensePoints >= 5 ? 1 : 0;
    const superRaids = playerStats.raidPoints.filter((rp) => rp >= 3).length;

    totalRaidPoints += raidPoints;
    totalDefensePoints += defensePoints;
    totalPoints += matchTotalPoints;
    totalSuper10s += super10;
    totalHigh5s += high5;
    totalSuperRaids += superRaids;

    const opponent =
      match.teamA._id.toString() === player.team._id.toString()
        ? match.teamB
        : match.teamA;

    matchStats.push({
      matchId: match._id,
      opponentTeam: { name: opponent.name, logo: opponent.logo },
      raidPoints,
      defensePoints,
      totalPoints: matchTotalPoints,
      super10,
      high5,
      superRaids,
    });
  });

  return {
    playerId,
    name: player.name,
    profilePic: player.profilePic,
    team: { name: player.team.name, logo: player.team.logo },
    totalStats: {
      totalRaidPoints,
      totalDefensePoints,
      totalPoints,
      totalSuper10s,
      totalHigh5s,
      totalSuperRaids,
    },
    matchStats,
  };
}

async function createPlayer({ name, team, profilePicFile }) {
  let profilePicUrl = null;

  if (profilePicFile) {
    profilePicUrl = await uploadImageFromFile(profilePicFile);
  }

  const newPlayer = new Player({
    name,
    team,
    profilePic: profilePicUrl,
  });

  await newPlayer.save();
  return newPlayer;
}

async function getPlayersByTeam(teamId) {
  const players = await Player.find({ team: teamId })
    .populate("team", "name")
    .select("name profilePic order _id")
    .sort({ order: 1 });
  return players;
}

async function deletePlayer(playerId) {
  const player = await Player.findById(playerId);

  if (!player) {
    throw new Error("Player not found");
  }

  if (player.profilePic) {
    await deleteImageByUrl(player.profilePic);
  }

  await Player.findByIdAndDelete(playerId);

  return { message: "Player and profile pic deleted" };
}

async function setProfilePic(playerId, profilePic) {
  const player = await Player.findByIdAndUpdate(
    playerId,
    { profilePic },
    { new: true, runValidators: true }
  );
  return player;
}

async function bulkInsertPlayers(players) {
  const insertedPlayers = await Player.insertMany(players);
  return insertedPlayers;
}

async function getPlayerNameById(playerId) {
  if (!playerId) return null;
  try {
    const player = await Player.findById(playerId).select("name");
    return player ? player.name : null;
  } catch (err) {
    console.error("Error fetching player name:", err);
    return null;
  }
}

module.exports = {
  getPlayersOfMatch,
  getPlayers,
  getPlayerDetails,
  createPlayer,
  getPlayersByTeam,
  deletePlayer,
  setProfilePic,
  bulkInsertPlayers,
  getPlayerById,
  updatePlayer,
  getPlayerNameById,
};
