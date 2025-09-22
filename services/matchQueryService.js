const Match = require("../models/Match");
const { getPointsTable } = require("./statsService.js");

async function getAllMatches() {
  return await Match.find()
    .select("_id matchNumber matchType date status")
    .populate({
      path: "teamA",
      select: "_id name logo",
    })
    .populate({
      path: "teamB",
      select: "_id name logo",
    })
    .sort({ matchNumber: -1 });
}

async function getMatch(matchId) {
  const match = await Match.findById(matchId)
    .populate("teamA", "name")
    .populate("teamB", "name")
    .populate("playerStats.player", "name team");

  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  return match;
}
async function getOngoingMatches(limit = 1) {
  const matches = await Match.find({ status: "Ongoing" })
    .populate("teamA", "name logo")
    .populate("teamB", "name logo")
    .select(
      "_id date teamA teamB teamAScore teamBScore matchNumber halfTime matchType status"
    )
    .limit(limit);

  return matches.map((match) => ({
    matchId: match._id,
    date: match.date,
    matchNumber: match.matchNumber,
    matchType: match.matchType,
    halfTime: match.halfTime,
    status: match.status,
    teamA: {
      name: match.teamA.name,
      logo: match.teamA.logo,
      score: match.teamAScore,
    },
    teamB: {
      name: match.teamB.name,
      logo: match.teamB.logo,
      score: match.teamBScore,
    },
  }));
}

async function getUpcomingMatches(limit = null) {
  const playoffStages = ["Eliminator", "Qualifier 1", "Qualifier 2", "Final"];

  const allPlayoffMatches = await Match.find({
    matchType: { $in: playoffStages },
  })
    .populate("teamA", "name logo")
    .populate("teamB", "name logo")
    .select("matchType status teamA teamB teamAScore teamBScore");

  const matchWinners = {};
  let qualifier1Loser = null;
  const existingMatches = new Set();

  allPlayoffMatches.forEach((match) => {
    if (match.status === "Completed" || match.status === "Ongoing") {
      existingMatches.add(match.matchType);
    }
    if (match.status === "Completed") {
      const winner =
        match.teamAScore > match.teamBScore ? match.teamA : match.teamB;
      matchWinners[match.matchType] = winner;

      if (match.matchType === "Qualifier 1") {
        qualifier1Loser =
          match.teamAScore > match.teamBScore ? match.teamB : match.teamA;
      }
    }
  });

  const standings = await getPointsTable();
  const top4 = standings.filter((t) => t.qualifier);

  let query = Match.find({ status: "Upcoming" })
    .populate("teamA", "name logo")
    .populate("teamB", "name logo")
    .sort({ date: 1, matchNumber: -1 })
    .select("_id date teamA teamB matchNumber matchType");

  if (limit) query = query.limit(limit);

  const matches = await query;

  const formattedMatches = matches.map((match) => ({
    matchId: match._id,
    matchType: match.matchType,
    matchNumber: match.matchNumber,
    date: match.date || "To be Announced",
    teamA: {
      name: match.teamA?.name || "TBD",
      logo: match.teamA?.logo || "https://dummyimage.com/100",
    },
    teamB: {
      name: match.teamB?.name || "TBD",
      logo: match.teamB?.logo || "https://dummyimage.com/100",
    },
  }));

  playoffStages.forEach((matchType) => {
    if (
      existingMatches.has(matchType) ||
      matches.some((m) => m.matchType === matchType)
    )
      return;

    const dummyMatch = {
      matchId: `dummy-${matchType.toLowerCase().replace(/\s+/g, "-")}`,
      matchType,
      matchNumber: null,
      date: "To be Announced",
      teamA: { name: "TBD", logo: "https://placehold.co/100x100?text=DPL" },
      teamB: { name: "TBD", logo: "https://placehold.co/100x100?text=DPL" },
    };

    if (top4.length === 4) {
      if (matchType === "Qualifier 1") {
        dummyMatch.teamA = { name: top4[0].teamName, logo: top4[0].logo };
        dummyMatch.teamB = { name: top4[1].teamName, logo: top4[1].logo };
      } else if (matchType === "Eliminator") {
        dummyMatch.teamA = { name: top4[2].teamName, logo: top4[2].logo };
        dummyMatch.teamB = { name: top4[3].teamName, logo: top4[3].logo };
      } else if (matchType === "Qualifier 2") {
        if (matchWinners["Eliminator"]) {
          dummyMatch.teamA = {
            name: matchWinners["Eliminator"].name,
            logo: matchWinners["Eliminator"].logo,
          };
        }
        if (qualifier1Loser) {
          dummyMatch.teamB = {
            name: qualifier1Loser.name,
            logo: qualifier1Loser.logo,
          };
        }
      } else if (matchType === "Final") {
        if (matchWinners["Qualifier 1"]) {
          dummyMatch.teamA = {
            name: matchWinners["Qualifier 1"].name,
            logo: matchWinners["Qualifier 1"].logo,
          };
        }
        if (matchWinners["Qualifier 2"]) {
          dummyMatch.teamB = {
            name: matchWinners["Qualifier 2"].name,
            logo: matchWinners["Qualifier 2"].logo,
          };
        }
      }
    }

    formattedMatches.push(dummyMatch);
  });

  return formattedMatches;
}

async function getCompletedMatches(limit = null) {
  let query = Match.find({ status: "Completed" })
    .populate("teamA", "name logo")
    .populate("teamB", "name logo")
    .sort({ date: -1, matchNumber: -1 })
    .select(
      "_id date teamA teamB teamAScore teamBScore matchNumber matchType status halfTime"
    );

  if (limit) query = query.limit(limit);

  const matches = await query;

  const formattedMatches = matches.map((match) => ({
    matchId: match._id,
    matchNumber: match.matchNumber,
    matchType: match.matchType,
    date: match.date,
    halfTime: match.halfTime,
    status: match.status,
    teamA: {
      name: match.teamA.name,
      logo: match.teamA.logo,
      score: match.teamAScore,
    },
    teamB: {
      name: match.teamB.name,
      logo: match.teamB.logo,
      score: match.teamBScore,
    },
  }));

  return formattedMatches;
}

async function getMatchScoresById(matchId) {
  const match = await Match.findById(matchId).populate("teamA teamB");
  if (!match) {
    const error = new Error("Match not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    teamA: {
      name: match.teamA.name,
      score: match.teamAScore,
      logo: match.teamA.logo,
      matCount: match.teamAMat,
    },
    teamB: {
      name: match.teamB.name,
      score: match.teamBScore,
      logo: match.teamB.logo,
      matCount: match.teamBMat,
    },
    halfTime: match.halfTime,
    status: match.status,
  };
}
module.exports = {
  getUpcomingMatches,
  getCompletedMatches,
  getOngoingMatches,
  getAllMatches,
  getMatchScoresById,
  getMatch,
};
