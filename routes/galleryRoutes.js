const express = require("express");
const router = express.Router();
const galleryController = require("../controllers/galleryController");
const multer = require("multer");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = multer({ dest: "tmp/" });

router.get("/", galleryController.getGalleries);

router.use(protect, adminOnly);
router.post("/", upload.single("file"), galleryController.addGallery);
router.put("/:id", upload.single("file"), galleryController.updateGallery);
router.delete("/:id", galleryController.removeGallery);

module.exports = router;
