const co = require('co')
const debug = require('debug')('of:common')
const execa = require('execa')
const git = require('simple-git/promise')(process.cwd())
const readPkg = require('read-pkg')

const ns = {}

ns.checkoutBranch = co.wrap(function*(branch) {
	sp.start(`checking out '${branch}'…`)
	yield git.stash()
	yield git.checkout(branch)
	yield git.stash(['pop'])
	sp.succeed()
})

ns.ensureDevelop = co.wrap(function*(checkOut = true) {
	let branches = yield git.branch()
	// check current branch list for develop branch
	if (branches.all.includes('develop')) {
		if (checkOut) yield ns.checkoutBranch('develop')
		return true
	} else {
		sp.start("'develop' doesn't exist locally, scanning remotely…")
		yield git.raw(['remote', 'set-branches', 'origin', "'*'"])
		yield git.fetch()
		sp.succeed()
		branches = yield git.branch()
		if (branches.all.includes('develop')) {
			if (checkOut) yield ns.checkoutBranch('develop')
			return true
		} else {
			sp.start("Develop doesn't exist, creating from latest master commit…")
			yield git.checkoutBranch('develop', 'master')
			yield git.push(['-u', 'origin', 'develop'])
			sp.succeed()
			return false
		}
	}
})

ns.checkPreBranch = (branch, pre, zone) => {
	sp.start(
		`checking if ${zone} branch matches provided 'pre-release' type of ${pre}`
	)
	if (branch.match(pre)) {
		sp.succeed()
		return true
	}
	if (zone.includes('remote')) {
		sp.info(`'pre-release' type of ${pre} does not match ${zone} branch`)
	} else {
		sp.info(
			`'pre-release' type of ${pre} does not match ${zone} branch, expanding search…`
		)
	}
	return false
}

ns.searchCheckoutBranch = co.wrap(function*(branchType, pre = null) {
	const branches = yield git.branch()
	sp.start(`checking if current branch is a ${branchType} branch…`)
	if (branches.current.startsWith(branchType)) {
		sp.succeed()
		if (pre && ns.checkPreBranch(branches.current, pre, 'current')) return true
	}
	sp.info(`current branch is not a ${branchType} branch`)

	sp.start(`checking for local ${branchType}…`)
	// check local branch list for branch
	let localBranch
	let remoteBranch
	yield branches.all.map(
		co.wrap(function*(branch) {
			if (branch.startsWith(branchType)) {
				if (pre) {
					if (ns.checkPreBranch(branch, pre, 'local')) {
						localBranch = branch
					}
				} else {
					localBranch = branch
				}
				debug('localBranch', localBranch)
				return false
			}
			if (branch.match(branchType) !== null) {
				if (pre) {
					if (ns.checkPreBranch(branch, pre, 'remote')) {
						remoteBranch = branch
					}
				} else {
					remoteBranch = branch
				}
				debug('remoteBranch', remoteBranch)
			}
			return false
		})
	)

	if (localBranch) {
		sp.succeed()
		yield ns.checkoutBranch(remoteBranch)
		return true
	}
	sp.info(`local ${branchType} is not available`)

	sp.start(`checking for remote ${branchType}…`)
	if (remoteBranch) {
		sp.succeed()
		yield ns.checkoutBranch(remoteBranch)
		return true
	}
	sp.info(`remote ${branchType} is not available`)

	// Branch doesn't exist
	return false
})

ns.createBranch = co.wrap(function*(branchName, reference) {
	sp.start(`creating ${branchName} from ${reference}…`)
	yield git.checkoutBranch(branchName, reference)
	sp.succeed()

	sp.start(`persisting ${branchName} remotely…`)
	yield git.push(['-u', 'origin', branchName])
	sp.succeed()
})

ns.standardVersion = co.wrap(function*(svArgs) {
	try {
		const retVal = yield execa('standard-version', svArgs, {
			localDir: yield installedPath()
		})
		debug(retVal)
	} catch (err) {
		sp.fail().stop()
		log.error(err)
		process.exit()
	}
	return retVal
})

ns.releaseGitHub = co.wrap(function*(argv, tag, draftRelease = false) {
	try {
		sp.start('releasing on GitHub…')
		// releasing to GitHub also pushes the tag so specific command as seen in OneFlow isn't necessary
		yield git.checkout(tag)
		const retVal = yield conventionalGitHubReleaser(argv, draftRelease)
		debug(retVal)
		yield git.checkout('develop')
		sp.succeed()
	} catch (err) {
		sp.fail().stop()
		log.error(err)
		process.exit()
	}
	return retVal
})

ns.releaseNPM = co.wrap(function*(npArgs) {
	try {
		sp.start('releasing on NPM…')
		const retVal = yield execa('npm', npArgs)
		debug(retVal)
		sp.succeed()
	} catch (err) {
		sp.fail().stop()
		log.error(err)
		process.exit()
	}
	return retVal
})

ns.mergeDevelop = co.wrap(function*() {
	yield common.checkoutBranch('develop')

	const pkg = yield readPkg(process.cwd())
	const tag = 'v' + pkg.version

	sp.start(`merging ${tag} into develop…`)
	try {
		yield git.mergeFromTo(tag, 'develop')
	} catch (err) {
		sp.fail().stop()
		log.error('Resolve Merge Conflict and run command again with --resume')
		process.exit()
	}
	sp.succeed()

	return tag
})

ns.syncMaster = co.wrap(function*(tag) {
	sp.start('checking out master branch…')
	yield git.checkout('master')
	sp.succeed()

	sp.start(`merging master from ${tag} …`)
	yield git.merge(['--ff-only', tag])
	sp.succeed()

	return
})

ns.purgeBranch = co.wrap(function*(branch) {
	sp.start('checking out develop branch…')
	yield git.checkout('develop')
	sp.succeed()

	sp.start(`deleting local ${branch} …`)
	yield git.raw(['branch', '-D', hotfixBranch])
	sp.succeed()

	sp.start(`deleting remote ${branch} …`)
	yield git.push('origin', ':' + hotfixBranch)
	sp.succeed()

	return
})

module.exports = ns
