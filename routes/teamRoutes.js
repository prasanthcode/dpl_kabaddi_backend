const express = require("express");
const multer = require("multer");
const upload = multer({ dest: "tmp/" });
const {
  getTeams,
  createTeam,
  deleteTeam,
  updateTeam,
  getTeamById,
  teamStats,
} = require("../controllers/teamController");
const router = express.Router();

router.get("/", getTeams);
router.get("/:id/stats", teamStats);
router.get("/:teamId", getTeamById);
router.post("/", upload.single("logo"), createTeam);
router.delete("/:id", deleteTeam);
router.patch("/:id", upload.single("logo"), updateTeam);
module.exports = router;
