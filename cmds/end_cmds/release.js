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
		const branches = yield git.branch()
		const isCurrent = branches.current.match(/release/)
		let branch = argv['branch-name']
		if (!isCurrent) {
			if (typeof branch !== 'undefined') {
				branch = branch.includes('release') ? branch : 'release/' + branch
				yield git.checkout(branch)
			} else {
				log.error(
					'Must either be on release branch to close or specify branch name via --branch-name'
				)
				process.exit()
			}
		} else {
			branch = branches.current
		}

		let branchType = branches.current.match(/alpha|beta|rc/)
		branchType = branchType ? branchType[0] : false

		// ensure working directory is clean
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
			log.error('Working Directory must be clean')
			process.exit()
		}

		let bump
		let bumpTag
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
		mergeTag = mergeTag
			.replace('release/', '')
			.match(/v*[0-9]+\.[0-9]+\.[0-9]+/)[0]

		debug('branchType', branchType)
		debug('argv.resume', argv.resume)
		debug('argv.gitonly', argv.gitonly)
		if (!argv.resume) {
			try {
				const execArgs = [
					mergeTag,
					'--non-interactive',
					argv.gitonly ? '--no-npm.publish' : ''
				]
				const execVal = yield execa('./node_modules/.bin/release-it', execArgs)
				console.log(execVal)
			} catch (err) {
				log.error(err)
				process.exit()
			}

			// TODO remove pre-release assests if relevant
			if (branchType) {
			}

			yield git.checkout('develop')
		}

		// --resume=true
		try {
			yield git.merge([branch])
		} catch (err) {
			log.error(
				'Resolve Merge Conflict and run command again with --resume --branch-name ' +
					branch
			)
			process.exit()
		}
		yield git.pushTags('origin')
		yield git.push('origin', 'develop')
		yield git.deleteLocalBranch(branch)
		yield git.push('origin', ':' + branch)

		// fast-forwad master to latest release tag
		yield git.checkout('master')
		yield git.merge(['--ff-only', mergeTag])
		yield git.checkout('develop')
	}).catch(err => {
		log.debug(err)
	})
}

module.exports = ns
