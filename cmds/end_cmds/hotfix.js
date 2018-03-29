const co = require('co')
const debug = require('debug')('of:endHotFix')
const git = require('simple-git/promise')(process.cwd())

const ns = {}

ns.command = 'hotfix'
ns.aliases = ['hot-fix', 'fix', 'h']
ns.desc = 'Close hotfix branch'
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
		const branchExists = yield common.searchCheckoutBranch('hotfix')

		if (!branchExists && !argv.resume) {
			sp
				.start()
				.fail(
					"No HotFix Branches Available… did you mean to run 'oneflow new hotfix'"
				)
				.stop()
			process.exit()
		}

		yield isCleanWorkDir(git)

		let branchName = yield git.branch()
		branchName = branchName.current

		let bump
		sp.start("checking release notes to ensure SemVer 'patch' bump only…")
		bump = yield global.getConventionalRecommendedBump('angular')
		debug('bump', bump)
		if (bump.match(/major|minor/)) {
			sp.fail().stop()
			log.error(
				"HotFix 'must' be SemVer 'Patch' type, changelog detected 'Major/Minor'"
			)
			process.exit()
		}
		sp.succeed()

		debug('argv.resume', argv.resume)
		if (!argv.resume) yield common.standardVersion(['--releaseAs=patch'])

		// --resume=true
		const tag = yield common.mergeDevelop()

		yield common.syncMaster(tag)

		yield common.purgeBranch(branchName)

		sp.start('peristing all branch changes remotely…')
		yield git.raw(['push', 'develop', 'master'])
		sp.succeed()

		// Release
		if (!argv['no-release']) {
			if (!argv['no-npm']) yield common.releaseNPM(['publish', '--tag=latest'])
			if (!argv['no-github']) yield common.releaseGitHub(argv, tag)
		}

		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
