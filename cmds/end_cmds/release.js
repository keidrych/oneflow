const debug = require('debug')('of:feature')
const git = require('simple-git/promise')(process.cwd())
const co = require('co')
const ns = {}

ns.command = 'feature-close <branch-name>'
ns.aliases = ['close', 'fc']
ns.desc =
	"Close feature branch: <branch-name> is optional and if supplied only 'name' from 'feature/name' is needed"
ns.builder = yargs => yargs.default('value', 'true')
ns.handler = argv => {
	let branch = argv['branch-name']
	if (!branch.includes('feature/')) {
		branch = 'feature/' + branch
	}

	co(function*() {
		const branches = yield git.branchLocal()
		if (!branches.current.includes(branch)) {
			yield git.checkoutLocalBranch(branch)
		}

		// abort commit is pending
		const status = yield git.status()
		const statusCheck = (({
			conflicted,
			created,
			deleted,
			modified,
			renamed
		}) => ({conflicted, created, deleted, modified, renamed}))(status)

		const checkedStatus = Object.keys(statusCheck).map(
			item => statusCheck[item].length > 0
		)
		if (checkedStatus.includes(true)) {
			log.error('Pending Commit, process and re-run')
			process.exit()
		}

		yield git.rebase(['-i', 'develop'])
		yield git.checkoutLocalBranch('develop')
		yield git.merge(['--no-ff', branch])
		yield git.push(origin, 'develop')
		yield git.deleteLocalBranch(branch)
	})
}

module.exports = ns
