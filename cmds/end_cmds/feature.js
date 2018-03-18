const debug = require('debug')('of:feature')
const git = require('simple-git/promise')(process.cwd())
const co = require('co')
const ns = {}

ns.command = 'feature [branch-name] [resume]'
ns.aliases = ['feat', 'f']
ns.desc = 'Close feature branch'
ns.builder = yargs => {
	yargs.options({
		'branch-name': {
			desc:
				"<branch-name> is only necessary if executing this command against a different branch. If supplied only 'name' from 'feature/name' is needed"
		},
		resume: {
			desc: 'resume after a merge conflict',
			type: 'boolean'
		}
	})
}
ns.handler = argv => {
	co(function*() {
		sp.start('checking correct branch checked out…')
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
				sp.fail().stop()
				log.error(
					'Must either be on feature branch to close or specify branch name via --branch-name'
				)
				process.exit()
			}
		} else {
			branch = branches.current
		}
		sp.succeed()

		yield isCleanWorkDir(git)

		sp.start('attempting to rebase ' + branch + ' from develop…')
		try {
			yield git.rebase(['develop'])
		} catch (err) {
			sp.fail().stop()
			log.error('Resolve Rebase Merge Conflict and re-run command')
			log.error(err)
			process.exit()
		}
		sp.succeed()

		sp.start('checking out develop…')
		yield git.checkout('develop')
		sp.succeed()

		sp.start('merging ' + branch + ' into develop…')
		yield git.merge(['--no-ff', branch])
		sp.succeed()

		sp.start('deleting local branch…')
		yield git.raw(['branch', '-D', branch])
		sp.succeed()

		sp.start('deleting remote branch…')
		yield git.push('origin', ':' + branch)

		sp.start('persisting develop remotely')
		yield git.push('origin', 'develop')
		sp.succeed().stop()
	}).catch(log.error)
}

module.exports = ns
