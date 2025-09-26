const { default: mongoose } = require("mongoose");
const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const {
  replaceImage,
  uploadImageFromFile,
  deleteImageByUrl,
} = require("./imageService");

async function getTeams() {
  const teams = await Team.find({}, "_id name logo").sort({ name: 1 });

  return teams;
}

async function getTeamById(teamId) {
  const team = await Team.findById(teamId);
  if (!team) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }
  return team;
}

async function createTeam({ name, logoFile }) {
  let logoUrl = null;

  if (logoFile) {
    logoUrl = await uploadImageFromFile(logoFile);
  }

  const newTeam = new Team({
    name,
    logo: logoUrl,
  });

  await newTeam.save();
  return newTeam;
}

async function deleteTeam(teamId) {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error("Team not found");
  }

  if (team.logoUrl) {
    await deleteImageByUrl(team.logoUrl);
  }

  await team.deleteOne();

  return { message: "Team and logo deleted successfully" };
}

async function updateTeam(teamId, updateData) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error("Team not found");

  if (updateData.name) {
    team.name = updateData.name;
  }

  if (updateData.logoFile) {
    team.logo = await replaceImage(team.logo, updateData.logoFile);
  }

  await team.save();
  return team;
}

async function getTeamNameById(teamId) {
  if (!teamId) return null;
  try {
    const team = await Team.findById(teamId).select("name");
    return team ? team.name : null;
  } catch (err) {
    console.error("Error fetching team name:", err);
    return null;
  }
}

async function teamStats(teamId) {
  const team = await Team.findById(teamId, "name logo");
  if (!team) throw new Error("Team not found");

  const teamObjectId = new mongoose.Types.ObjectId(teamId);

  // Aggregate matches
  const matches = await Match.aggregate([
    {
      $match: {
        status: "Completed",
        $or: [{ teamA: teamObjectId }, { teamB: teamObjectId }],
      },
    },

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

    // Unwind playerStats
    { $unwind: { path: "$playerStats", preserveNullAndEmptyArrays: true } },

    // Lookup player to get their team
    {
      $lookup: {
        from: "players",
        localField: "playerStats.player",
        foreignField: "_id",
        as: "playerDoc",
      },
    },
    { $unwind: { path: "$playerDoc", preserveNullAndEmptyArrays: true } },

    // Compute raid and tackle points only for players in the given team
    {
      $addFields: {
        raidPointsForTeam: {
          $cond: [
            { $eq: ["$playerDoc.team", teamObjectId] },
            { $sum: "$playerStats.raidPoints" },
            0,
          ],
        },
        tacklePointsForTeam: {
          $cond: [
            { $eq: ["$playerDoc.team", teamObjectId] },
            { $sum: "$playerStats.defensePoints" },
            0,
          ],
        },
        teamScore: {
          $cond: [
            { $eq: ["$teamA", teamObjectId] },
            "$teamAScore",
            "$teamBScore",
          ],
        },
        opponentScore: {
          $cond: [
            { $eq: ["$teamA", teamObjectId] },
            "$teamBScore",
            "$teamAScore",
          ],
        },
        teamA: "$teamAData",
        teamB: "$teamBData",
      },
    },

    // Group back by match to sum player points
    {
      $group: {
        _id: "$_id",
        teamScore: { $first: "$teamScore" },
        opponentScore: { $first: "$opponentScore" },
        teamA: { $first: "$teamA" },
        teamB: { $first: "$teamB" },
        teamAScore: { $first: "$teamAScore" },
        teamBScore: { $first: "$teamBScore" },
        totalRaidPoints: { $sum: "$raidPointsForTeam" },
        totalTacklePoints: { $sum: "$tacklePointsForTeam" },
      },
    },
  ]);

  // Compute overall stats
  let wins = 0,
    losses = 0,
    ties = 0,
    highestScore = 0,
    highestWinMargin = 0,
    highestMarginWinMatch = null,
    totalRaidPoints = 0,
    totalTacklePoints = 0,
    matchesPlayed = matches.length;

  for (const match of matches) {
    const { teamScore, opponentScore } = match;

    if (teamScore > opponentScore) {
      wins++;
      const margin = teamScore - opponentScore;
      if (margin > highestWinMargin) {
        highestWinMargin = margin;
        highestMarginWinMatch = {
          teamA: { name: match.teamA.name, logo: match.teamA.logo },
          teamB: { name: match.teamB.name, logo: match.teamB.logo },
          teamAScore: match.teamAScore,
          teamBScore: match.teamBScore,
        };
      }
    } else if (teamScore < opponentScore) {
      losses++;
    } else {
      ties++;
    }

    if (teamScore > highestScore) highestScore = teamScore;

    totalRaidPoints += match.totalRaidPoints || 0;
    totalTacklePoints += match.totalTacklePoints || 0;
  }

  return {
    teamId: teamId.toString(),
    teamName: team.name,
    teamLogo: team.logo,
    matchesPlayed,
    wins,
    losses,
    ties,
    highestScore,
    highestWinMargin,
    highestMarginWinMatch,
    totalRaidPoints,
    totalTacklePoints,
  };
}

module.exports = {
  getTeams,
  deleteTeam,
  createTeam,
  updateTeam,
  getTeamById,
  getTeamNameById,
  teamStats,
};
