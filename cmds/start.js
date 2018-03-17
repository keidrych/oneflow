const debug = require('debug')('of:start')
const co = require('co')
const ns = {}

ns.command = 'start <type> <branch-name> [gitonly]'
ns.aliases = ['new', 'begin', 'n']
ns.desc =
	"Create & Checkout a new branch of <type> from current 'develop' branch"
ns.builder = yargs => {
	return yargs
		.commandDir('start_cmds')
		.options({
			gitonly: {desc: 'GitHub only Releases (No NPM)', type: 'boolean'}
		})
		.boolean('gitonly')
}
ns.handler = function(argv) {}

module.exports = ns
