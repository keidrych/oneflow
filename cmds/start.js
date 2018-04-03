const debug = require('debug')('of:start')
const co = require('co')
require('rooty')()

const ns = {}

process.on('unhandledRejection', (reason, p) => {
	global.sp.stop()
	log.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
	process.exit()
})

ns.command = 'start <type> <branch-name> [release] [github] [npm]'
ns.aliases = ['new', 'begin', 'n']
ns.desc =
	"Create & Checkout a new branch of <type> from current 'develop' branch"
ns.builder = yargs => {
	return yargs.commandDir('start_cmds').options({
		release: {
			desc: "Don't Release to any publish endpoints",
			type: 'boolean',
			default: true
		},
		github: {
			desc: 'Disable GitHub Release',
			type: 'boolean',
			default: true
		},
		npm: {desc: 'Disable NPM Release', type: 'boolean', default: true}
	})
}
ns.handler = function(argv) {}

module.exports = ns
