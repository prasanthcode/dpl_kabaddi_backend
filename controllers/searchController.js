const expressAsyncHandler = require("express-async-handler");
const { search } = require("../services/SearchService");

exports.search = expressAsyncHandler(async (req, res) => {
  const { query } = req.query;
  const data = await search(query);
  res.status(200).json(data);
});
