const co = require('co')
const debug = require('debug')('of:trunkHotFix')
const git = require('simple-git/promise')(process.cwd())

const ns = {}

ns.command = 'hotfix'
ns.aliases = ['hot-fix', 'fix', 'h']
ns.desc = "Automanage HotFix branch, based on latest tag in 'master'"
ns.builder = yargs => {
	yargs
		.options({
			resume: {
				desc: 'resume after a merge conflict',
				type: 'boolean'
			}
		})
		.boolean('resume')
}
ns.handler = argv => {
	co(function*() {
		const noCreateDevelop = yield common.ensureDevelop(false)
		if (!noCreateDevelop) {
			sp
				.start()
				.fail(
					'Develop branch must already exist and have completed a release onto master branch before a HotFix can be done'
				)
				.stop()
			process.exit()
		}

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

		if (branchExists) {
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
				// migrate branch to next major version
			}
			sp.succeed()

			debug('argv.resume', argv.resume)
			if (!argv.resume) yield common.standardVersion(['--releaseAs=patch'])

			// --resume=true
			const tag = yield common.mergeDevelop()

			yield common.syncMaster(tag)

			yield common.purgeBranch(branchName)

			sp.start('peristing all branch changes remotely…')
			yield git.raw(['push', '--all'])
			sp.succeed()

			// Release
			if (!argv['no-release']) {
				if (!argv['no-npm'])
					yield common.releaseNPM(['publish', '--tag=latest'])
				if (!argv['no-github']) yield common.releaseGitHub(argv, tag)
			}
		} else {
			sp.start('checking out master')
			yield git.checkout('master')
			sp.succeed()

			sp.start('checking for prior release tag…')
			const tags = yield git.tags()
			try {
				tagLatest = yield git.raw(['describe', '--tags'])
			} catch (err) {
				sp.fail().stop()
				log.error('At least one release must have occurred prior to HotFix')
				process.exit()
			}
			tagLatest = tagLatest.replace(/\n/, '')
			sp.succeed()

			bumpTag = tagLatest.split('.')
			debug('bumpTag', bumpTag)
			bumpTag[2] = Number(bumpTag[2]) + 1
			bumpTag = bumpTag.join('.')
			debug('bumpTag', bumpTag)

			let branchName = 'hotfix/' + bumpTag

			yield common.createBranch(branchName, tagLatest)
		}
		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
