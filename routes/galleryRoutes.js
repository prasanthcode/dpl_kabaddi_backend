const express = require("express");
const router = express.Router();
const galleryController = require("../controllers/galleryController");
const multer = require("multer");
const upload = multer({ dest: "tmp/" });

router.post("/", upload.single("file"), galleryController.addGallery);
router.put("/:id", upload.single("file"), galleryController.updateGallery);
router.delete("/:id", galleryController.removeGallery);

router.get("/", galleryController.getGalleries);

module.exports = router;
