const co = require('co')
const debug = require('debug')('of:endHotFix')
const execa = require('execa')
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
		const branches = yield git.branch()
		yield branches.all.map(
			co.wrap(function*(branch) {
				if (branch.match(/hotfix/) !== null) {
					debug(branch)
					yield git.checkout(branch)
				}
				return true
			})
		)

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
		let mergeTag
		if (bump.match(/major|minor/)) {
			log.error(
				"HotFix 'must' be SemVer 'Patch' type, changelog detected 'Major/Minor'"
			)
			process.exit()
			// migrate branch to next major version
		}
		mergeTag = mergeTag
			.replace('hotfix/', '')
			.match(/v*[0-9]+\.[0-9]+\.[0-9]+/)[0]

		debug('branchType', branchType)

		if (!argv.resume) {
			try {
				const execArgs = [mergeTag, '--non-interactive']
				const execVal = yield execa('./node_modules/.bin/release-it', execArgs)
				console.log(execVal)
			} catch (err) {
				log.error(err)
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
		yield git.merge([branch])
		yield git.pushTags('origin')
		yield git.push('origin', 'develop')
		yield git.deleteLocalBranch(branch)
		yield git.push('origin', ':' + branch)

		// fast-forwad master to latest hotfix tag
		yield git.checkout('master')
		yield git.merge(['--ff-only', mergeTag])
	}).catch(err => {
		log.debug(err)
	})
}

module.exports = ns
