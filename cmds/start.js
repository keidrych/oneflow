const debug = require('debug')('of:start')
const co = require('co')
const ns = {}

ns.command = 'start <type> <branch-name>'
ns.aliases = ['new', 'begin']
ns.desc =
	"Create & Checkout a new branch of <type> from current 'develop' branch"
ns.builder = yargs => {
	return yargs.commandDir('start_cmds')
}
ns.handler = function(argv) {}

module.exports = ns
