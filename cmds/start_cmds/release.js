const debug = require('debug')('of:release')
const git = require('simple-git/promise')(process.cwd())
const co = require('co')
const execa = require('execa')
const readPkg = require('read-pkg')
const ns = {}

ns.command = 'release [pre] [bump] [advanceBranch]'
ns.aliases = ['rel', 'r']
ns.desc =
	"Creates a Pre-release in 'develop' forks a branch matching release/semver. If executed on a pre-release branch will release a new update from that branch i.e. 2.0.0-beta.0 -> 2.0.0-beta.1"
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
	co(function*() {
		const branches = yield git.branch()
		if (argv.advanceBranch && branches.all.includes(argv.advanceBranch)) {
			yield git.checkout(argv.advanceBranch)
		}

		let branchType = branches.current.match(/alpha|beta|rc/)
		branchType = branchType ? branchType[0] : false
		if (!branches.current.includes('develop') && !branchType) {
			log.error(
				"Releases must start from 'develop' or a release branch if incrementing pre-release"
			)
			process.exit()
		}

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
		if (branchType) {
			argv.pre = branchType
		} else {
			bump = argv.bump
			debug('bump', bump)

			let tags = yield git.tags()
			if (typeof tags.latest === 'undefined') {
				const pkg = yield readPkg(process.cwd())
				tags = {
					latest: pkg.version ? pkg.version : '0.0.1'
				}
				debug('tags', tags)
				process.exit()
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
		}

		debug('branchType', branchType)

		try {
			debug('pre', argv.pre)
			let execArgs = []
			if (!branchType) {
				execArgs.push(bumpTag)
			} else if (argv.pre !== 'official') {
				execArgs.push(bump)
			}
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
			const execVal = yield execa('./node_modules/.bin/release-it', execArgs)
			console.log(execVal)
		} catch (err) {
			log.error(err)
		}

		if (!branchType) {
			let branchName =
				argv.pre !== 'official'
					? 'release/' + bumpTag + '-' + argv.pre
					: 'release/' + bumpTag

			yield git.checkoutBranch(branchName, 'develop')
			yield git.push('origin', branchName)
		}
		yield git.pushTags('origin')
	}).catch(err => {
		log.debug(err)
	})
}

module.exports = ns
