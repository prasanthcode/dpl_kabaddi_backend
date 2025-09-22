const fs = require("fs");
const cloudinary = require("../config/cloudinary");

async function uploadImageFromFile(file) {
  const filePath = file.path;

  try {
    const fileData = fs.readFileSync(filePath, { encoding: "base64" });
    const mimeType = file.mimetype;
    const base64Data = `data:${mimeType};base64,${fileData}`;

    const result = await cloudinary.uploader.upload(base64Data, {
      folder: "uploads",
    });

    return result.secure_url;
  } finally {
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
  if (oldUrl) {
    const parts = oldUrl.split("/");
    const lastPart = parts[parts.length - 1];
    const publicId = `uploads/${lastPart.split(".")[0]}`;
    await deleteImage(publicId);
  }

  const newUrl = await uploadImageFromFile(file);
  return newUrl;
}
async function deleteImageByUrl(url) {
  if (!url) return null;

  try {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    const publicId = `uploads/${lastPart.split(".")[0]}`;
    return await deleteImage(publicId);
  } catch (err) {
    console.error("Error extracting publicId from URL:", err.message);
    return null;
  }
}
function getPublicIdFromUrl(url) {
  if (!url) return null;

  try {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    const publicId = `${lastPart.split(".")[0]}`;
    return publicId;
  } catch (err) {
    console.error("Error extracting publicId from URL:", err.message);
    return null;
  }
}
module.exports = {
  uploadImageFromFile,
  uploadImageFromUrl,
  deleteImage,
  replaceImage,
  deleteImageByUrl,
  getPublicIdFromUrl,
};
