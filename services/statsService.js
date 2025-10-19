const { Types } = require("mongoose");
const ObjectId = Types.ObjectId;
const Match = require("../models/Match");
const Team = require("../models/Team");
const { sumArray, getTopN } = require("../utils/arrayUtils");
const { getPublicIdFromUrl } = require("./imageService");

async function getRankedLeaderboard(statName, statCalculation, limit) {
  const sortByField = Object.keys(statCalculation)[0];

  return await Match.aggregate([
    { $match: { status: "Completed" } },

    { $unwind: "$playerStats" },

    {
      $group: {
        _id: "$playerStats.player",
        ...statCalculation,
      },
    },

    { $sort: { [sortByField]: -1 } },

    { $match: { [sortByField]: { $gt: 0 } } },

    { $limit: limit },

    {
      $setWindowFields: {
        sortBy: { [sortByField]: -1 },
        output: {
          rank: { $rank: {} },
        },
      },
    },

    {
      $lookup: {
        from: "players",
        localField: "_id",
        foreignField: "_id",
        as: "playerInfo",
      },
    },
    { $unwind: "$playerInfo" },
    {
      $lookup: {
        from: "teams",
        localField: "playerInfo.team",
        foreignField: "_id",
        as: "teamInfo",
      },
    },
    { $unwind: "$teamInfo" },

    {
      $project: {
        _id: 0,
        rank: 1,
        playerId: "$_id",
        name: "$playerInfo.name",
        team: "$teamInfo.name",
        teamLogo: "$teamInfo.logo",
        profilePic: "$playerInfo.profilePic",
        points: `$${sortByField}`,
      },
    },
  ]);
}

async function getTopPlayersService(category = null) {
  const calculations = {
    top10TotalPoints: {
      totalPoints: {
        $sum: {
          $add: [
            { $sum: "$playerStats.raidPoints" },
            { $sum: "$playerStats.defensePoints" },
          ],
        },
      },
    },
    top10RaidPoints: {
      totalRaidPoints: { $sum: { $sum: "$playerStats.raidPoints" } },
    },
    top10Tackles: {
      totalDefensePoints: { $sum: { $sum: "$playerStats.defensePoints" } },
    },
    top10SuperRaids: {
      superRaids: {
        $sum: {
          $size: {
            $filter: {
              input: "$playerStats.raidPoints",
              as: "raid",
              cond: { $gte: ["$$raid", 3] },
            },
          },
        },
      },
    },
    top5High5s: {
      high5s: {
        $sum: {
          $cond: [{ $gte: [{ $sum: "$playerStats.defensePoints" }, 5] }, 1, 0],
        },
      },
    },
    top5Super10s: {
      super10s: {
        $sum: {
          $cond: [{ $gte: [{ $sum: "$playerStats.raidPoints" }, 10] }, 1, 0],
        },
      },
    },
  };

  const leaderboards = {
    top10TotalPoints: ["totalPoints", calculations.top10TotalPoints, 10],
    top10RaidPoints: ["totalRaidPoints", calculations.top10RaidPoints, 10],
    top10Tackles: ["totalDefensePoints", calculations.top10Tackles, 10],
    top10SuperRaids: ["superRaids", calculations.top10SuperRaids, 10],
    top5High5s: ["high5s", calculations.top5High5s, 5],
    top5Super10s: ["super10s", calculations.top5Super10s, 5],
  };

  let result;

  if (category && leaderboards[category]) {
    const [field, calc, limit] = leaderboards[category];
    const data = await getRankedLeaderboard(field, calc, limit);
    result = { [category]: data };
  } else {
    const results = await Promise.all(
      Object.entries(leaderboards).map(([key, [field, calc, limit]]) =>
        getRankedLeaderboard(field, calc, limit).then((data) => [key, data])
      )
    );
    result = Object.fromEntries(results);
  }

  return result;
}

async function fetchMatchFromDB(matchId) {
  return await Match.findById(matchId)
    .populate({ path: "teamA", select: "name logo" })
    .populate({ path: "teamB", select: "name logo" })
    .populate({
      path: "playerStats.player",
      select: "name team",
      populate: { path: "team", select: "name" },
    })
    .lean();
}

function calculateMatchStats(match) {
  let teamTotals = { A: { raid: 0, defense: 0 }, B: { raid: 0, defense: 0 } };
  let raiders = [],
    defenders = [];

  match.playerStats.forEach(({ player, raidPoints, defensePoints }) => {
    const raid = sumArray(raidPoints);
    const defense = sumArray(defensePoints);
    const playerData = { name: player.name, team: player.team.name };

    raiders.push({ ...playerData, totalRaidPoints: raid });
    defenders.push({ ...playerData, totalDefensePoints: defense });

    const teamKey = player.team.name === match.teamA.name ? "A" : "B";
    teamTotals[teamKey].raid += raid;
    teamTotals[teamKey].defense += defense;
  });

  return {
    teamA: { ...match.teamA, score: match.teamAScore, ...teamTotals.A },
    teamB: { ...match.teamB, score: match.teamBScore, ...teamTotals.B },
    topRaiders: getTopN(raiders, "totalRaidPoints"),
    topDefenders: getTopN(defenders, "totalDefensePoints"),
  };
}

async function getMatchStats(matchId) {
  const match = await fetchMatchFromDB(matchId);
  if (!match) return null;

  const result = calculateMatchStats(match);

  return result;
}

async function getPointsTable() {
  const allTeams = await Team.find({}, "name logo");

  const pointsTable = {};
  for (const team of allTeams) {
    pointsTable[team._id] = {
      teamId: team._id,
      teamName: team.name,
      logo: team.logo,
      wins: 0,
      losses: 0,
      ties: 0,
      matchesPlayed: 0,
      pointsDifference: 0,
      points: 0,
      finalWinner: false,
      qualifier: false,
      lastThreeMatches: [],
    };
  }

  const allMatches = await Match.find({ status: "Completed" })
    .populate("teamA teamB", "name")
    .sort({ date: -1 });

  const isLeagueMatch = (matchType) =>
    !matchType || matchType === "" || matchType === "Regular";

  let totalLeagueMatches = 0;
  let completedLeagueMatches = 0;

  for (const match of allMatches) {
    if (!match.teamA || !match.teamB) continue;
    const { teamA, teamB, teamAScore, teamBScore, matchType } = match;

    if (isLeagueMatch(matchType)) {
      totalLeagueMatches++;
      completedLeagueMatches++;

      const teamAStats = pointsTable[teamA._id];
      const teamBStats = pointsTable[teamB._id];

      if (teamAStats && teamBStats) {
        teamAStats.matchesPlayed++;
        teamBStats.matchesPlayed++;

        teamAStats.pointsDifference += teamAScore - teamBScore;
        teamBStats.pointsDifference += teamBScore - teamAScore;

        if (teamAScore > teamBScore) {
          teamAStats.wins++;
          teamAStats.points += 2;
          teamBStats.losses++;
        } else if (teamBScore > teamAScore) {
          teamBStats.wins++;
          teamBStats.points += 2;
          teamAStats.losses++;
        } else {
          teamAStats.ties++;
          teamBStats.ties++;
          teamAStats.points++;
          teamBStats.points++;
        }
      }
    }

    const teamAResult =
      teamAScore > teamBScore ? "W" : teamBScore > teamAScore ? "L" : "T";
    const teamBResult =
      teamBScore > teamAScore ? "W" : teamAScore > teamBScore ? "L" : "T";

    const addLastResult = (teamId, result) => {
      const arr = pointsTable[teamId]?.lastThreeMatches;
      if (!arr) return;
      arr.push(result);
      if (arr.length > 4) arr.shift();
    };

    addLastResult(teamA._id, teamAResult);
    addLastResult(teamB._id, teamBResult);
  }

  const finalResult = await getFinalMatchWinners();
  if (finalResult?.name) {
    const winner = Object.values(pointsTable).find(
      (t) => t.teamName === finalResult.name
    );
    if (winner) winner.finalWinner = true;
  }

  const sortedPointsTable = Object.values(pointsTable).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsDifference - a.pointsDifference;
  });

  if (completedLeagueMatches === totalLeagueMatches && totalLeagueMatches > 0) {
    sortedPointsTable.slice(0, 4).forEach((t) => (t.qualifier = true));
  }

  return sortedPointsTable;
}

async function getMatchTotalPoints(matchId) {
  const pipeline = [
    { $match: { _id: new ObjectId(matchId) } },

    { $unwind: "$playerStats" },

    {
      $lookup: {
        from: "players",
        localField: "playerStats.player",
        foreignField: "_id",
        as: "player",
      },
    },
    { $unwind: "$player" },

    {
      $lookup: {
        from: "teams",
        localField: "player.team",
        foreignField: "_id",
        as: "playerTeam",
      },
    },
    { $unwind: "$playerTeam" },

    {
      $addFields: {
        totalRaidPoints: { $sum: "$playerStats.raidPoints" },
        totalDefensePoints: { $sum: "$playerStats.defensePoints" },
      },
    },

    {
      $group: {
        _id: "$playerTeam._id",
        teamName: { $first: "$playerTeam.name" },
        totalRaidPoints: { $sum: "$totalRaidPoints" },
        totalDefensePoints: { $sum: "$totalDefensePoints" },
      },
    },

    {
      $facet: {
        teams: [
          {
            $lookup: {
              from: "matches",
              let: { teamId: "$_id" },
              pipeline: [
                { $match: { _id: new ObjectId(matchId) } },
                {
                  $project: {
                    teamA: 1,
                    teamB: 1,
                    teamAScore: 1,
                    teamBScore: 1,
                  },
                },
              ],
              as: "matchInfo",
            },
          },
          { $unwind: "$matchInfo" },
          {
            $addFields: {
              score: {
                $cond: [
                  { $eq: ["$_id", "$matchInfo.teamA"] },
                  "$matchInfo.teamAScore",
                  "$matchInfo.teamBScore",
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: "$teams" },
    { $replaceRoot: { newRoot: "$teams" } },
  ];

  const result = await Match.aggregate(pipeline);

  // Transform to your old shape
  const teamStats = { teamA: {}, teamB: {} };
  result.forEach((team) => {
    if (team._id.toString() === result[0].matchInfo.teamA.toString()) {
      teamStats.teamA = {
        name: team.teamName,
        totalRaidPoints: team.totalRaidPoints,
        totalDefensePoints: team.totalDefensePoints,
        score: team.score,
      };
    } else {
      teamStats.teamB = {
        name: team.teamName,
        totalRaidPoints: team.totalRaidPoints,
        totalDefensePoints: team.totalDefensePoints,
        score: team.score,
      };
    }
  });

  return teamStats;
}

async function getFinalMatchWinners() {
  const match = await Match.findOne({
    matchType: "Final",
    status: "Completed",
  })
    .sort({ createdAt: -1 })
    .populate("teamA teamB");

  if (!match) return { message: "No final match found" };

  let winner;
  if (match.teamAScore > match.teamBScore) {
    winner = match.teamA;
  } else if (match.teamBScore > match.teamAScore) {
    winner = match.teamB;
  } else {
    return { matchId: match._id, message: "The match ended in a draw" };
  }

  return {
    matchId: match._id,
    name: winner.name,
    logo: winner.logo,
  };
}

async function getFullMatchStats(matchId) {
  const match = await Match.findById(matchId)
    .populate("teamA teamB")
    .populate({
      path: "playerStats.player",
      select: "name team profilePic _id",
      populate: { path: "team", select: "name" },
    });

  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  // Initialize response structure
  const stats = {
    teamA: {
      name: match.teamA.name,
      logo: match.teamA.logo,
      score: match.teamAScore,
      totalRaidPoints: 0,
      totalDefensePoints: 0,
      topRaiders: [],
      topDefenders: [],
    },
    teamB: {
      name: match.teamB.name,
      logo: match.teamB.logo,
      score: match.teamBScore,
      totalRaidPoints: 0,
      totalDefensePoints: 0,
      topRaiders: [],
      topDefenders: [],
    },
    halfTime: match.halfTime,
    status: match.status,
    matchNumber: match.matchNumber,
    matchType: match.matchType || null,
    matchId: match._id.toString(),
  };

  // Process playerStats
  match.playerStats.forEach(({ player, raidPoints, defensePoints }) => {
    const totalRaidPoints = raidPoints.reduce((sum, val) => sum + val, 0);
    const totalDefensePoints = defensePoints.reduce((sum, val) => sum + val, 0);

    const teamKey =
      player.team._id.toString() === match.teamA._id.toString()
        ? "teamA"
        : "teamB";

    // Accumulate team totals
    stats[teamKey].totalRaidPoints += totalRaidPoints;
    stats[teamKey].totalDefensePoints += totalDefensePoints;

    if (totalRaidPoints >= 1) {
      stats[teamKey].topRaiders.push({
        id: player._id.toString(),
        name: player.name,
        profilePic: getPublicIdFromUrl(player.profilePic),
        totalRaidPoints,
      });
    }
    if (totalDefensePoints >= 1) {
      stats[teamKey].topDefenders.push({
        id: player._id.toString(),
        name: player.name,
        profilePic: getPublicIdFromUrl(player.profilePic),
        totalDefensePoints,
      });
    }
  });

  stats.teamA.topRaiders.sort((a, b) => b.totalRaidPoints - a.totalRaidPoints);
  stats.teamB.topRaiders.sort((a, b) => b.totalRaidPoints - a.totalRaidPoints);
  stats.teamA.topDefenders.sort(
    (a, b) => b.totalDefensePoints - a.totalDefensePoints
  );
  stats.teamB.topDefenders.sort(
    (a, b) => b.totalDefensePoints - a.totalDefensePoints
  );
  return stats;
}

async function getRankedTeams(statField = null, limit = 10) {
  // Define all possible stats
  const allStats = [
    "totalPoints",
    "totalRaids",
    "totalDefense",
    "super10s",
    "high5s",
    "superRaids",
    "avgTotalPoints",
    "avgRaids",
    "avgDefense",
  ];

  // If statField is null or invalid, show all stats
  const showAll = !statField || !allStats.includes(statField);

  // Build $project dynamically
  const projectStage = {
    name: 1,
    logo: 1,
  };

  if (showAll) {
    allStats.forEach((s) => (projectStage[s] = 1));
  } else {
    projectStage[statField] = 1;
  }

  const pipeline = [
    {
      $lookup: {
        from: "matches",
        let: { teamId: "$_id" },
        pipeline: [
          { $match: { status: "Completed" } },
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ["$teamA", "$$teamId"] },
                  { $eq: ["$teamB", "$$teamId"] },
                ],
              },
            },
          },
          // Lookup player documents to get team information
          {
            $lookup: {
              from: "players",
              localField: "playerStats.player",
              foreignField: "_id",
              as: "playerDocs",
            },
          },
          {
            $project: {
              // Filter playerStats to only include players from this team
              teamPlayerStats: {
                $filter: {
                  input: {
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
                              { $eq: ["$$playerDoc.team", "$$teamId"] },
                              {
                                player: "$$ps.player",
                                raidPoints: "$$ps.raidPoints",
                                defensePoints: "$$ps.defensePoints",
                              },
                              null,
                            ],
                          },
                        },
                      },
                    },
                  },
                  as: "tps",
                  cond: { $ne: ["$$tps", null] },
                },
              },
            },
          },
          {
            $project: {
              raidPoints: {
                $sum: {
                  $map: {
                    input: "$teamPlayerStats",
                    as: "p",
                    in: { $sum: "$$p.raidPoints" },
                  },
                },
              },
              defensePoints: {
                $sum: {
                  $map: {
                    input: "$teamPlayerStats",
                    as: "p",
                    in: { $sum: "$$p.defensePoints" },
                  },
                },
              },
              // Player-level Super 10s (total raid points >= 10)
              super10s: {
                $size: {
                  $filter: {
                    input: "$teamPlayerStats",
                    as: "p",
                    cond: { $gte: [{ $sum: "$$p.raidPoints" }, 10] },
                  },
                },
              },
              // Player-level High 5s (total defense points >= 5)
              high5s: {
                $size: {
                  $filter: {
                    input: "$teamPlayerStats",
                    as: "p",
                    cond: { $gte: [{ $sum: "$$p.defensePoints" }, 5] },
                  },
                },
              },
              // Super Raids (players with total raid points >= 8 in a match)
              superRaids: {
                $size: {
                  $filter: {
                    input: "$teamPlayerStats",
                    as: "p",
                    cond: { $gte: [{ $sum: "$$p.raidPoints" }, 8] },
                  },
                },
              },
            },
          },
        ],
        as: "matches",
      },
    },
    {
      $addFields: {
        matchesPlayed: { $size: "$matches" },
        totalRaids: { $sum: "$matches.raidPoints" },
        totalDefense: { $sum: "$matches.defensePoints" },
        totalPoints: {
          $sum: {
            $map: {
              input: "$matches",
              as: "m",
              in: { $add: ["$$m.raidPoints", "$$m.defensePoints"] },
            },
          },
        },
        // Sum across all matches
        super10s: { $sum: "$matches.super10s" },
        high5s: { $sum: "$matches.high5s" },
        superRaids: { $sum: "$matches.superRaids" },
      },
    },
    {
      $addFields: {
        avgRaids: {
          $cond: [
            { $eq: ["$matchesPlayed", 0] },
            0,
            { $divide: ["$totalRaids", "$matchesPlayed"] },
          ],
        },
        avgDefense: {
          $cond: [
            { $eq: ["$matchesPlayed", 0] },
            0,
            { $divide: ["$totalDefense", "$matchesPlayed"] },
          ],
        },
        avgTotalPoints: {
          $cond: [
            { $eq: ["$matchesPlayed", 0] },
            0,
            { $divide: ["$totalPoints", "$matchesPlayed"] },
          ],
        },
      },
    },
    { $sort: { [statField || "totalPoints"]: -1 } },
    { $limit: limit },
    { $project: projectStage },
  ];

  return Team.aggregate(pipeline);
}

async function getTopTeamsService(category = null) {
  const data = await getRankedTeams(category, 5);
  return data;
}

module.exports = {
  getMatchStats,
  getMatchTotalPoints,
  getPointsTable,
  getFinalMatchWinners,
  getTopPlayersService,
  getFullMatchStats,
  getTopTeamsService,
};
