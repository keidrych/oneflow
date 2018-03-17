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

require('yargs')
	.commandDir('cmds')
	.demandCommand()
	.help()
	.strict().argv
