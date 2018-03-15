#!/usr/bin/env node
const pinoDebug = require('pino-debug')
global.log = require('pino')(
	{level: process.env.LEVEL || 'info'},
	process.stdout
)
pinoDebug(global.log, {auto: true, map: {'*': 'debug'}})

require('yargs')
	.commandDir('cmds')
	.demandCommand()
	.help()
	.strict().argv
