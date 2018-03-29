const co = require('co')
const common = require('^lib/common')
const debug = require('debug')('of:feature')
const git = require('simple-git/promise')(process.cwd())

const ns = {}

ns.command = 'feature [resume]'
ns.aliases = ['feat', 'f']
ns.desc = 'Close feature branch'
ns.builder = yargs => {
	yargs.options({
		resume: {
			desc: 'resume after a merge conflict',
			type: 'boolean'
		}
	})
}
ns.handler = argv => {
	co(function*() {
		const branchExists = yield common.searchCheckoutBranch('feature')

		if (!branchExists && !argv.resume) {
			sp
				.start()
				.fail(
					"No Feature Branches Available… did you mean to run 'oneflow new feature <branch>'"
				)
				.stop()
			process.exit()
		}

		yield isCleanWorkDir(git)

		let branchName = yield git.branch()
		branchName = branchName.current

		sp.start(`attempting to rebase ${branch} from develop…`)
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

		sp.start(`merging ${branchName} into develop…`)
		yield git.merge(['--no-ff', branchName])
		sp.succeed()

		yield common.purgeBranch(branchName)

		sp.start('persisting develop remotely')
		yield git.push('origin', 'develop')
		sp.succeed()

		sp.stop()
	}).catch(log.error)
}

module.exports = ns
