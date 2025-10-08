const { default: mongoose } = require("mongoose");
const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const {
  replaceImage,
  deleteImageByUrl,
  uploadImageFromBuffer,
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
    logoUrl = await uploadImageFromBuffer(logoFile);
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
    {
      $lookup: {
        from: "players",
        localField: "playerStats.player",
        foreignField: "_id",
        as: "playerDocs",
      },
    },
    {
      $addFields: {
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
        // Calculate raid points for this team
        totalRaidPoints: {
          $sum: {
            $map: {
              input: "$playerStats",
              as: "ps",
              in: {
                $let: {
                  vars: {
                    playerDoc: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$playerDocs",
                            as: "pd",
                            cond: { $eq: ["$$pd._id", "$$ps.player"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $cond: [
                      { $eq: ["$$playerDoc.team", teamObjectId] },
                      { $sum: "$$ps.raidPoints" },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        // Calculate defense points for this team
        totalTacklePoints: {
          $sum: {
            $map: {
              input: "$playerStats",
              as: "ps",
              in: {
                $let: {
                  vars: {
                    playerDoc: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$playerDocs",
                            as: "pd",
                            cond: { $eq: ["$$pd._id", "$$ps.player"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $cond: [
                      { $eq: ["$$playerDoc.team", teamObjectId] },
                      { $sum: "$$ps.defensePoints" },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        // Enrich playerStats with team info for later processing
        enrichedPlayerStats: {
          $map: {
            input: "$playerStats",
            as: "ps",
            in: {
              $let: {
                vars: {
                  playerDoc: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$playerDocs",
                          as: "pd",
                          cond: { $eq: ["$$pd._id", "$$ps.player"] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  player: "$$ps.player",
                  raidPoints: "$$ps.raidPoints",
                  defensePoints: "$$ps.defensePoints",
                  playerTeam: "$$playerDoc.team",
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        teamScore: 1,
        opponentScore: 1,
        teamA: "$teamAData",
        teamB: "$teamBData",
        teamAScore: 1,
        teamBScore: 1,
        totalRaidPoints: 1,
        totalTacklePoints: 1,
        enrichedPlayerStats: 1,
      },
    },
  ]);

  // Initialize stats
  let wins = 0,
    losses = 0,
    ties = 0,
    highestScore = 0,
    highestWinMargin = 0,
    highestMarginWinMatch = null,
    totalRaidPoints = 0,
    totalTacklePoints = 0,
    totalPoints = 0,
    super10s = 0,
    high5s = 0,
    superRaids = 0,
    matchesPlayed = matches.length;

  for (const match of matches) {
    const { teamScore, opponentScore, enrichedPlayerStats } = match;

    // Wins, losses, ties
    if (teamScore > opponentScore) {
      wins++;
      const margin = teamScore - opponentScore;
      if (margin > highestWinMargin) {
        highestWinMargin = margin;
        highestMarginWinMatch = {
          teamA: match.teamA,
          teamB: match.teamB,
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
    totalPoints +=
      (match.totalRaidPoints || 0) + (match.totalTacklePoints || 0);

    // Super10s, High5s, SuperRaids - only for this team's players
    for (const ps of enrichedPlayerStats || []) {
      if (!ps || !ps.playerTeam || !ps.playerTeam.equals(teamObjectId))
        continue;

      const raidSum = (ps.raidPoints || []).reduce((a, b) => a + b, 0);
      const defenseSum = (ps.defensePoints || []).reduce((a, b) => a + b, 0);

      if (raidSum >= 10) super10s++;
      if (defenseSum >= 5) high5s++;
      if (raidSum >= 8) superRaids++;
    }
  }

  const avgRaid = matchesPlayed ? totalRaidPoints / matchesPlayed : 0;
  const avgDefense = matchesPlayed ? totalTacklePoints / matchesPlayed : 0;
  const avgTotalPoints = matchesPlayed ? totalPoints / matchesPlayed : 0;

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
    totalRaidPoints: Math.round(totalRaidPoints),
    totalTacklePoints: Math.round(totalTacklePoints),
    totalPoints: Math.round(totalPoints),
    super10s,
    high5s,
    superRaids,
    avgRaid: Math.round(avgRaid * 100) / 100,
    avgDefense: Math.round(avgDefense * 100) / 100,
    avgTotalPoints: Math.round(avgTotalPoints * 100) / 100,
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
