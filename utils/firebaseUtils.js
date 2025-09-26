const db = require("../config/firebase");
const { getPlayerNameById } = require("../services/playerService");
const { getFullMatchStats } = require("../services/statsService");
const { getTeamById } = require("../services/teamService");

async function syncMatchToFirebase(matchId, teamId = null, points = null, type = null, playerId = null) {
  const stats = await getFullMatchStats(matchId);

  let teamName = null;
  if (teamId) {
    const team = await getTeamById(teamId);
    teamName = team ? team.name : null; 
  }

  let playerName = null;
  if (playerId) {
    const player = await getPlayerNameById(playerId);
    playerName = player ? player : null;
  }

  const lastAction = {
    teamName: teamName || "Unknown Team",
    playerName: playerName || "Unknown Player",
    points: points ?? 0,
    type: type || "unknown",
    timestamp: Date.now(),
  };

  await db.ref(`matches/${matchId}`).set({
    stats,
    lastAction,
  });
}
async function clearMatchFromFirebase(matchId) {
  await db.ref(`matches/${matchId}`).remove();
}
module.exports = {
  syncMatchToFirebase,
  clearMatchFromFirebase,
};
