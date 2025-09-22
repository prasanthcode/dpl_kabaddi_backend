const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ["post", "carousel", "teams", "other"], 
      default: "other",
    },
  },
  { timestamps: true } 
);

const Gallery = mongoose.model("Gallery", gallerySchema);
module.exports = Gallery;

