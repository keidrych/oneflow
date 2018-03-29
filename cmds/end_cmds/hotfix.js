const co = require('co')
const debug = require('debug')('of:endHotFix')
const git = require('simple-git/promise')(process.cwd())
const readPkg = require('read-pkg')

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
		yield common.checkoutBranch('develop')

		const pkg = yield readPkg(process.cwd())
		const tag = 'v' + pkg.version

		sp.start(`merging ${tag} into develop…`)
		try {
			yield git.mergeFromTo(tag, 'develop')
		} catch (err) {
			sp.fail().stop()
			log.error('Resolve Merge Conflict and run command again with --resume')
			process.exit()
		}
		sp.succeed()

		sp.start('checking out master branch…')
		yield git.checkout('master')
		sp.succeed()

		sp.start(`merging master from ${tag} …`)
		yield git.merge(['--ff-only', tag])
		sp.succeed()

		sp.start('deleting local branch…')
		yield git.raw(['branch', '-D', hotfixBranch])
		sp.succeed()

		sp.start('deleting remote branch…')
		yield git.push('origin', ':' + hotfixBranch)
		sp.succeed()

		sp.start('checking out develop branch…')
		yield git.checkout('develop')
		sp.succeed()

		sp.start('peristing all branch changes remotely…')
		yield git.raw(['push', '--all'])
		sp.succeed()

		// Release
		if (!argv['no-release']) {
			if (!argv['no-npm']) yield common.releaseNPM(['publish', '--tag=latest'])
			if (!argv['no-github']) yield common.releaseGitHub(argv)
		}

		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
