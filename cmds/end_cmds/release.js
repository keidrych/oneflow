const co = require('co')
const debug = require('debug')('of:endRelease')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())

const ns = {}

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
			sp.start('releasing ' + mergeTag + '…')
			try {
				const execArgs = [
					mergeTag,
					'--non-interactive',
					argv.gitonly ? '--no-npm.publish' : ''
				]
				yield standardVersion()
			} catch (err) {
				sp.fail().stop()
				log.error(err)
				process.exit()
			}
			sp.succeed()

			// TODO remove pre-release assests if relevant
			if (branchType) {
			}

			yield git.checkout('develop')
		}

		// --resume=true
		try {
			sp.start('merging ' + branch + ' into develop…')
			yield git.merge([branch])
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
		yield git.deleteLocalBranch(branch)
		sp.succeed()

		sp.start('deleting remote branch…')
		yield git.push('origin', ':' + branch)
		sp.succeed()

		sp.start('checking out master branch…')
		yield git.checkout('master')
		sp.succeed()

		sp.start('merging master from ' + mergeTag + '…')
		yield git.merge(['--ff-only', mergeTag])
		sp.succeed()

		sp.start('checking out develop branch…')
		yield git.checkout('develop')
		sp.succeed()

		sp.start('peristing all branch changes remotely…')
		yield git.raw(['push', '--all'])
		sp.succeed().stop()
	}).catch(err => {
		log.debug(err)
	})
}

module.exports = ns
