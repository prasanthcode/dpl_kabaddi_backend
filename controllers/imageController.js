const asyncHandler = require("express-async-handler");
const imageService = require("../services/imageService");

// Upload via file
exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const url = await imageService.uploadImageFromFile(req.file);
  res.status(200).json({ url });
});

// Upload via URL
exports.uploadUrl = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "No URL provided" });

  const uploadedUrl = await imageService.uploadImageFromUrl(url);
  res.status(200).json({ url: uploadedUrl });
});

// Delete image
exports.deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId)
    return res.status(400).json({ message: "No publicId provided" });

  const result = await imageService.deleteImage(publicId);
  res.status(200).json({ result });
});
