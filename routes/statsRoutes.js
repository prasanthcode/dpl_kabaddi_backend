const express = require("express");
const { getTopPlayers } = require("../controllers/statsController");

const router = express.Router();
router.get("/top5", getTopPlayers);

module.exports = router;