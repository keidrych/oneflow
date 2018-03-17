#!/usr/bin/env node
const pinoDebug = require('pino-debug')

global.log = require('pino')(
	{level: process.env.LEVEL || 'info'},
	process.stdout
)
pinoDebug(global.log, {auto: true, map: {'*': 'debug'}})

const conventionalRecommendedBump = require(`conventional-recommended-bump`)

global.getConventionalRecommendedBump = preset =>
	new Promise((resolve, reject) => {
		conventionalRecommendedBump(
			{
				preset
			},
			function(err, result) {
				if (err) return reject(err)
				resolve(result.releaseType)
			}
		)
	})

const sv = require('standard-version')

global.standardVersion = options =>
	new Promise((resolve, reject) => {
		sv({options}, function(err, result) {
			if (err) return reject(err)
			resolve(result)
		})
	})

global.sp = require('ora')()

const co = require('co')

global.isCleanWorkDir = co.wrap(function*(git) {
	global.sp.start('ensure working directory is clean…')
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
		global.sp.fail().stop()
		log.error('Working Directory must be clean')
		process.exit()
	}
	global.sp.succeed()
})

require('yargs')
	.commandDir('cmds')
	.demandCommand()
	.help()
	.strict().argv
