const debug = require('debug')('of:feature')
const git = require('simple-git/promise')(process.cwd())
const co = require('co')
const ns = {}

ns.command = 'feature [branch-name]'
ns.aliases = ['feat', 'f']
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
		const isCurrent = branches.current.match(/feature/) !== null
		debug('branch', branches.current)
		debug('isCurrent', isCurrent)
		let branch = argv['branch-name']
		if (!isCurrent) {
			if (typeof branch !== 'undefined') {
				branch = branch.includes('feature') ? branch : 'feature/' + branch
				yield git.checkout(branch)
			} else {
				log.error(
					'Must either be on feature branch to close or specify branch name via --branch-name'
				)
				process.exit()
			}
		} else {
			branch = branches.current
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

		try {
			yield git.rebase(['develop'])
		} catch (err) {
			pico.error('Resolve Rebase Merge Conflict and re-run command')
			pico.error(err)
			process.exit()
		}
		yield git.checkout('develop')
		yield git.merge(['--no-ff', branch])
		yield git.push('origin', 'develop')
		yield git.deleteLocalBranch(branch)
		yield git.push('origin', ':' + branch)
	})
}

module.exports = ns
