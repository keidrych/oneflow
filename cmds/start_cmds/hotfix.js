const debug = require('debug')('of:hotfix')
const git = require('simple-git/promise')(process.cwd())
const co = require('co')
const ns = {}

ns.command = 'hotfix'
ns.aliases = ['hot-fix', 'fix', 'h']
ns.desc =
	"Creates a 'HotFix' branch based on latest tag in 'master'. If 'HotFix' branch is already exists, will switch to it"
ns.builder = yargs => {}
ns.handler = argv => {
	co(function*() {
		const branches = yield git.branch()
		yield branches.all.map(
			co.wrap(function*(branch) {
				if (branch.match(/hotfix/) !== null) {
					debug(branch)
					yield git.checkout(branch)
					process.exit()
				}
				return true
			})
		)

		yield git.checkout('master')
		const tags = yield git.tags()
		try {
			tagLatest = yield git.raw(['describe', '--tags'])
		} catch (err) {
			log.error('At least one release must have occurred prior to HotFix')
			process.exit()
		}
		tagLatest = tagLatest.replace(/\n/, '')

		bumpTag = tagLatest.split('.')
		debug('bumpTag', bumpTag)
		bumpTag[2] = Number(bumpTag[2]) + 1
		bumpTag = bumpTag.join('.')
		debug('bumpTag', bumpTag)

		let branchName = 'hotfix/' + bumpTag

		yield git.checkoutBranch(branchName, tagLatest)
		yield git.push('origin', branchName)
	}).catch(err => {
		log.debug(err)
	})
}

module.exports = ns
