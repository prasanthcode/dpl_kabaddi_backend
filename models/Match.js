const mongoose = require("mongoose");
const matchSchema = new mongoose.Schema({
  matchNumber: { type: Number, required: true, unique: true },
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
  matchType: {
    type: String,
    default: "",
    enum: ["", "Regular", "Eliminator", "Qualifier 1", "Qualifier 2", "Final"]
  },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["Upcoming", "Ongoing", "Completed"], default: "Upcoming" },
  order: { type: Number, default: 0 },
  playerStats: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
      raidPoints: { type: [Number], default: [] },
      defensePoints: { type: [Number], default: [] },
    },
  ],
  halfTime: { type: Boolean, default: false },
  teamAMat: { type: Number, default: 7 }, 
  teamBMat: { type: Number, default: 7 }, 
});

const Match = mongoose.model("Match", matchSchema);
module.exports = Match;
