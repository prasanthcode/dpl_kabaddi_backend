const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

async function uploadImageFromFile(file) {
  const filePath = file.path;

  try {
    // Convert to base64
    const fileData = fs.readFileSync(filePath, { encoding: "base64" });
    const mimeType = file.mimetype;
    const base64Data = `data:${mimeType};base64,${fileData}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Data, {
      folder: "uploads",
    });

    return result.secure_url;
  } finally {
    // Delete temp file
    fs.unlinkSync(filePath);
  }
}

async function uploadImageFromUrl(url) {
  const result = await cloudinary.uploader.upload(url, { folder: "uploads" });
  return result.secure_url;
}

async function deleteImage(publicId) {
  const result = await cloudinary.uploader.destroy(publicId);
  return result;
}
async function replaceImage(oldUrl, file) {
  // Delete old image if exists
  if (oldUrl) {
    const parts = oldUrl.split("/");
    const lastPart = parts[parts.length - 1]; // filename.ext
    const publicId = `uploads/${lastPart.split(".")[0]}`;
    await deleteImage(publicId);
  }

  // Upload new file
  const newUrl = await uploadImageFromFile(file);
  return newUrl;
}
module.exports = {
  uploadImageFromFile,
  uploadImageFromUrl,
  deleteImage,
  replaceImage,
};
