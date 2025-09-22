const db = require("../config/firebase");

async function getConcurrentConnections() {
  try {
    const snapshot = await db.ref("connections").once("value");

    if (!snapshot.exists()) {
      return 0;
    }
    return Object.keys(snapshot.val()).length;
  } catch (error) {
    console.error("Error fetching concurrent connections:", error);
    throw new Error("Failed to get concurrent connections");
  }
}

module.exports = {
  getConcurrentConnections,
};
