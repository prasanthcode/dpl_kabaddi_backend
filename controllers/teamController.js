const redis = require("../config/redisConnect");
const Team = require("../models/Team");

// // @desc Get all teams
// exports.getTeamInfo = async (req, res) => {
//   try {
//     const { id } = req.params; // Extract team ID from request params

//     const team = await Team.findById(id)
//       .populate("players") // Fetch only name and profilePic for players
//       .select("_id name logo players"); // Fetch only required team fields

//     if (!team) {
//       return res.status(404).json({ message: "team Not found" });
//     }

//     res.status(200).json(team);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };
// get team without cache
// exports.getTeams = async (req, res) => {
//   try {
//     const teams = await Team.find({},"_id name logo");
//     res.status(200).json(teams);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.getTeams = async (req, res) => {
  try {
    const cacheKey = "teams_data";
    
    // Check if data exists in Redis
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData)); // Return cached response
    }

    // Fetch from MongoDB if not in cache
    const teams = await Team.find({}, "_id name logo");

    // Store in Redis with an expiration time (e.g., 1 hour = 3600 seconds)
    await redis.set(cacheKey, JSON.stringify(teams), "EX", 3600);

    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc Create a new team
// exports.createTeam = async (req, res) => {
//   try {
//     const { name, logo } = req.body;
//     const newTeam = new Team({ name, logo });
//     await newTeam.save();
//     res.status(201).json(newTeam);
//   } catch (error) {
//     res.status(400).json({ message: "Invalid data" });
//   }
// };

exports.createTeam = async (req, res) => {
  try {
    const { name, logo } = req.body;

    // Create and save the new team
    const newTeam = new Team({ name, logo });
    await newTeam.save();

    // Clear the cached teams list to force fresh fetch
    await redis.del("teams_data");

    res.status(201).json(newTeam);
  } catch (error) {
    res.status(400).json({ message: "Invalid data" });
  }
};

// @desc Delete a team by ID
exports.deleteTeam = async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Team removed" });
  } catch (error) {
    res.status(404).json({ message: "Team not found" });
  }
};
