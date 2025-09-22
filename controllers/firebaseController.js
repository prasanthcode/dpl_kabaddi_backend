const asyncHandler = require("express-async-handler");
const { getConcurrentConnections } = require("../services/firebaseService");

exports.getActiveConnections = asyncHandler(async (req, res) => {
  const count = await getConcurrentConnections();
  res.json({ activeConnections: count });
});
