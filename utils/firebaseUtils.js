const db = require("../config/firebase");
const { getPlayerNameById } = require("../services/playerService");
const {} = require("../services/statsService");

async function syncMatchToFirebase(
  match,
  teamId = null,
  points = null,
  type = null,
  playerId = null
) {
  const stats = {
    teamA: {
      id: match.teamA?._id?.toString() ?? null,
      name: match.teamA?.name ?? null,
      logo: match.teamA?.logo ?? null,
      score: match.teamAScore ?? 0,
    },
    teamB: {
      id: match.teamB?._id?.toString() ?? null,
      name: match.teamB?.name ?? null,
      logo: match.teamB?.logo ?? null,
      score: match.teamBScore ?? 0,
    },
    halfTime: match.halfTime ?? null,
    status: match.status ?? null,
    matchNumber: match.matchNumber ?? null,
    matchType: match.matchType ?? null,
    matchId: match._id?.toString() ?? null,
  };

  const lastAction = {
    teamName: teamId
      ? ((match.teamA?.equals(teamId)
          ? match.teamA?.name
          : match.teamB?.name) ?? "Unknown Team")
      : "Unknown Team",
    playerName: getPlayerNameById(playerId) || "Unknown Player",
    points: points ?? 0,
    type: type || "unknown",
    timestamp: Date.now(),
  };

  await db.ref(`matches/${match._id}`).update({ stats, lastAction });
}

async function clearMatchFromFirebase(matchId) {
  await db.ref(`matches/${matchId}`).remove();
}
module.exports = {
  syncMatchToFirebase,
  clearMatchFromFirebase,
};
