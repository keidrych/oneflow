const co = require('co')
const debug = require('debug')('of:endRelease')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())
const readPkg = require('read-pkg')

const ns = {}
let pkg

ns.command = 'release [branch-name] [resume]'
ns.aliases = ['rel', 'r']
ns.desc = 'Close release branch'
ns.builder = yargs => {
	yargs.options({
		'branch-name': {
			desc:
				"<branch-name> is only necessary if executing this command against a different branch. If supplied only 'name' from 'release/name' is needed"
		},
		resume: {
			desc: 'resume after a merge conflict',
			type: 'boolean'
		}
	})
}
ns.handler = argv => {
	co(function*() {
		sp.start('checking release branch exists…')
		const branches = yield git.branch()
		const isCurrent = branches.current.match(/release/)
		let branch = argv['branch-name']
		if (!isCurrent) {
			if (typeof branch !== 'undefined') {
				branch = branch.includes('release') ? branch : 'release/' + branch
				yield git.checkout(branch)
			} else {
				sp.fail().stop()
				log.error(
					'Must either be on release branch to close or specify branch name via --branch-name'
				)
				process.exit()
			}
		} else {
			branch = branches.current
		}
		sp.succeed()

		let branchType = branches.current.match(/alpha|beta|rc/)
		branchType = branchType ? branchType[0] : false

		yield isCleanWorkDir(git)

		debug('branchType', branchType)
		debug('argv.resume', argv.resume)
		debug('argv.gitonly', argv.gitonly)
		if (!argv.resume) {
			sp.start('releasing on GitHub…')
			try {
				debug('standard-version', yield execa('standard-version'))
				yield conventionalGitHubReleaser(argv)
			} catch (err) {
				sp.fail().stop()
				log.error(err)
				process.exit()
			}
			sp.succeed()

			// TODO remove pre-release assests if relevant
			if (branchType) {
			}

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

		if (!pkg) pkg = yield readPkg(process.cwd())
		const tag = 'v' + pkg.version
		// --resume=true
		sp.start('checking out develop…')
		yield git.checkout('develop')
		sp.succeed()

		try {
			sp.start('merging ' + branch + ' into develop…')
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

		sp.start('deleting local branch…')
		yield git.raw(['branch', '-D', branch])
		sp.succeed()

		sp.start('deleting remote branch…')
		yield git.push('origin', ':' + branch)
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
