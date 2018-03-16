const debug = require('debug')('of:feature')
const git = require('simple-git/promise')(process.cwd())
const co = require('co')
const ns = {}

ns.command = 'feature [branch-name]'
ns.aliases = ['fc']
ns.desc = 'Close feature branch'
ns.builder = yargs => {
	yargs.options({
		'branch-name': {
			desc:
				"<branch-name> is only necessary if executing this command against a different branch. If supplied only 'name' from 'feature/name' is needed"
		}
	})
}
ns.handler = argv => {
	co(function*() {
		const branches = yield git.branch()
		const isCurrent = branches.current.match(/feature/)
		let branch = argv['branch-name']
		if (!isCurrent) {
			branch = 'feature/' + branch
			yield git.checkout(branch)
		} else if ((typeof branch).includes('undefined')) {
			log.error(
				'Must either be on feature branch to close or specify branch name via --branch-name'
			)
			process.exit()
		}

		// abort if commit is pending
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
		yield git.checkout('develop')
		yield git.merge(['--no-ff', branch])
		yield git.push('origin', 'develop')
		yield git.deleteLocalBranch(branch)
		yield git.push('origin', ':' + branch)
	})
}

module.exports = ns
