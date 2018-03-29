const co = require('co')
const common = require('^lib/common')
const debug = require('debug')('of:hotfix')
const git = require('simple-git/promise')(process.cwd())

const ns = {}

ns.command = 'hotfix'
ns.aliases = ['hot-fix', 'fix', 'h']
ns.desc =
	"Creates a 'HotFix' branch based on latest tag in 'master'. If 'HotFix' branch is already exists, will switch to it"
ns.builder = yargs => {}
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

		if (yield common.searchCheckoutBranch('hotfix')) process.exit()

		// HotFix branch doesn't exist, create it
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

		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
