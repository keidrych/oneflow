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
