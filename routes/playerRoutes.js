const express = require("express");
const {
  getPlayers,
  createPlayer,
  deletePlayer,
  getPlayersByTeam,
  getPlayerDetails,
  updatePlayer,
  getPlayerById,
} = require("../controllers/playerController");
const router = express.Router();
const multer = require("multer");
const { adminOnly, protect } = require("../middleware/authMiddleware");
const upload = multer({ dest: "tmp/" });
router.get("/", getPlayers);
router.get("/:playerId/info", getPlayerDetails);
router.get("/:playerId", getPlayerById);
router.get("/team/:teamId", getPlayersByTeam);
router.use(protect, adminOnly);
router.post("/", upload.single("profilePic"), createPlayer);
router.delete("/:id", deletePlayer);
router.patch("/:id", upload.single("profilePic"), updatePlayer);

module.exports = router;
