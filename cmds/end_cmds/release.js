const co = require('co')
const debug = require('debug')('of:endRelease')
const git = require('simple-git/promise')(process.cwd())
const readPkg = require('read-pkg')

const ns = {}

ns.command = 'release [resume]'
ns.aliases = ['rel', 'r']
ns.desc = 'Close release branch'
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
		const branchExists = yield common.searchCheckoutBranch('release')

		if (!branchExists && !argv.resume) {
			sp
				.start()
				.fail(
					"No Release Branches Available… did you mean to run 'oneflow new release'"
				)
				.stop()
			process.exit()
		}

		yield isCleanWorkDir(git)

		debug('argv.resume', argv.resume)
		if (!argv.resume) yield common.standardVersion([''])

		// --resume=true
		yield common.checkoutBranch('develop')

		const pkg = yield readPkg(process.cwd())
		const tag = 'v' + pkg.version

		try {
			sp.start(`merging ${tag} into develop…`)
			yield git.mergeFromTo(tag, 'develop')
		} catch (err) {
			sp.fail().stop()
			log.error('Resolve Merge Conflict and run command again with --resume')
			process.exit()
		}
		sp.succeed()

		sp.start('deleting local branch…')
		yield git.raw(['branch', '-D', branch])
		sp.succeed()

		sp.start('deleting remote branch…')
		yield git.push('origin', ':' + branch)
		sp.succeed()

		sp.start('checking out master branch…')
		yield git.checkout('master')
		sp.succeed()

		sp.start(`merging master from ${tag} …`)
		yield git.merge(['--ff-only', tag])
		sp.succeed()

		sp.start('checking out develop branch…')
		yield git.checkout('develop')
		sp.succeed()

		sp.start('peristing all branch changes remotely…')
		yield git.raw(['push', '--all'])
		sp.succeed()

		// TODO remove pre-release assests if relevant id:0 gh:2 ic:gh
		if (branchType) {
		}

		// Release
		if (!argv['no-release']) {
			if (!argv['no-npm']) yield common.releaseNPM(['publish', '--tag=latest'])
			if (!argv['no-github']) yield common.releaseGitHub(argv)
		}

		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
