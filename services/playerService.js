const { default: mongoose } = require("mongoose");
const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const ErrorResponse = require("../utils/errorResponse");
const {
  replaceImage,
  deleteImageByUrl,
  uploadImageFromBuffer,
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
  const player = await Player.findById(playerId).populate("team", "name logo");
  if (!player) throw new Error("Player not found");

  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  // Aggregate match stats for this player
  const matches = await Match.aggregate([
    { $match: { status: "Completed", "playerStats.player": playerObjectId } },

    // Populate teamA and teamB
    {
      $lookup: {
        from: "teams",
        localField: "teamA",
        foreignField: "_id",
        as: "teamAData",
      },
    },
    { $unwind: "$teamAData" },
    {
      $lookup: {
        from: "teams",
        localField: "teamB",
        foreignField: "_id",
        as: "teamBData",
      },
    },
    { $unwind: "$teamBData" },

    // Unwind playerStats for this player
    { $unwind: "$playerStats" },
    { $match: { "playerStats.player": playerObjectId } },

    // Compute per-match stats
    {
      $addFields: {
        raidPoints: { $sum: "$playerStats.raidPoints" },
        defensePoints: { $sum: "$playerStats.defensePoints" },
        totalPoints: {
          $sum: {
            $sum: ["$playerStats.raidPoints", "$playerStats.defensePoints"],
          },
        },
        super10: {
          $cond: [{ $gte: [{ $sum: "$playerStats.raidPoints" }, 10] }, 1, 0],
        },
        high5: {
          $cond: [{ $gte: [{ $sum: "$playerStats.defensePoints" }, 5] }, 1, 0],
        },
        superRaids: {
          $size: {
            $filter: {
              input: "$playerStats.raidPoints",
              as: "rp",
              cond: { $gte: ["$$rp", 3] },
            },
          },
        },
        opponentTeam: {
          $cond: [
            { $eq: ["$teamA", player.team._id] },
            "$teamBData",
            "$teamAData",
          ],
        },
      },
    },

    // Project the final fields
    {
      $project: {
        matchId: "$_id",
        raidPoints: 1,
        defensePoints: 1,
        totalPoints: 1,
        super10: 1,
        high5: 1,
        superRaids: 1,
        opponentTeam: {
          name: "$opponentTeam.name",
          logo: "$opponentTeam.logo",
        },
      },
    },
  ]);

  // Compute total stats by summing over aggregation results
  const totalStats = matches.reduce(
    (acc, m) => {
      acc.totalRaidPoints += m.raidPoints;
      acc.totalDefensePoints += m.defensePoints;
      acc.totalPoints += m.totalPoints;
      acc.totalSuper10s += m.super10;
      acc.totalHigh5s += m.high5;
      acc.totalSuperRaids += m.superRaids;
      return acc;
    },
    {
      totalRaidPoints: 0,
      totalDefensePoints: 0,
      totalPoints: 0,
      totalSuper10s: 0,
      totalHigh5s: 0,
      totalSuperRaids: 0,
    }
  );

  return {
    playerId,
    name: player.name,
    profilePic: player.profilePic,
    team: { name: player.team.name, logo: player.team.logo },
    totalStats,
    matchStats: matches,
  };
}

async function createPlayer({ name, team, profilePicFile }) {
  let profilePicUrl = null;

  if (profilePicFile) {
    profilePicUrl = await uploadImageFromBuffer(profilePicFile);
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
async function getPlayerPoints(matchId, playerId, type = "raid") {
  if (!["raid", "defense"].includes(type)) {
    throw new ErrorResponse("Type must be 'raid' or 'defense'", 400);
  }

  const match = await Match.findById(matchId).populate("playerStats.player");
  if (!match) throw new ErrorResponse("Match not found", 404);

  const playerStat = match.playerStats.find(
    (ps) => ps.player._id.toString() === playerId
  );

  if (!playerStat) return [];

  return type === "raid" ? playerStat.raidPoints : playerStat.defensePoints;
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
  getPlayerPoints,
};
