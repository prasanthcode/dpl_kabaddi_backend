const asyncHandler = require("express-async-handler");
const { register, login, getProfile } = require("../services/authService");

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await register({ name, email, password });
  res.status(201).json(result);
});

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await getProfile(req.user.id);
  res.status(200).json(user);
});

exports.getToken = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await login({ email, password });
  res.status(200).json(result);
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token required" });
  }
  const result = await refreshToken(refreshToken);
  res.status(200).json(result);
});
