const express = require("express");
const { getPlayers, createPlayer, deletePlayer , bulkPlayer, getPlayersByTeam, getRaiders, getDefenders, setProfilePic} = require("../controllers/playerController");

const router = express.Router();

router.get("/", getPlayers);
router.get("/topraiders", getRaiders);
router.get("/topdefenders", getDefenders);
router.get("/:teamId", getPlayersByTeam);
router.post("/", createPlayer);
router.delete("/:id", deletePlayer);
router.post("/bulk", bulkPlayer);

router.put("/setprofilepic", setProfilePic);

module.exports = router;
