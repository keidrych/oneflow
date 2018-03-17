const co = require('co')
const debug = require('debug')('of:endHotFix')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())
const ora = require('ora')

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
	const sp = ora().start()
	co(function*() {
		sp.text = 'checking HotFix branch exists…'
		const branches = yield git.branch()
		const checkHotFix = yield branches.all.map(
			co.wrap(function*(branch) {
				if (branch.match(/hotfix/) !== null) {
					debug(branch)
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

		// fast-forwad master to latest hotfix tag
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
		sp.text = "checking release notes to ensure SemVer 'patch' bump only…"
		bump = yield global.getConventionalRecommendedBump('angular')
		debug('bump', bump)
		let mergeTag
		if (bump.match(/major|minor/)) {
			sp.fail().stop()
			log.error(
				"HotFix 'must' be SemVer 'Patch' type, changelog detected 'Major/Minor'"
			)
			process.exit()
			// migrate branch to next major version
		}
		sp.succeed()
		mergeTag = mergeTag
			.replace('hotfix/', '')
			.match(/v*[0-9]+\.[0-9]+\.[0-9]+/)[0]

		debug('branchType', branchType)

		if (!argv.resume) {
			try {
				sp.text = 'releasing ' + branch + '…'
				const execArgs = [mergeTag, '--non-interactive']
				const execVal = yield execa('./node_modules/.bin/release-it', execArgs)
				console.log(execVal)
			} catch (err) {
				sp.fail().stop()
				log.error(err)
				process.exit()
			}
			yield git.checkout('develop')
			sp.succeed()
		}

		// --resume=true
		sp.text = 'merging ' + branch + ' into develop…'
		try {
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

		sp.text = 'merging master from ' + branch + '…'
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
