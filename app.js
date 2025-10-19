const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/teams", require("./routes/teamRoutes"));
app.use("/api/players", require("./routes/playerRoutes"));
app.use("/api/matches", require("./routes/matchRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/points", require("./routes/pointsRoutes"));
app.use("/api/gallery", require("./routes/galleryRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use(notFound);

app.use(errorHandler);
module.exports = app;
