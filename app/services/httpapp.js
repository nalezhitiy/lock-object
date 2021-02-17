'use strict';

const http = require('http');

const logger = require('./logger');

const express = require('express');

const app = express();

// HTTP application config

app.set('view engine', 'pug');
app.set('views', './views');

app.use(express.static('./public'));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Authenticator
const USER = process.env.APP_AUTH_USER ? process.env.APP_AUTH_USER : 'admin';
const PASSWORD = process.env.APP_AUTH_PASSWORD ? process.env.APP_AUTH_PASSWORD : 'password';

app.use(function (req, res, next) {
    let auth;

    if (req.headers.authorization) {
        auth = Buffer.from(req.headers.authorization.substring(6), 'base64').toString().split(':');
    }

    if (!auth || auth[0] !== USER || auth[1] !== PASSWORD) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="LockerRealmTest"');
        res.end('Unauthorized');
    } else {
        next();
    }
});

// HTTP application routes

app.get('/', function (req, res) {
    logger.info('request ' + req.path);
    // forbidden denied
    res.status(403);
    res.end();
});

app.get('/json', function (req, res) {
    logger.info('request ' + req.path);
    res.send({result: 'OK', message: 'Welcome'});

});

app.get('/test', function (req, res) {
    res.render('test', {title: "Locker Service"});
    logger.info('request ' + req.path);
});

// 404
app.use(function (req, res, next) {
    logger.info('request ' + req.path);
    res.status(404).send({'path': req.path, 'details': "Unable to find the requested resource!"});
});

// create application server

const server = http.createServer(app);

module.exports = server;
