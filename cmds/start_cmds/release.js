const co = require('co')
const debug = require('debug')('of:startRelease')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())
const readPkg = require('read-pkg')

const ns = {}

ns.command = 'release [pre] [bump] [advanceBranch]'
ns.aliases = ['rel', 'r']
ns.desc =
	"Creates a Pre-release in 'develop' forks a branch matching release/semver. Pre-release branches will convert to release branches when 'end' command issued. If executed on a pre-release branch will release a new update from that branch i.e. 2.0.0-beta.0 -> 2.0.0-beta.1"
ns.builder = yargs => {
	yargs.options({
		advanceBranch: {
			desc: 'Specifically increment a pre-release branch by name'
		},
		bump: {
			choices: ['major', 'minor'],
			desc:
				"Force SemVer increment by type, omitting auto-increments based on changelog (angular format). SemVer Patch is omitted as 'HotFix' should be used for them",
			default: 'minor'
		}
	})
	yargs.positional('pre', {
		choices: ['alpha', 'beta', 'rc', 'next', 'official'],
		desc:
			"Optional pre-release type, if specified a pre-release will be pushed to github & npm. Ignored if on a pre-release branch. 'Official' is just a normal release branch",
		default: 'rc',
		type: 'string'
	})
}
ns.handler = argv => {
	sp.start()
	co(function*() {
		const branches = yield git.branch()
		if (argv.advanceBranch && branches.all.includes(argv.advanceBranch)) {
			yield git.checkout(argv.advanceBranch)
		}

		sp.start('checking correct branch checked out…')
		let branchType = branches.current.match(/alpha|beta|rc/)
		branchType = branchType ? branchType[0] : false
		if (!branches.current.includes('develop') && !branchType) {
			sp.fail().stop()
			log.error(
				"Releases must start from 'develop' or a release branch if incrementing pre-release"
			)
			process.exit()
		}
		sp.succeed()

		yield isCleanWorkDir(git)

		if (branchType) {
			argv.pre = branchType
		}

		debug('pre', argv.pre)
		let draftRelease = false
		const svArgs = []
		if (argv.bump) svArgs['releaseAs'] = argv.bump
		const npArgs = ['publish']
		switch (argv.pre) {
			case 'alpha':
			case 'beta':
				svArgs.push('--prerelease=' + argv.pre)
				npArgs.push('--tag=' + argv.pre)
				break
			case 'next':
			case 'rc':
				svArgs.push('--prerelease=' + argv.pre)
				npArgs.push('--tag=next')
				break
			case 'official':
				draftRelease = true
				break
			default:
		}
		try {
			sp.start('creating GitHub pre-release of type ' + argv.pre + '…')
			debug('standard-version', yield execa('standard-version', svArgs))
			yield conventionalGitHubReleaser(argv, draftRelease)
			sp.succeed()
		} catch (err) {
			sp.fail().stop()
			log.error(err)
			process.exit()
		}

		const pkg = yield readPkg(process.cwd())
		if (argv.pre !== 'official' && !argv.gitonly) {
			try {
				sp.start('creating NPM pre-release of type ' + argv.pre + '…')
				yield execa('npm', npArgs)
				sp.succeed()
			} catch (err) {
				sp.fail().stop()
				log.error(err)
				process.exit()
			}
		}

		if (!branchType) {
			let branchName =
				argv.pre !== 'official'
					? pkg.version.replace(/\.[0-9]*$/, '')
					: pkg.version
			branchName = 'release/v' + branchName
			const tag = 'v' + pkg.version
			debug('branchName', branchName)
			debug('tag', tag)

			sp.start('creating ' + branchName + 'from tag ' + tag + ' …')
			yield git.checkoutBranch(branchName, tag)
			sp.succeed()

			sp.start('persisting branch remotely…')
			yield git.push(['-u', 'origin', branchName])
			sp.succeed()
		}
		sp.start('syncing tags remotely…')
		yield git.pushTags('origin')
		sp.succeed().stop()
	}).catch(log.debug)
}

module.exports = ns
