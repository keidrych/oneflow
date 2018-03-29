const co = require('co')
const debug = require('debug')('of:endRelease')
const git = require('simple-git/promise')(process.cwd())

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

		let branchName = yield git.branch()
		branchName = branchName.current

		debug('argv.resume', argv.resume)
		if (!argv.resume) yield common.standardVersion([''])

		// --resume=true
		const tag = yield common.mergeDevelop()

		yield common.syncMaster(tag)

		yield common.purgeBranch(branchName)

		sp.start('peristing all branch changes remotely…')
		yield git.raw(['push', '--all'])
		sp.succeed()

		// TODO remove pre-release assests if relevant id:0 gh:2 ic:gh
		if (branchType) {
		}

		// Release
		if (!argv['no-release']) {
			if (!argv['no-npm']) yield common.releaseNPM(['publish', '--tag=latest'])
			if (!argv['no-github']) yield common.releaseGitHub(argv, tag)
		}

		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
