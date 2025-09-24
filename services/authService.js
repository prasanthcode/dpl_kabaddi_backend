const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ErrorResponse = require("../utils/errorResponse");

async function register({ name, email, password }) {
  let user = await User.findOne({ email });
  if (user) {
    throw new ErrorResponse("User already exists", 409);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user = new User({ name, email, password: hashedPassword });
  await user.save();

  return { message: "User registered successfully" };
}

async function getProfile(userId) {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ErrorResponse("User not found", 404);
  }
  return user;
}
// Generate tokens
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // short-lived
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" } // long-lived
  );

  return { accessToken, refreshToken };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new ErrorResponse("Invalid credentials", 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ErrorResponse("Invalid credentials", 401);

  const { accessToken, refreshToken } = generateTokens(user);
  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
  };
}

async function refreshTokenService(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) throw new ErrorResponse("User not found", 404);

    const { accessToken, refreshToken } = generateTokens(user);
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ErrorResponse("Invalid or expired refresh token", 401);
  }
}

module.exports = {
  refreshTokenService,
  register,
  login,
  getProfile,
};
