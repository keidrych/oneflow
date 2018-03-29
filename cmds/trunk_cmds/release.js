const co = require('co')
const common = require('^lib/common')
const debug = require('debug')('of:endRelease')
const git = require('simple-git/promise')(process.cwd())

const ns = {}

ns.command = 'release'
ns.aliases = ['rel', 'r']
ns.desc =
	"Automanage Release of Trunk, generates SemVer tag based on log messages & releases in 'master'"
ns.builder = yargs => {
	yargs.options({})
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

		yield isCleanWorkDir(git)

		yield common.standardVersion([''])

		const pkg = yield readPkg(process.cwd())
		const tag = 'v' + pkg.version

		yield common.syncMaster(tag)

		// Release
		if (!argv['no-release']) {
			if (!argv['no-npm']) yield common.releaseNPM(['publish', '--tag=latest'])
			if (!argv['no-github']) yield common.releaseGitHub(argv, tag)
		}

		sp.stop()
	}).catch(log.debug)
}

module.exports = ns
