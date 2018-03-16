const debug = require('debug')('of:end')
const co = require('co')
const ns = {}

ns.command = 'end <type>'
ns.aliases = ['stop', 'close', 'merge', 'c', 'e']
ns.desc =
	'Merge & Delete a branch of <type> following Option#3 in OneFlow. Autovalidaes release number and increments if necessary'
ns.builder = yargs => {
	return yargs.commandDir('end_cmds')
}
ns.handler = function(argv) {}

module.exports = ns
