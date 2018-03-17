const co = require('co')
const debug = require('debug')('of:endRelease')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())
const ora = require('ora')

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
	const sp = ora().start()
	co(function*() {
		sp.text = 'checking release branch exists…'
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

		sp.text = 'ensure working directory is clean…'
		const status = yield git.status()
		const dirStatus = (({conflicted, created, deleted, modified, renamed}) => ({
			conflicted,
			created,
			deleted,
			modified,
			renamed
		}))(status)
		const dirCheckOk = Object.keys(dirStatus).map(item => {
			return dirStatus[item].length > 0
		})
		const dirOk = !dirCheckOk.includes(true)
		if (!dirOk) {
			sp.fail().stop()
			log.error('Working Directory must be clean')
			process.exit()
		}
		sp.succeed()

		let bump
		sp.text = 'promoting SemVer tag if necessary…'
		bump = yield global.getConventionalRecommendedBump('angular')
		debug('bump', bump)
		let mergeTag = branch
		if (bump.includes('major')) {
			// migrate branch to next major version
			mergeTag = mergeTag
				.replace('release/', '')
				.match(/v*[0-9]+\.[0-9]+\.[0-9]+/)[0]
				.split('.')
			mergeTag[0] = Number(mergeTag[0]) + 1
			mergeTag[1] = 0
			mergeTag[2] = 0
			mergeTag = 'release/' + mergeTag.join('.')
		}
		sp.succeed()
		mergeTag = mergeTag
			.replace('release/', '')
			.match(/v*[0-9]+\.[0-9]+\.[0-9]+/)[0]

		debug('branchType', branchType)
		debug('argv.resume', argv.resume)
		debug('argv.gitonly', argv.gitonly)
		if (!argv.resume) {
			sp.text = 'releasing ' + mergeTag + '…'
			try {
				const execArgs = [
					mergeTag,
					'--non-interactive',
					argv.gitonly ? '--no-npm.publish' : ''
				]
				const execVal = yield execa('./node_modules/.bin/release-it', execArgs)
				console.log(execVal)
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
			sp.text = 'merging ' + branch + ' into develop…'
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

		sp.text = 'persisting tags remotely…'
		yield git.pushTags('origin')
		sp.succeed()

		sp.text = 'deleting local branch…'
		yield git.deleteLocalBranch(branch)
		sp.succeed()

		sp.text = 'deleting remote branch…'
		yield git.push('origin', ':' + branch)
		sp.succeed()

		sp.text = 'checking out master branch…'
		yield git.checkout('master')
		sp.succeed()

		sp.text = 'merging master from ' + mergeTag + '…'
		yield git.merge(['--ff-only', mergeTag])
		sp.succeed()

		sp.text = 'checking out develop branch…'
		yield git.checkout('develop')
		sp.succeed()

		sp.text = 'peristing all branch changes remotely…'
		yield git.raw(['push', '--all'])
		sp.succeed().stop()
	}).catch(err => {
		log.debug(err)
	})
}

module.exports = ns
