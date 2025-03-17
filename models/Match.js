const mongoose = require("mongoose");
const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true, unique: true },
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Upcoming", "Ongoing", "Completed"], default: "Upcoming" },
  playerStats: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
      raidPoints: { type: [Number], default: [] },
      defensePoints: { type: [Number], default: [] },
    },
  ],
  halfTime: { type: Boolean, default: false },
  teamAMat: { type: Number, default: 7 }, // New field for players on mat
  teamBMat: { type: Number, default: 7 }, // New field for players on mat
});


matchSchema.methods.addPoints = async function (playerId, points, type) {
  const playerStat = this.playerStats.find(stat => stat.player.toString() === playerId);

  if (!playerStat) {
    throw new Error("Player not found in match");
  }

  // Fetch the player's team details
  const player = await mongoose.model("Player").findById(playerId).select("team");

  if (!player) {
    throw new Error("Player not found in database");
  }

  // Update defense points and team score
  if (type === "defense") {
    playerStat.defensePoints.push(points);

  } else if (type === "raid") {
    playerStat.raidPoints.push(points);

  }
  if (this.teamA.equals(player.team)) {
    this.teamAScore += points;
  } else if (this.teamB.equals(player.team)) {
    this.teamBScore += points;
  }


  await this.save();
  
};

matchSchema.methods.addPointsOnlyTeam = async function (teamId , points){
  if (this.teamA.equals(teamId)) {
    this.teamAScore += points;
  } else if (this.teamB.equals(teamId)) {
    this.teamBScore += points;
  }
  await this.save();
  
}
matchSchema.methods.removePointsOnlyTeam = async function (teamId , points){
  if (this.teamA.equals(teamId)) {
    this.teamAScore -= points;
  } else if (this.teamB.equals(teamId)) {
    this.teamBScore -= points;
  }
  await this.save();
}
matchSchema.methods.popPoints = async function (playerId, type) {
  const playerStat = this.playerStats.find(stat => stat.player.toString() === playerId);

  if (!playerStat) {
    throw new Error("Player not found in match");
  }

  // Fetch the player's team details
  const player = await mongoose.model("Player").findById(playerId).select("team");

  if (!playerStat || (type === "raid" && playerStat.raidPoints.length === 0) || (type === "defense" && playerStat.defensePoints.length === 0)) {
    throw new Error(`No ${type} points to remove for this player`);
  }

  let removedPoint = 0; // Declare removedPoint before conditionals

  // Update defense points and team score
  if (type === "defense") {
    removedPoint = playerStat.defensePoints.pop();
  } else if (type === "raid") {
    removedPoint = playerStat.raidPoints.pop();
  }

  if (removedPoint !== undefined) {
    if (this.teamA.equals(player.team)) {
      this.teamAScore -= removedPoint;
    } else if (this.teamB.equals(player.team)) {
      this.teamBScore -= removedPoint;
    }
  }

  await this.save();
  return removedPoint;
};

matchSchema.statics.getTopRaiders = async function () {
  const topRaiders = await this.aggregate([
    { $unwind: "$playerStats" }, // Flatten playerStats array
    {
      $project: {
        player: "$playerStats.player",
        totalRaidPoints: { $sum: "$playerStats.raidPoints" }, // Sum raid points
      },
    },
    { $match: { totalRaidPoints: { $gt: 0 } } }, // Remove players with 0 points
    { $sort: { totalRaidPoints: -1 } }, // Sort in descending order
    { $limit: 10 }, // Limit to top 10 (optional)
    {
      $lookup: {
        from: "players",
        localField: "player",
        foreignField: "_id",
        as: "playerDetails",
      },
    },
    { $unwind: "$playerDetails" }, // Unwind playerDetails
    {
      $lookup: {
        from: "teams",
        localField: "playerDetails.team",
        foreignField: "_id",
        as: "teamDetails",
      },
    },
    { $unwind: "$teamDetails" }, // Unwind teamDetails
    {
      $project: {
        _id: 0,
        playerId: "$playerDetails._id",
        name: "$playerDetails.name",
        teamName: "$teamDetails.name",
        totalRaidPoints: 1,
      },
    },
  ]);

  return topRaiders;
};

matchSchema.statics.getTopDefenders = async function () {
  const topDefenders = await this.aggregate([
    { $unwind: "$playerStats" }, // Flatten playerStats array
    {
      $project: {
        player: "$playerStats.player",
        totalDefensePoints: { $sum: "$playerStats.defensePoints" }, // Sum defense points
      },
    },
    { $match: { totalDefensePoints: { $gt: 0 } } }, // Remove players with 0 points
    { $sort: { totalDefensePoints: -1 } }, // Sort in descending order
    { $limit: 10 }, // Limit to top 10 (optional)
    {
      $lookup: {
        from: "players",
        localField: "player",
        foreignField: "_id",
        as: "playerDetails",
      },
    },
    { $unwind: "$playerDetails" }, // Unwind playerDetails
    {
      $lookup: {
        from: "teams",
        localField: "playerDetails.team",
        foreignField: "_id",
        as: "teamDetails",
      },
    },
    { $unwind: "$teamDetails" }, // Unwind teamDetails
    {
      $project: {
        _id: 0,
        playerId: "$playerDetails._id",
        name: "$playerDetails.name",
        teamName: "$teamDetails.name",
        totalDefensePoints: 1,
      },
    },
  ]);

  return topDefenders;
};



const Match = mongoose.model("Match", matchSchema);
module.exports = Match;
