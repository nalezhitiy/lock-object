'use strict';

const path = require('path')
const {createLogger, format, transports} = require('winston');
const {combine, printf} = format;

const myFormat = printf(({level, message, label, timestamp}) => {
    if(process.env.APP_MODE === 'production') {
        return `${label} - ${level}: ${message}`;
    }
    return `[${timestamp}] ${label} - ${level}: ${message}`;
});

const logger = createLogger({
    level: process.env.APP_MODE === 'production' ? 'info' : 'debug',
    handleExceptions: true,
    transports: [
        new transports.Console({
            colorize: true
        })
    ],
    format: combine(
        format.splat(),
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        format.label({label: path.basename(process.mainModule.filename)}),
        myFormat
    ),
});

module.exports = logger;
