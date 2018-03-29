const co = require('co')
const common = require('^lib/common')
const debug = require('debug')('of:startRelease')
const git = require('simple-git/promise')(process.cwd())
const readPkg = require('read-pkg')

const ns = {}

ns.command = 'release [pre] [bump]'
ns.aliases = ['rel', 'r']
ns.desc =
	"Creates a Pre-release from 'develop'. Pre-release branches will convert to release branches when 'end' command issued. If branch matching pre-release type already exists this command will release a new update from that branch i.e. 2.0.0-beta.0 -> 2.0.0-beta.1"
ns.builder = yargs => {
	yargs.options({
		bump: {
			choices: ['major', 'minor'],
			desc:
				"Force SemVer increment by type, omitting auto-increments based on changelog (angular format). SemVer Patch is omitted as 'HotFix' should be used instead of 'release'",
			default: 'minor'
		}
	})
	yargs.positional('pre', {
		choices: ['alpha', 'beta', 'rc', 'next'],
		desc:
			'Optional pre-release type, if specified a pre-release will be pushed to github & npm. Ignored if on a pre-release branch.',
		type: 'string'
	})
}
ns.handler = argv => {
	co(function*() {
		const noCreateDevelop = yield common.ensureDevelop(false)
		if (!noCreateDevelop) {
			sp
				.start()
				.fail(
					'Develop branch must have at least one commit after porting from master before a release can be done'
				)
				.stop()
			process.exit()
		}

		if (!argv.pre) {
			sp.start(
				"'pre' not provided… checking if current branch is a pre-release type…"
			)
			let branchType = branches.current.match(/alpha|beta|rc/)
			branchType = branchType ? branchType[0] : false
			if (branchType) {
				sp.succeed(`'pre' assigned to type '${branchType}'`)
				argv.pre = branchType
			} else {
				sp.info("'pre' defaulted to type 'rc'")
				argv.pre = 'rc'
			}
		}

		yield isCleanWorkDir(git)

		const noCreateBranch = yield common.searchCheckoutBranch(
			'release',
			argv.pre
		)

		const pkgPre = yield readPkg(process.cwd())
		const preBranch = 'release/v' + pkgPre.version
		if (branchType) {
			argv.pre = branchType
		}

		debug('pre', argv.pre)
		let draftRelease = false
		const svArgs = []
		if (argv.bump) svArgs['--releaseAs'] = argv.bump
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

		yield common.standardVersion(svArgs)

		const pkg = yield readPkg(process.cwd())
		const tag = 'v' + pkg.version
		const branchName = 'release/' + tag
		debug('branchName', branchName)
		debug('tag', tag)
		if (noCreateBranch) {
			// rename branch to new release version and release: github-releaser prioritizes branch name for releases
			debug('preBranch', preBranch)
			sp.start('rename branch to new release version')
			yield git.raw(['branch', '-m', branchName])
			yield git.push('origin', ':' + preBranch)
		} else {
			sp.start(`creating ${branchName} from tag ${tag} …`)
			yield git.checkoutBranch(branchName, tag)
			sp.succeed()

			sp.start('persisting branch remotely…')
		}
		yield git.push(['-u', 'origin', branchName])
		sp.succeed()

		// Release
		if (!argv['no-release']) {
			if (!argv['no-npm']) yield common.releaseNPM(npArgs)
			if (!argv['no-github']) yield common.releaseGitHub(argv, draftRelease)
		}

		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
