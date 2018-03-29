const co = require('co')
const common = require('^lib/common')

const ns = {}

ns.command = 'feature <branch-name>'
ns.aliases = ['feat', 'f']
ns.desc = 'Switch to a new feature branch. Creates if non-existent'
ns.builder = yargs => {
	yargs.positional('branch-name', {
		desc: "Format can be 'feature/name' or just 'name'",
		type: 'string'
	})
}
ns.handler = argv => {
	let branch = argv['branch-name']
	if (!branch.includes('feature/')) {
		branch = 'feature/' + branch
	}

	co(function*() {
		yield common.ensureDevelop()

		yield common.createBranch(branch, 'develop')

		sp.stop()
	}).catch(log.error)
}

module.exports = ns
