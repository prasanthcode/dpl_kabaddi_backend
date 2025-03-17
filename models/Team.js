const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  logo: { type: String }, // URL to team logo
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }], // Reference to players
  createdAt: { type: Date, default: Date.now },
});

const Team = mongoose.model("Team", teamSchema);
module.exports = Team;
