'use strict';

const logger = require('./services/logger');

const httpapp = require('./services/httpapp');

// подключить сокет перед запуском сервера
const socketIO = require('./services/websocket');

// run server
const port = process.env.APP_HTTP_PORT ? process.env.APP_HTTP_PORT : 3000;

const server = httpapp.listen(port, function () {
    logger.info('web server connected port ' + port);


    /*
    Будем чистить socket id перед запуском сервера, так как новые реконекты будут иметь другие идентификатора коннекта
    Эта функциональность не подлежит маштабированию приложения, для маштабирования к ключам нужно добавлять NODE_ID
    PATTERN_KEY : NODE_ID+_+REALM+_+OBJ_HASH_ID
     */
    socketIO._clearSids();
});

server.on('error', err => {
    console.error(err);
    process.stderr.write('STDERR: express server start fail');
});

const handleSIG = () => {
    logger.info('Starting shutdown');

    server.close(() => {
        logger.info('connection closed. shutdown finished.');
        process.stdout.write('STDOUT: connection closed. shutdown finished.');
        process.exit();
    });
};

process.on('uncaughtException', function (err) {
    logger.error((new Date).toUTCString() + ' uncaughtException:', err.message);
    logger.error(err.stack);
});

process.on('SIGINT', handleSIG);
process.on('SIGTERM', handleSIG);
