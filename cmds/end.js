const debug = require('debug')('of:end')
const co = require('co')
require('rooty')()

const ns = {}

process.on('unhandledRejection', (reason, p) => {
	global.sp.stop()
	log.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
	process.exit()
})

ns.command = 'end <type> [gitonly]'
ns.aliases = ['stop', 'close', 'merge', 'c', 'e']
ns.desc =
	'Merge & Delete a branch of <type> following Option#3 in OneFlow. Autovalidaes release number and increments if necessary'
ns.builder = yargs => {
	return yargs
		.commandDir('end_cmds')
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
