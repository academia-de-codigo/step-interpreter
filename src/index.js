const Interpreter = require('./interpreter');
const { execute } = require('./executor');

module.exports = Interpreter;
module.exports.execute = execute;
