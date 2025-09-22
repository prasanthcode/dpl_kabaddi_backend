const asyncHandler = require("express-async-handler");
const {
  addGallery,
  updateGallery,
  removeGallery,
  getGalleries,
} = require("../services/galleryService");
exports.getGalleries = asyncHandler(async (req, res) => {
  const { type } = req.query;
  let galleries = await getGalleries(type);

  if (type === "teams") {
    galleries = galleries.sort((a, b) => a.caption.localeCompare(b.caption));
  }

  res.json(galleries);
});

exports.addGallery = asyncHandler(async (req, res) => {
  const { caption, type } = req.body;
  const file = req.file;
  const url = req.body.url;

  const gallery = await addGallery({ file, url, caption, type });
  res.status(201).json(gallery);
});

exports.updateGallery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { caption, type, url } = req.body;
  const file = req.file;

  const gallery = await updateGallery(id, { file, url, caption, type });
  res.json(gallery);
});

exports.removeGallery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await removeGallery(id);
  res.json(result);
});
