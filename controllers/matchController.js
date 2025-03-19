const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const redis = require("../config/redisConnect"); // Import Redis connection

// @desc Get all matches
exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.find().populate("teamA teamB playerStats.player");
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
exports.setMatchCompleted = async (req, res) => {
  try {
    const { matchId } = req.params;

    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      { status: "Completed" },
      { new: true }
    );

    if (!updatedMatch) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.json(updatedMatch);
  } catch (error) {
    console.error("Error updating match:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.setHalfTimeStatus = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Update match document in MongoDB
    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      { halfTime: true }, // Set HT status to true
      { new: true }
    );

    if (!updatedMatch) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({ message: "Half Time status updated", match: updatedMatch });
  } catch (error) {
    console.error("Error updating Half Time status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getMatchStats = async (req, res) => {
  try {
    const { matchId } = req.params;
    const cacheKey = `matchStats:${matchId}`;
    

    // Try fetching from cache
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        console.log("✅ Serving from cache");
        return res.json(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error("⚠️ Redis fetch error:", error);
    }

    // Fetch from DB if not cached
    const match = await Match.findById(matchId)
      .populate({ path: "teamA", select: "name logo" })
      .populate({ path: "teamB", select: "name logo" })
      .populate({
        path: "playerStats.player",
        select: "name team",
        populate: { path: "team", select: "name" },
      });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const teamA = { name: match.teamA.name, logo: match.teamA.logo, score: match.teamAScore };
    const teamB = { name: match.teamB.name, logo: match.teamB.logo, score: match.teamBScore };

    let raiders = [];
    let defenders = [];
    let teamATotalRaidPoints = 0;
    let teamATotalDefensePoints = 0;
    let teamBTotalRaidPoints = 0;
    let teamBTotalDefensePoints = 0;

    match.playerStats.forEach(({ player, raidPoints, defensePoints }) => {
      const totalRaidPoints = raidPoints.reduce((sum, val) => sum + val, 0);
      const totalDefensePoints = defensePoints.reduce((sum, val) => sum + val, 0);

      const playerData = { name: player.name, team: player.team.name };

      raiders.push({ ...playerData, totalRaidPoints });
      defenders.push({ ...playerData, totalDefensePoints });

      if (player.team.name === teamA.name) {
        teamATotalRaidPoints += totalRaidPoints;
        teamATotalDefensePoints += totalDefensePoints;
      } else if (player.team.name === teamB.name) {
        teamBTotalRaidPoints += totalRaidPoints;
        teamBTotalDefensePoints += totalDefensePoints;
      }
    });

    const getTop5 = (arr, key) => arr.sort((a, b) => b[key] - a[key]).slice(0, 5);

    const result = {
      teamA: { ...teamA, totalRaidPoints: teamATotalRaidPoints, totalDefensePoints: teamATotalDefensePoints },
      teamB: { ...teamB, totalRaidPoints: teamBTotalRaidPoints, totalDefensePoints: teamBTotalDefensePoints },
      topRaiders: getTop5(raiders, "totalRaidPoints"),
      topDefenders: getTop5(defenders, "totalDefensePoints"),
    };

    // Try storing in Redis
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(result));
      console.log("✅ Data cached in Redis");
    } catch (error) {
      console.error("⚠️ Failed to cache data in Redis:", error);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// exports.getMatchStats = async (req, res) => {
//   try {
//     const { matchId } = req.params;

//     const match = await Match.findById(matchId)
//       .populate({ path: "teamA", select: "name logo" })
//       .populate({ path: "teamB", select: "name logo" })
//       .populate({
//         path: "playerStats.player",
//         select: "name team",
//         populate: { path: "team", select: "name" }, // Populate team name
//       });

//     if (!match) {
//       return res.status(404).json({ message: "Match not found" });
//     }

//     const teamA = { name: match.teamA.name, logo: match.teamA.logo, score: match.teamAScore };
//     const teamB = { name: match.teamB.name, logo: match.teamB.logo, score: match.teamBScore };

//     let raiders = [];
//     let defenders = [];
//     let teamATotalRaidPoints = 0;
//     let teamATotalDefensePoints = 0;
//     let teamBTotalRaidPoints = 0;
//     let teamBTotalDefensePoints = 0;

//     match.playerStats.forEach(({ player, raidPoints, defensePoints }) => {
//       const totalRaidPoints = raidPoints.reduce((sum, val) => sum + val, 0);
//       const totalDefensePoints = defensePoints.reduce((sum, val) => sum + val, 0);

//       const playerData = { name: player.name, team: player.team.name };

//       raiders.push({ ...playerData, totalRaidPoints });
//       defenders.push({ ...playerData, totalDefensePoints });

//       if (player.team.name === teamA.name) {
//         teamATotalRaidPoints += totalRaidPoints;
//         teamATotalDefensePoints += totalDefensePoints;
//       } else if (player.team.name === teamB.name) {
//         teamBTotalRaidPoints += totalRaidPoints;
//         teamBTotalDefensePoints += totalDefensePoints;
//       }
//     });

//     // Helper function to get top 5 players
//     // const getTop5 = (arr, key) => arr.sort((a, b) => b[key] - a[key]).slice(0, 5);
//     const getTop5 = (arr, key) => arr.sort((a, b) => b[key] - a[key]);

//     res.json({
//       teamA: { ...teamA, totalRaidPoints: teamATotalRaidPoints, totalDefensePoints: teamATotalDefensePoints },
//       teamB: { ...teamB, totalRaidPoints: teamBTotalRaidPoints, totalDefensePoints: teamBTotalDefensePoints },
//       topRaiders: getTop5(raiders, "totalRaidPoints"),
//       topDefenders: getTop5(defenders, "totalDefensePoints"),
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getPointsTable = async (req, res) => {
//   try {
//     const matches = await Match.find({ status: "Completed" }).populate("teamA teamB", "name");

//     const pointsTable = {};

//     matches.forEach((match) => {
//       const { teamA, teamB, teamAScore, teamBScore } = match;

//       if (!pointsTable[teamA._id]) {
//         pointsTable[teamA._id] = { teamId: teamA._id, teamName: teamA.name, wins: 0, losses: 0, ties: 0, matchesPlayed: 0, pointsDifference: 0 ,points:0};
//       }
//       if (!pointsTable[teamB._id]) {
//         pointsTable[teamB._id] = { teamId: teamB._id, teamName: teamB.name, wins: 0, losses: 0, ties: 0, matchesPlayed: 0, pointsDifference: 0 ,points:0 };
//       }

//       pointsTable[teamA._id].matchesPlayed++;
//       pointsTable[teamB._id].matchesPlayed++;
//       pointsTable[teamA._id].pointsDifference += teamAScore - teamBScore;
//       pointsTable[teamB._id].pointsDifference += teamBScore - teamAScore;

//       if (teamAScore > teamBScore) {
//         pointsTable[teamA._id].wins++;
//         pointsTable[teamA._id].points=pointsTable[teamA._id].points+2,
//         pointsTable[teamB._id].losses++;
//       } else if (teamBScore > teamAScore) {
//         pointsTable[teamB._id].wins++;
//         pointsTable[teamB._id].points=pointsTable[teamB._id].points+2,

//         pointsTable[teamA._id].losses++;
//       } else {
//         pointsTable[teamA._id].ties++;
//         pointsTable[teamB._id].points++,
//         pointsTable[teamA._id].points++,

//         pointsTable[teamB._id].ties++;
//       }
//     });
//     const sortedPointsTable = Object.values(pointsTable).sort((a, b) => {
//       if (b.points !== a.points) return b.points - a.points; // Sort by points
//       if (b.wins !== a.wins) return b.wins - a.wins; // Sort by wins
//       return b.pointsDifference - a.pointsDifference; // Sort by score difference
//     });
//     res.json(Object.values(sortedPointsTable));
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.getHalfTimeStatus = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Fetch match from MongoDB
    const match = await Match.findById(matchId).select("halfTime");

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({ halfTime: match.halfTime });
  } catch (error) {
    console.error("Error fetching Half Time status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getPointsTable = async (req, res) => {
  try {
    // Fetch all teams
    const allTeams = await Team.find({}, "name");

    // Initialize points table with all teams
    const pointsTable = {};
    allTeams.forEach((team) => {
      pointsTable[team._id] = {
        teamId: team._id,
        teamName: team.name,
        wins: 0,
        losses: 0,
        ties: 0,
        matchesPlayed: 0,
        pointsDifference: 0,
        points: 0
      };
    });

    // Fetch completed matches
    const matches = await Match.find({ status: "Completed" }).populate("teamA teamB", "name");

    // Process completed matches
    matches.forEach((match) => {
      const { teamA, teamB, teamAScore, teamBScore } = match;

      pointsTable[teamA._id].matchesPlayed++;
      pointsTable[teamB._id].matchesPlayed++;
      pointsTable[teamA._id].pointsDifference += teamAScore - teamBScore;
      pointsTable[teamB._id].pointsDifference += teamBScore - teamAScore;

      if (teamAScore > teamBScore) {
        pointsTable[teamA._id].wins++;
        pointsTable[teamA._id].points += 2;
        pointsTable[teamB._id].losses++;
      } else if (teamBScore > teamAScore) {
        pointsTable[teamB._id].wins++;
        pointsTable[teamB._id].points += 2;
        pointsTable[teamA._id].losses++;
      } else {
        pointsTable[teamA._id].ties++;
        pointsTable[teamB._id].ties++;
        pointsTable[teamA._id].points++;
        pointsTable[teamB._id].points++;
      }
    });

    // Sort teams based on points, wins, and points difference
    const sortedPointsTable = Object.values(pointsTable).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points; // Sort by points
      if (b.wins !== a.wins) return b.wins - a.wins; // Sort by wins
      return b.pointsDifference - a.pointsDifference; // Sort by points difference
    });

    res.json(sortedPointsTable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getMatchTotalPoints = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Fetch match details with player stats populated
    const match = await Match.findById(matchId)
      .populate("teamA", "name")
      .populate("teamB", "name")
      .populate({
        path: "playerStats.player",
        select: "name team",
        populate: { path: "team", select: "name" } // Ensure team info is available
      });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    let teamStats = {
      teamA: { 
        name: match.teamA.name, 
        totalRaidPoints: 0, 
        totalDefensePoints: 0, 
        score: match.teamAScore // ✅ Use stored team score
      },
      teamB: { 
        name: match.teamB.name, 
        totalRaidPoints: 0, 
        totalDefensePoints: 0, 
        score: match.teamBScore // ✅ Use stored team score
      }
    };

    // ✅ Calculate total raid and defense points separately
    match.playerStats.forEach(stat => {
      const totalRaidPoints = stat.raidPoints.reduce((sum, p) => sum + p, 0);
      const totalDefensePoints = stat.defensePoints.reduce((sum, p) => sum + p, 0);

      if (stat.player.team && stat.player.team.equals(match.teamA._id)) {
        teamStats.teamA.totalRaidPoints += totalRaidPoints;
        teamStats.teamA.totalDefensePoints += totalDefensePoints;
      } else if (stat.player.team && stat.player.team.equals(match.teamB._id)) {
        teamStats.teamB.totalRaidPoints += totalRaidPoints;
        teamStats.teamB.totalDefensePoints += totalDefensePoints;
      }
    });

    res.json(teamStats);
  } catch (error) {
    console.error("Error fetching match points:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


exports.getMatchStatsLive = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { team } = req.query; // 'A' or 'B'

    if (!["A", "B"].includes(team)) {
      return res.status(400).json({ message: "Invalid team parameter. Use 'A' or 'B'." });
    }

    const teamField = team === "A" ? "teamA" : "teamB";

    const match = await Match.findById(matchId)
      .populate({ path: teamField, select: "name" }) // Populate only the required team
      .populate({
        path: "playerStats.player",
        select: "name team",
        populate: { path: "team", select: "name" },
      });
    
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const selectedTeam = team === "A" ? match.teamA.name : match.teamB.name;
    let raiders = [];
    let defenders = [];

    match.playerStats.forEach(({ player, raidPoints, defensePoints }) => {
      if (player.team.name !== selectedTeam) return; // Filter players by team

      raiders.push({ name: player.name, totalRaidPoints: raidPoints.reduce((sum, val) => sum + val, 0) });
      defenders.push({ name: player.name, totalDefensePoints: defensePoints.reduce((sum, val) => sum + val, 0) });
    });

    // Get top 5 players
    const getTop5 = (arr, key) => arr.sort((a, b) => b[key] - a[key]).slice(0, 5);

    res.json({
      topRaiders: getTop5(raiders, "totalRaidPoints"),
      topDefenders: getTop5(defenders, "totalDefensePoints"),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.getMatchScores = async (req, res) => {
  try {
    const { matchId } = req.params; // Get matchId from URL parameters

    const match = await Match.findById(matchId).populate("teamA teamB"); // Populate team details
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    res.status(200).json({
      teamA: {
        name: match.teamA.name,
        score: match.teamAScore,
        logo: match.teamA.logo,
        matCount: match.teamAMat, // Add teamAMat
      },
      teamB: {
        name: match.teamB.name,
        score: match.teamBScore,
        logo: match.teamB.logo,
        matCount: match.teamBMat, // Add teamBMat
      },
      halfTime:match.halfTime,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getPlayersOfMatch = async (req, res) => {
  try {
    const { matchId } = req.params;

    // Fetch match details
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const { teamA, teamB } = match;

    // Fetch team details
    const teamAInfo = await Team.findById(teamA).select("_id name");
    const teamBInfo = await Team.findById(teamB).select("_id name");

    if (!teamA || !teamB) {
      return res.status(404).json({ message: "One or both teams not found" });
    }

    // Fetch players for each team
    const teamAPlayers = await Player.find({ team: teamA }).select("_id name");
    const teamBPlayers = await Player.find({ team: teamB }).select("_id name");

    return res.json({
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
    });
  } catch (error) {
    console.error("Error fetching players:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getUpcomingMatches = async (req, res) => {
  try {
    // Extract limit from query params (optional)
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    // Query upcoming matches sorted by matchNumber and date (both descending)
    let query = Match.find({ status: "Upcoming" })
      .populate("teamA", "name logo")
      .populate("teamB", "name logo")
      .sort({  date: 1,matchNumber: -1 }) // Sort: matchNumber (high to low), date (latest first)
      .select("_id date teamA teamB matchNumber");

    // Apply limit if provided
    if (limit) {
      query = query.limit(limit);
    }

    const matches = await query;

    // Format response
    const formattedMatches = matches.map(match => ({
      matchId: match._id,
      matchNumber: match.matchNumber,
      date: match.date,
      teamA: {
        name: match.teamA.name,
        logo: match.teamA.logo
      },
      teamB: {
        name: match.teamB.name,
        logo: match.teamB.logo
      }
    }));

    res.status(200).json(formattedMatches);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// exports.getUpcomingMatches = async (req, res) => {
//   try {
//     const matches = await Match.find({ status: "Upcoming" })
//       .populate("teamA", "name logo")
//       .populate("teamB", "name logo")
//       .select("_id date teamA teamB matchNumber");

//     const formattedMatches = matches.map(match => ({
//       matchId:match._id,
//       matchNumber:match.matchNumber,

//       date: match.date,
//       teamA: {
//         name: match.teamA.name,
//         logo: match.teamA.logo
//       },
//       teamB: {
//         name: match.teamB.name,
//         logo: match.teamB.logo
//       }
//     }));

//     res.status(200).json(formattedMatches);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.getCompletedMatches = async (req, res) => {
  try {
    let { limit } = req.query;  // Get the limit from query params
    limit = limit ? parseInt(limit) : null;  // Convert to integer if present

    let query = Match.find({ status: "Completed" })
      .populate("teamA", "name logo")
      .populate("teamB", "name logo")
      .sort({  date: -1,matchNumber: -1 })
      .select("_id date teamA teamB teamAScore teamBScore matchNumber");

    if (limit) {
      query = query.limit(limit);  // Apply limit if specified
    }

    const matches = await query;

    const formattedMatches = matches.map(match => ({
      matchId: match._id,
      matchNumber: match.matchNumber,
      date: match.date,
      teamA: {
        name: match.teamA.name,
        logo: match.teamA.logo,
        score: match.teamAScore,
      },
      teamB: {
        name: match.teamB.name,
        logo: match.teamB.logo,
        score: match.teamBScore,
      }
    }));

    res.status(200).json(formattedMatches);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Create a new match
exports.updateTeamMat = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { teamAMat, teamBMat } = req.body; // Get the new values from request

    // Find and update the match
    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      { ...(teamAMat !== undefined && { teamAMat }), ...(teamBMat !== undefined && { teamBMat }) },
      { new: true }
    );

    if (!updatedMatch) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json({ message: "Updated team mat players successfully", match: updatedMatch });
  } catch (error) {
    console.error("Error updating team mat players:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getOngoingMatches = async (req, res) => {
  try {
    const matches = await Match.find({ status: "Ongoing" })
      .populate("teamA", "name logo")
      .populate("teamB", "name logo")
      .select(" _id date teamA teamB teamAScore teamBScore matchNumber halfTime").limit(1);

    const formattedMatches = matches.map(match => ({
      matchId:match._id,
      date: match.date,
      matchNumber:match.matchNumber,
      halfTime: match.halfTime,
      teamA: {
        name: match.teamA.name,
        logo: match.teamA.logo,
        score: match.teamAScore,
      },
      teamB: {
        name: match.teamB.name,
        logo: match.teamB.logo,
        score: match.teamBScore,

      }
    }));

    res.status(200).json(formattedMatches);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
// @desc Create a new match

exports.createMatch = async (req, res) => {
  try {
    const { teamA, teamB,matchNumber } = req.body;

    // Fetch players from both teams
    const teamAPlayers = await Player.find({ team: teamA }).select("_id");
    const teamBPlayers = await Player.find({ team: teamB }).select("_id");

    // Initialize playerStats with empty raidPoints and defensePoints
    const playerStats = [...teamAPlayers, ...teamBPlayers].map((player) => ({
      player: player._id,
      raidPoints: [],
      defensePoints: [],
    }));

    // Create new match with initialized playerStats
    const newMatch = new Match({
      matchNumber,
      teamA,
      teamB,
      playerStats,
    });

    await newMatch.save();
    res.status(201).json(newMatch);
  } catch (error) {
    res.status(400).json({ message: "Invalid data", error: error.message });
  }
};


// @desc Update match scores
exports.updateMatch = async (req, res) => {
  try {
    const updatedMatch = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedMatch);
  } catch (error) {
    res.status(404).json({ message: "Match not found" });
  }
};
exports.addPoints = async (req, res) => {
    try {
      const { matchId, playerId, points, type } = req.body;
  
      const match = await Match.findById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
  
      
      await match.addPoints(playerId, points,type);
      
  
      res.status(200).json(match);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };
  exports.addPointsToOnlyTeam = async (req, res) => {
    try {
      const { matchId, teamId, points } = req.body; // Ensure matchId is included
  
      const match = await Match.findById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Call the schema method
      await match.addPointsOnlyTeam(teamId, points);

      res.status(200).json({ message: "Points updated successfully", match });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
};
exports.undoPlayerPoints = async (req, res) => {
  try {
    const { matchId, playerId, type } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const removedPoint = await match.popPoints(playerId, type);

    res.status(200).json({
      message: `Removed ${removedPoint} point(s) from player ${playerId}`,
      
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.undoTeamPoints = async (req, res) => {
  try {
    const { matchId, teamId, points } = req.body;
    console.log(matchId);
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    await match.removePointsOnlyTeam(teamId, points);

    res.status(200).json({
      message: `Removed ${points} point(s) from team ${teamId}`,
      
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

