const express = require("express");
const { getTopPlayers, getTopTeams } = require("../controllers/statsController");

const router = express.Router();
router.get("/top-players", getTopPlayers);
router.get("/top-teams",getTopTeams);
module.exports = router;