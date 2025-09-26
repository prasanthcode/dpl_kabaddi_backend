const Gallery = require("../models/Gallery");
const {
  uploadImageFromUrl,
  replaceImage,
  deleteImageByUrl,
  uploadImageFromBuffer,
} = require("../services/imageService");
async function getGalleries(type) {
  const filter = {};
  if (type) filter.type = type;

  return await Gallery.find(filter).sort({ createdAt: -1 });
}
async function addGallery({ file, url, caption, type }) {
  let imageUrl;

  if (file) {
    imageUrl = await uploadImageFromBuffer(file);
  } else if (url) {
    imageUrl = await uploadImageFromUrl(url);
  } else {
    const error = new Error("Image file or URL is required");
    error.statusCode = 400;
    throw error;
  }

  const gallery = new Gallery({
    url: imageUrl,
    caption,
    type,
  });

  await gallery.save();
  return gallery;
}

async function updateGallery(galleryId, { file, url, caption, type }) {
  const gallery = await Gallery.findById(galleryId);
  if (!gallery) {
    const error = new Error("Gallery not found");
    error.statusCode = 404;
    throw error;
  }

  if (file) {
    gallery.url = await replaceImage(gallery.url, file);
  } else if (url) {
    await deleteImageByUrl(gallery.url);
    gallery.url = await uploadImageFromUrl(url);
  }

  if (caption !== undefined) gallery.caption = caption;
  if (type !== undefined) gallery.type = type;

  await gallery.save();
  return gallery;
}

async function removeGallery(galleryId) {
  const gallery = await Gallery.findById(galleryId);
  if (!gallery) {
    const error = new Error("Gallery not found");
    error.statusCode = 404;
    throw error;
  }

  await deleteImageByUrl(gallery.url);
  await gallery.deleteOne();

  return { message: "Gallery deleted successfully" };
}

module.exports = {
  addGallery,
  updateGallery,
  removeGallery,
  getGalleries,
};
