const co = require('co')
const debug = require('debug')('of:endHotFix')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())
const readPkg = require('read-pkg')

const ns = {}
let pkg

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
		sp.start('checking HotFix branch exists…')
		const branches = yield git.branch()
		let hotfixBranch
		const checkHotFix = yield branches.all.map(
			co.wrap(function*(branch) {
				if (branch.startsWith('hotfix')) {
					debug(branch)
					hotfixBranch = branch
					yield git.checkout(branch)
					return true
				}
				return false
			})
		)
		if (!checkHotFix.includes(true)) {
			sp.fail().stop()
			log.error("HotFix branch doesn't exist")
			process.exit()
		}
		sp.succeed()

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
			// migrate branch to next major version
		}
		sp.succeed()

		if (!argv.resume) {
			try {
				sp.start('releasing on GitHub…')
				debug(
					'standard-version',
					yield execa('standard-version', ['--releaseAs=patch'])
				)
				yield conventionalGitHubReleaser(argv)
			} catch (err) {
				sp.fail().stop()
				log.error(err)
				process.exit()
			}
			sp.succeed()

			pkg = yield readPkg(process.cwd())
			if (!argv.gitonly) {
				try {
					sp.start('releasing on NPM…')
					yield execa('npm', ['publish', '--tag=latest'])
					sp.succeed()
				} catch (err) {
					sp.fail().stop()
					log.error(err)
					process.exit()
				}
			}
		}

		// --resume=true
		if (!pkg) pkg = yield readPkg(process.cwd())
		const tag = 'v' + tag
		sp.start('checking out develop…')
		yield git.checkout('develop')
		sp.succeed()

		sp.start('merging ' + branch + ' into develop…')
		try {
			yield git.mergeFromTo(tag, 'develop')
		} catch (err) {
			sp.fail().stop()
			log.error(
				'Resolve Merge Conflict and run command again with --resume --branch-name ' +
					branch
			)
			process.exit()
		}
		sp.succeed()

		sp.start('persisting tags remotely…')
		yield git.pushTags('origin')
		sp.succeed()

		sp.start('deleting local branch…')
		yield git.raw(['branch', '-D', hotfixBranch])
		sp.succeed()

		sp.start('deleting remote branch…')
		yield git.push('origin', ':' + hotfixBranch)
		sp.succeed()

		sp.start('checking out master branch…')
		yield git.checkout('master')
		sp.succeed()

		sp.start('merging master from ' + tag + '…')
		yield git.merge(['--ff-only', tag])
		sp.succeed()

		sp.start('checking out develop branch…')
		yield git.checkout('develop')
		sp.succeed()

		sp.start('peristing all branch changes remotely…')
		yield git.raw(['push', '--all'])
		sp.succeed().stop()
	}).catch(log.debug)
}

module.exports = ns
