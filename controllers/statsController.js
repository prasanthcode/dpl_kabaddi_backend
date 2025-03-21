const Player = require("../models/Player");
const Match = require("../models/Match");
const mongoose = require("mongoose");
const redis = require("../config/redisConnect"); // Import Redis connection
exports.getTopPlayers = async (req, res) => {
  try {
    // Check if data exists in Redis cache
    const cachedData = await redis.get("topPlayers");
    if (cachedData) {
      return res.json(JSON.parse(cachedData)); // Return cached data
    }

    // Fetch data from MongoDB
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
                else: 0
              }
            }
          },
          super10s: {
            $sum: {
              $cond: {
                if: { $gte: [{ $sum: "$playerStats.raidPoints" }, 10] },
                then: 1,
                else: 0
              }
            }
          },
          superRaids: {
            $sum: {
              $size: {
                $filter: {
                  input: "$playerStats.raidPoints",
                  as: "raid",
                  cond: { $gte: ["$$raid", 3] }
                }
              }
            }
          },
          totalPoints: {
            $sum: {
              $add: [{ $sum: "$playerStats.raidPoints" }, { $sum: "$playerStats.defensePoints" }]
            }
          }
        }
      },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "_id",
          as: "playerInfo"
        }
      },
      { $unwind: "$playerInfo" },
      {
        $lookup: {
          from: "teams",
          localField: "playerInfo.team",
          foreignField: "_id",
          as: "teamInfo"
        }
      },
      { $unwind: "$teamInfo" },
      {
        $project: {
          playerId: "$_id", // Include Player ID
          name: "$playerInfo.name",
          team: "$teamInfo.name",
          teamLogo: "$teamInfo.logo",
          profilePic: "$playerInfo.profilePic",
          totalRaidPoints: 1,
          totalDefensePoints: 1,
          high5s: 1,
          super10s: 1,
          superRaids: 1,
          totalPoints: 1
        }
      }
    ]);

    // Function to get top players sorted by points
    const getTopPlayers = (field, limit) => {
      return players
        .filter((p) => p[field] > 0) // Ensure non-zero players
        .sort((a, b) => b[field] - a[field])
        .slice(0, limit)
        .map((p, index) => ({
          playerId: p.playerId, // Include Player ID
          name: p.name,
          team: p.team,
          profilePic: p.profilePic,
          points: p[field],
          teamLogo: index === 0 ? p.teamLogo : undefined
        }));
    };

    // Final result object
    const result = {
      top5High5s: getTopPlayers("high5s", 10),
      top5Super10s: getTopPlayers("super10s", 10),
      top10SuperRaids: getTopPlayers("superRaids", 10),
      top10RaidPoints: getTopPlayers("totalRaidPoints", 10),
      top10Tackles: getTopPlayers("totalDefensePoints", 10),
      top10TotalPoints: getTopPlayers("totalPoints", 10)
    };

    // Store data in Redis cache for 10 minutes (600 seconds)
    await redis.set("topPlayers", JSON.stringify(result), "EX", 600);

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
