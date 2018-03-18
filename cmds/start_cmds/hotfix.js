const co = require('co')
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
		sp.start("checking HotFix branch doesn't exist…")
		const branches = yield git.branch()
		yield branches.all.map(
			co.wrap(function*(branch) {
				if (branch.match(/hotfix/) !== null) {
					debug(branch)
					yield git.checkout(branch)
					sp.fail().stop()
					log.error('HotFix branch already exists, switching to it')
					process.exit()
				}
				return true
			})
		)

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

		sp.start('creating ' + branchName + '…')
		yield git.checkoutBranch(branchName, tagLatest)
		sp.succeed()

		sp.start('syncing HotFix branch remotely…')
		yield git.push(['-u', 'origin', branchName])
		sp.succeed().stop()
	}).catch(log.debug)
}

module.exports = ns
