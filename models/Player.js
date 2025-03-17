const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  profilePic: { type: String }, // URL to player profile pic
  createdAt: { type: Date, default: Date.now },
});

const Player = mongoose.model("Player", playerSchema);
module.exports = Player;
