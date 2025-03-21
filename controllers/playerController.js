const Match = require("../models/Match");
const Player = require("../models/Player");
const Team = require("../models/Team");
const redis = require("../config/redisConnect"); // Import Redis connection

// @desc Get all players
exports.getPlayers = async (req, res) => {
  try {
    const players = await Player.find()
      .populate({
        path: "team",
        select: "name", // Only fetch team name
      })
      .select("name team"); // Only fetch player name and team reference

    res.status(200).json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getPlayerDetails = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Fetch player details
    const player = await Player.findById(playerId).populate("team");
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Find all completed matches where the player participated
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
      const playerStats = match.playerStats.find((p) => p.player.toString() === playerId);

      if (playerStats) {
        const raidPoints = playerStats.raidPoints.reduce((a, b) => a + b, 0);
        const defensePoints = playerStats.defensePoints.reduce((a, b) => a + b, 0);
        const matchTotalPoints = raidPoints + defensePoints;

        // Super 10s (10+ raid points)
        const super10 = raidPoints >= 10 ? 1 : 0;

        // High 5s (5+ defense points)
        const high5 = defensePoints >= 5 ? 1 : 0;

        // Super Raids (Any individual raid with 3+ points)
        const superRaids = playerStats.raidPoints.filter((rp) => rp >= 3).length;

        // Track total stats
        totalRaidPoints += raidPoints;
        totalDefensePoints += defensePoints;
        totalPoints += matchTotalPoints;
        totalSuper10s += super10;
        totalHigh5s += high5;
        totalSuperRaids += superRaids;

        // Determine opponent team
        const opponent =
          match.teamA._id.toString() === player.team._id.toString()
            ? match.teamB
            : match.teamA;

        // Store match-wise details
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
      }
    });

    // Final response
    res.json({
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
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// exports.getRaiders = async (req, res) => {
//   try {
//     const topRaiders = await Match.getTopRaiders();
//     res.json(topRaiders);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// }
// exports.getDefenders = async (req, res) => {
//   try {
//     const topDefenders = await Match.getTopDefenders();
//     res.json(topDefenders);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.getTopPlayers = async (req, res) => {
//   try {
//     // Check if data exists in Redis cache
//     const cachedData = await redis.get('topPlayers');

//     if (cachedData) {
//       return res.json(JSON.parse(cachedData)); // Return cached data if available
//     }

//     // Fetch data from the database
//     const [topRaiders, topDefenders] = await Promise.all([
//       Match.getTopRaiders(),
//       Match.getTopDefenders()
//     ]);

//     const response = { topRaiders, topDefenders };

//     // Store data in Redis with an expiration time of 10 minutes (600 seconds)
//     await redis.set('topPlayers', JSON.stringify(response), 'EX', 600);

//     res.json(response);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.getPlayersByTeam = async (req, res) => {
  try {
    const { teamId } = req.params; // Get teamId from URL params
    const players = await Player.find({ team: teamId }) // Filter players by teamId
      .populate("team", "name") // Populate team name only
      .select("name profilePic order _id") // Retrieve player's name, profilePic, and order
      .sort({ order: 1 }); // Sort by order in ascending order

    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



// @desc Create a new player
exports.createPlayer = async (req, res) => {
  try {
    const { name, team, role, profilePic } = req.body;
    const newPlayer = new Player({ name, team,profilePic });
    await newPlayer.save();
    res.status(201).json(newPlayer);
  } catch (error) {
    res.status(400).json({ message: "Invalid data" });
  }
};

// @desc Delete a player by ID
exports.deletePlayer = async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Player removed" });
  } catch (error) {
    res.status(404).json({ message: "Player not found" });
  }
};

exports.setProfilePic = async (req, res) => {
  try {
    const { playerId, profilePic } = req.body;

    if (!playerId || !profilePic) {
      return res.status(400).json({ message: "Player ID and profile picture URL are required" });
    }

    const player = await Player.findByIdAndUpdate(
      playerId,
      { profilePic },
      { new: true, runValidators: true }
    );

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.status(200).json({ message: "Profile picture updated successfully", player });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Bulk Insert Players
exports.bulkPlayer = async (req, res) => {
    try {
        const { players } = req.body;

        if (!players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({ message: "Invalid player data" });
        }

        // Insert multiple players at once
        const insertedPlayers = await Player.insertMany(players);

        res.status(201).json({
            message: "Players added successfully",
            players: insertedPlayers
        });
    } catch (error) {
        res.status(500).json({ message: "Error adding players", error: error.message });
    }
};




