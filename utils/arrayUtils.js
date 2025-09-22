const sumArray = (arr = []) => arr.reduce((sum, val) => sum + val, 0);

const getTopN = (arr = [], key, n = 5) =>
  [...arr].sort((a, b) => b[key] - a[key]).slice(0, n);

module.exports = { sumArray, getTopN };