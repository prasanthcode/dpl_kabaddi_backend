const Player = require("../models/Player");
const Team = require("../models/Team");
async function search(query) {
  if (!query || query.trim() === "") return [];

  const regex = new RegExp(query, "i");

  const [players, teams] = await Promise.all([
    Player.find({ name: regex }).select("name _id"),
    Team.find({ name: regex }).select("name _id"),
  ]);

  return {
    players,
    teams,
  };
}

module.exports = { search };
