const cloudinary = require("../config/cloudinary");

exports.uploadImage = async (req, res) => {
  try {
    const { image } = req.body; // Get Base64 image

    if (!image) return res.status(400).json({ message: "No image provided" });

    // Upload to Cloudinary
    const uploadedResponse = await cloudinary.uploader.upload(image, {
      folder: "uploads",
      transformation: [{ width: 300, height: 300, crop: "fill" }],
    });

    res.json({ secure_url: uploadedResponse.secure_url });
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    res.status(500).json({ message: "Upload failed", error });
  }
};
