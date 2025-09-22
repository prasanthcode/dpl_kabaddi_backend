const dotenv = require("dotenv");
const connectDB = require("./config/db");

if (process.env.NODE_ENV === "development") {
  const result = require("dotenv").config({ path: ".env.development" });
  process.env = {
    ...process.env,
    ...result.parsed,
  };
} else {
  dotenv.config();
}

connectDB();

const app = require("./app");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
