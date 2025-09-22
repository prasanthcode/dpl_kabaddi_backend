const Team = require("../models/Team");
const {
  replaceImage,
  uploadImageFromFile,
  deleteImageByUrl,
} = require("./imageService");

async function getTeams() {
  const teams = await Team.find({}, "_id name logo").sort({ name: 1 });

  return teams;
}

async function getTeamById(teamId) {
  const team = await Team.findById(teamId);
  if (!team) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }
  return team;
}

async function createTeam({ name, logoFile }) {
  let logoUrl = null;

  if (logoFile) {
    logoUrl = await uploadImageFromFile(logoFile);
  }

  const newTeam = new Team({
    name,
    logo: logoUrl,
  });

  await newTeam.save();
  return newTeam;
}

async function deleteTeam(teamId) {
  const team = await Team.findById(teamId);

  if (!team) {
    throw new Error("Team not found");
  }

  if (team.logoUrl) {
    await deleteImageByUrl(team.logoUrl);
  }

  await team.deleteOne();

  return { message: "Team and logo deleted successfully" };
}

async function updateTeam(teamId, updateData) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error("Team not found");

  if (updateData.name) {
    team.name = updateData.name;
  }

  if (updateData.logoFile) {
    team.logo = await replaceImage(team.logo, updateData.logoFile);
  }

  await team.save();
  return team;
}

async function getTeamNameById(teamId) {
  if (!teamId) return null;
  try {
    const team = await Team.findById(teamId).select("name");
    return team ? team.name : null;
  } catch (err) {
    console.error("Error fetching team name:", err);
    return null;
  }
}
module.exports = {
  getTeams,
  deleteTeam,
  createTeam,
  updateTeam,
  getTeamById,
  getTeamNameById,
};
