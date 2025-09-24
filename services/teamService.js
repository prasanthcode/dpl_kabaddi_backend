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
  const team = await Team.findById(teamId);
  if (!team) throw new Error("Team not found");

  const matches = await Match.find({
    status: "Completed",
    $or: [{ teamA: teamId }, { teamB: teamId }],
  }).populate("teamA teamB", "name logo");

  let wins = 0,
    losses = 0,
    ties = 0,
    matchesPlayed = matches.length,
    highestScore = 0,
    highestWinMargin = 0,
    highestMarginWinMatch = null,
    totalRaidPoints = 0,
    totalTacklePoints = 0;

  for (const match of matches) {
    const isTeamA = match.teamA._id.equals(teamId);
    const teamScore = isTeamA ? match.teamAScore : match.teamBScore;
    const opponentScore = isTeamA ? match.teamBScore : match.teamAScore;

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

    for (const ps of match.playerStats) {
      if (ps.player) {
        const playerDoc = await Player.findById(ps.player, "team");
        if (playerDoc && playerDoc.team.equals(teamId)) {
          totalRaidPoints += ps.raidPoints.reduce((a, b) => a + b, 0);
          totalTacklePoints += ps.defensePoints.reduce((a, b) => a + b, 0);
        }
      }
    }
  }

  return {
    teamId,
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
