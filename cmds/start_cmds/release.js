const co = require('co')
const debug = require('debug')('of:startRelease')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())
const ora = require('ora')
const readPkg = require('read-pkg')

const ns = {}

ns.command = 'release [pre] [bump] [advanceBranch]'
ns.aliases = ['rel', 'r']
ns.desc =
	"Creates a Pre-release in 'develop' forks a branch matching release/semver. Pre-release branches will convert to release branches when 'end' command issued. If executed on a pre-release branch will release a new update from that branch i.e. 2.0.0-beta.0 -> 2.0.0-beta.1"
ns.builder = yargs => {
	yargs.options({
		advanceBranch: {
			desc: 'Specifically increment a pre-release branch by name'
		},
		bump: {
			choices: ['major', 'minor'],
			desc:
				"Force SemVer increment by type, omitting auto-increments based on changelog (angular format). SemVer Patch is omitted as 'HotFix' should be used for them",
			default: 'minor'
		}
	})
	yargs.positional('pre', {
		choices: ['alpha', 'beta', 'rc', 'next', 'official'],
		desc:
			"Optional pre-release type, if specified a pre-release will be pushed to github & npm. Ignored if on a pre-release branch. 'Official' is just a normal release branch",
		default: 'official',
		type: 'string'
	})
}
ns.handler = argv => {
	const sp = ora().start()
	co(function*() {
		const branches = yield git.branch()
		if (argv.advanceBranch && branches.all.includes(argv.advanceBranch)) {
			yield git.checkout(argv.advanceBranch)
		}

		sp.text = 'checking correct branch checked out…'
		let branchType = branches.current.match(/alpha|beta|rc/)
		branchType = branchType ? branchType[0] : false
		if (!branches.current.includes('develop') && !branchType) {
			sp.fail().stop()
			log.error(
				"Releases must start from 'develop' or a release branch if incrementing pre-release"
			)
			process.exit()
		}
		sp.succeed()

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
		let bumpTag
		if (branchType) {
			argv.pre = branchType
		} else {
			sp.text = 'calculating SemVer bump type…'
			bump = yield global.getConventionalRecommendedBump('angular')
			const bumpMinor = bump.match(/patch|minor/)
			if (argv.bump) {
				const argvMinor = argv.bump.match(/patch|minor/)
				bump = argvMinor ? bumpMinor : argvMinor
				bump = bump ? 'minor' : 'major'
			}
			debug('bump', bump)

			let tags = yield git.tags()
			if (typeof tags.latest === 'undefined') {
				const pkg = yield readPkg(process.cwd())
				tags = {
					latest: pkg.version ? pkg.version : '0.0.1'
				}
				debug('tags', tags)
			}
			bumpTag = tags.latest.split('.')
			debug('bumpTag', bumpTag)
			switch (bump) {
				case 'minor':
					bumpTag[1] = Number(bumpTag[1]) + 1
					bumpTag[2] = 0
					break
				case 'major':
					bumpTag[0] = bumpTag[0].startsWith('v')
						? 'v' + (Number(bumpTag[0].replace(/^v/, '')) + 1)
						: Number(bumpTag[0]) + 1
					bumpTag[1] = 0
					bumpTag[2] = 0
					break
				default:
			}
			bumpTag = bumpTag.join('.')
			debug('bumpTag', bumpTag)
			sp.succeed()
		}

		debug('branchType', branchType)

		try {
			debug('pre', argv.pre)
			let execArgs = []
			if (!branchType && argv.pre !== 'official') {
				execArgs.push(bump)
				execArgs.push('--non-interactive')
				switch (argv.pre) {
					case 'alpha':
					case 'beta':
						execArgs.push('--preRelease=' + argv.pre)
						break
					case 'next':
					case 'rc':
						execArgs.push('--preRelease=' + argv.pre)
						execArgs.push('--npm.tag=next')
						break
					case 'official':
						execArgs.push('--github.draft')
						execArgs.push('--no-npm.publish')
						break
					default:
				}
				sp.text = 'creating pre-release of type ' + argv.pre + '…'
				yield execa('./node_modules/.bin/release-it', execArgs)
				sp.succeed()
			}
		} catch (err) {
			sp.fail().stop()
			log.error(err)
			process.exit()
		}

		if (!branchType) {
			let branchName =
				argv.pre !== 'official'
					? 'release/' + bumpTag + '-' + argv.pre
					: 'release/' + bumpTag

			sp.text = 'creating ' + branchName + '…'
			yield git.checkoutBranch(branchName, 'develop')
			sp.succeed()

			sp.text = 'persisting branch remotely…'
			yield git.push(['-u', 'origin', branchName])
			sp.succeed()
		}
		sp.text = 'syncing tags remotely…'
		yield git.pushTags('origin')
		sp.succeed().stop()
	}).catch(err => {
		log.debug(err)
	})
}

module.exports = ns
