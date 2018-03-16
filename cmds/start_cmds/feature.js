const debug = require('debug')('of:feature')
const git = require('simple-git/promise')(process.cwd())
const co = require('co')
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
		const branches = yield git.branch()
		// create develop from master if doesn't exist in repo
		if (!branches.all.includes('develop')) {
			yield git.checkoutBranch('develop', 'master')
			yield git.push('origin', 'develop')
		}

		yield git.checkoutBranch(branch, 'develop')
		yield git.push('origin', branch)
	})
}

module.exports = ns
