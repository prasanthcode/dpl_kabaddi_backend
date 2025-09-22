const asyncHandler = require("express-async-handler");
const {
  getTeams,
  deleteTeam,
  createTeam,
  updateTeam,
  getTeamById,
} = require("../services/teamService");

exports.getTeams = asyncHandler(async (req, res) => {
  const teams = await getTeams();
  res.status(200).json(teams);
});
exports.getTeamById = asyncHandler(async (req, res) => {

  const { teamId } = req.params;
  const team = await getTeamById(teamId);
  res.status(200).json(team);

 });
exports.createTeam = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const logoFile = req.file; 

  const newTeam = await createTeam({ name, logoFile });

  res.status(201).json(newTeam);
});


exports.deleteTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await deleteTeam(id);

  res.status(200).json(result);
});

exports.updateTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = {
    name: req.body.name,
    logoFile: req.file, 
  };
  const updatedTeam = await updateTeam(id, updateData);
  res.status(200).json(updatedTeam);
});
