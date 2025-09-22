const mongoose = require("mongoose");
const Player = require('./Player');
const Match = require('./Match');
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  logo: { type: String }, 
  createdAt: { type: Date, default: Date.now },
});

teamSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    const matchCount = await Match.countDocuments({
      $or: [{ teamA: this._id }, { teamB: this._id }],
    });

    if (matchCount > 0) {
      return next(new Error("Cannot delete team: team is assigned to matches."));
    }

    await Player.deleteMany({ team: this._id });
    next();
  } catch (error) {
    next(error);
  }
});


const Team = mongoose.model("Team", teamSchema);
module.exports = Team;
