const express = require("express");
const { getTeams, createTeam, deleteTeam, getTeamInfo } = require("../controllers/teamController");

const router = express.Router();

router.get("/", getTeams);
router.post("/", createTeam);
router.delete("/:id", deleteTeam);

module.exports = router;
