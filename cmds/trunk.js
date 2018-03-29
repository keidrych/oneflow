const debug = require('debug')('of:trunk')
const co = require('co')
require('rooty')()

const ns = {}

process.on('unhandledRejection', (reason, p) => {
	global.sp.stop()
	log.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
	process.exit()
})

ns.command = 'trunk <type> [no-release] [no-github] [no-npm]'
ns.aliases = ['t']
ns.desc =
	'Trunk based development branch of GitFlow, releases cut from latest commit, hotfixes auto detect and close, features are assumed to be tracked via GIT commit logs'
ns.builder = yargs => {
	return yargs
		.commandDir('trunk_cmds')
		.options({
			'no-release': {
				desc: "Don't Release to any publish endpoints",
				type: 'boolean'
			},
			'no-github': {
				desc: 'Disable GitHub Release',
				type: 'boolean'
			},
			'no-npm': {desc: 'Disable NPM Release', type: 'boolean'}
		})
		.boolean(['resume', 'no-release', 'github', 'npm'])
}
ns.handler = function(argv) {}

module.exports = ns
