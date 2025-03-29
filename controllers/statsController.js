const Player = require("../models/Player");
const Match = require("../models/Match");
const mongoose = require("mongoose");
const redis = require("../config/redisConnect"); // Import Redis connection
exports.getTopPlayers = async (req, res) => {
  try {

    // Check if data exists in Redis cache
    const cachedData = await redis.get("topPlayers");
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const players = await Match.aggregate([
      { $unwind: "$playerStats" },
      {
        $group: {
          _id: "$playerStats.player",
          totalRaidPoints: { $sum: { $sum: "$playerStats.raidPoints" } },
          totalDefensePoints: { $sum: { $sum: "$playerStats.defensePoints" } },
          high5s: {
            $sum: {
              $cond: {
                if: { $gte: [{ $sum: "$playerStats.defensePoints" }, 5] },
                then: 1,
                else: 0,
              },
            },
          },
          super10s: {
            $sum: {
              $cond: {
                if: { $gte: [{ $sum: "$playerStats.raidPoints" }, 10] },
                then: 1,
                else: 0,
              },
            },
          },
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
          totalPoints: {
            $sum: {
              $add: [{ $sum: "$playerStats.raidPoints" }, { $sum: "$playerStats.defensePoints" }],
            },
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
          playerId: "$_id",
          name: "$playerInfo.name",
          team: "$teamInfo.name",
          teamLogo: "$teamInfo.logo",
          profilePic: "$playerInfo.profilePic",
          totalRaidPoints: 1,
          totalDefensePoints: 1,
          high5s: 1,
          super10s: 1,
          superRaids: 1,
          totalPoints: 1,
        },
      },
    ]);


    // Function to rank players correctly (modified standard rank with skips)
    const getTopPlayers = (field, limit) => {
      const sorted = players
        .filter((p) => p[field] > 0)
        .sort((a, b) => b[field] - a[field]);

      let rank = 1;
      let prevPoints = null;
      let currentRank = 1;
      const rankedPlayers = [];

      for (let i = 0; i < sorted.length && rankedPlayers.length < limit; i++) {
        if (sorted[i][field] !== prevPoints) {
          rank = currentRank;
        }

        rankedPlayers.push({
          rank,
          playerId: sorted[i].playerId,
          name: sorted[i].name,
          team: sorted[i].team,
          profilePic: sorted[i].profilePic,
          points: sorted[i][field],
          teamLogo: rank === 1 ? sorted[i].teamLogo : undefined,
        });

        if (sorted[i][field] !== prevPoints) {
          currentRank = rank + 1; // Increment based on the assigned rank
        }
        prevPoints = sorted[i][field];
      }

      return rankedPlayers;
    };

    // Final result object
    const result = {
      top5High5s: getTopPlayers("high5s", 10),
      top5Super10s: getTopPlayers("super10s", 10),
      top10SuperRaids: getTopPlayers("superRaids", 10),
      top10RaidPoints: getTopPlayers("totalRaidPoints", 10),
      top10Tackles: getTopPlayers("totalDefensePoints", 10),
      top10TotalPoints: getTopPlayers("totalPoints", 10),
    };

    // Store data in Redis cache for 10 minutes (600 seconds)
    await redis.set("topPlayers", JSON.stringify(result), "EX", 1200);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// exports.getTopPlayers = async (req, res) => {
//   try {
//     const players = await Match.aggregate([
//       { $unwind: "$playerStats" },
//       {
//         $group: {
//           _id: "$playerStats.player",
//           totalRaidPoints: { $sum: { $sum: "$playerStats.raidPoints" } },
//           totalDefensePoints: { $sum: { $sum: "$playerStats.defensePoints" } },
//           high5s: {
//             $sum: {
//               $cond: { if: { $gte: [{ $sum: "$playerStats.defensePoints" }, 5] }, then: 1, else: 0 },
//             },
//           },
//           super10s: {
//             $sum: {
//               $cond: { if: { $gte: [{ $sum: "$playerStats.raidPoints" }, 10] }, then: 1, else: 0 },
//             },
//           },
//           totalPoints: {
//             $sum: { $add: [{ $sum: "$playerStats.raidPoints" }, { $sum: "$playerStats.defensePoints" }] },
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: "players",
//           localField: "_id",
//           foreignField: "_id",
//           as: "playerInfo",
//         },
//       },
//       { $unwind: "$playerInfo" },
//       {
//         $lookup: {
//           from: "teams",
//           localField: "playerInfo.team",
//           foreignField: "_id",
//           as: "teamInfo",
//         },
//       },
//       { $unwind: "$teamInfo" },
//       {
//         $project: {
//           _id: 1,
//           name: "$playerInfo.name",
//           team: "$teamInfo.name",
//           teamLogo: "$teamInfo.logo",
//           profilePic: "$playerInfo.profilePic",
//           totalRaidPoints: 1,
//           totalDefensePoints: 1,
//           high5s: 1,
//           super10s: 1,
//           totalPoints: 1,
//         },
//       },
//     ]);

//     // Function to get top N players with team logo for the first player
//     const getTopPlayers = (field, limit) => {
//       const sortedPlayers = players
//         .filter((p) => p[field] > 0) // Remove players with 0 points
//         .sort((a, b) => b[field] - a[field])
//         .slice(0, limit);

//       return sortedPlayers.map((p, index) => ({
//         name: p.name,
//         team: p.team,
//         profilePic: p.profilePic,
//         points: p[field],
//         teamLogo: index === 0 ? p.teamLogo : undefined, // Include team logo only for first player
//       }));
//     };

//     res.json({
//       top5High5s: getTopPlayers("high5s", 10),
//       top5Super10s: getTopPlayers("super10s", 10),
//       top10RaidPoints: getTopPlayers("totalRaidPoints", 10),
//       top10Tackles: getTopPlayers("totalDefensePoints", 10),
//       top10TotalPoints: getTopPlayers("totalPoints", 10),
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
