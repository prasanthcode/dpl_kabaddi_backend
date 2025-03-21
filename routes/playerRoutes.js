const express = require("express");
const { getPlayers, createPlayer, deletePlayer , bulkPlayer, getPlayersByTeam, setProfilePic, getPlayerDetails} = require("../controllers/playerController");

const router = express.Router();

router.get("/", getPlayers);
router.get("/playerinfo/:playerId", getPlayerDetails);
// router.get("/topraiders", getRaiders);
// router.get("/topdefenders", getDefenders);
// router.get("/topplayers",getTopPlayers);
router.get("/:teamId", getPlayersByTeam);
router.post("/", createPlayer);
router.delete("/:id", deletePlayer);
router.post("/bulk", bulkPlayer);

router.put("/setprofilepic", setProfilePic);

module.exports = router;
