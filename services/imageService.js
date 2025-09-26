const cloudinary = require("../config/cloudinary");

// Upload from memory buffer
async function uploadImageFromBuffer(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "uploads" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    uploadStream.end(file.buffer);
  });
}

async function uploadImageFromUrl(url) {
  const result = await cloudinary.uploader.upload(url, { folder: "uploads" });
  return result.secure_url;
}

async function deleteImage(publicId) {
  return await cloudinary.uploader.destroy(publicId);
}

async function replaceImage(oldUrl, file) {
  if (oldUrl) {
    const parts = oldUrl.split("/");
    const lastPart = parts[parts.length - 1];
    const publicId = `uploads/${lastPart.split(".")[0]}`;
    await deleteImage(publicId);
  }
  return await uploadImageFromBuffer(file);
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
    return lastPart.split(".")[0];
  } catch (err) {
    console.error("Error extracting publicId from URL:", err.message);
    return null;
  }
}

module.exports = {
  uploadImageFromBuffer,
  uploadImageFromUrl,
  deleteImage,
  replaceImage,
  deleteImageByUrl,
  getPublicIdFromUrl,
};
