const express = require("express");
const { uploadImage } = require("../controllers/uploadController");

const router = express.Router();

router.post("/", uploadImage);


module.exports = router;
