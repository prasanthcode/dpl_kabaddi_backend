const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied" });
  }

  const token = authHeader.split(" ")[1]; // Extract token after "Bearer"

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user to request object
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

// Admin Middleware
exports.adminOnly = (req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ message: "Admin access required" });
  next();
};
