'use strict';

const logger = require('./logger');
const server = require('./httpapp');
const socketio = require('socket.io')(server, {
    pingTimeout: 60000,
    pingInterval: 30000
});

const STORAGE_TYPE = process.env.APP_STORAGE_TYPE ? process.env.APP_STORAGE_TYPE : 'memory';

/**
 * socket processor
 */

let Locker = {};

if (STORAGE_TYPE === 'memory') {
    Locker = require('../components/lockerMemory');
} else if (STORAGE_TYPE === 'redis') {
    Locker = require('../components/lockerRedis');
}

logger.info(`Storage type: ${STORAGE_TYPE}`);

socketio.on('connection', function (socket) {
    let realm = `${socket.handshake.query['realm']}`;
    let client_id = socket.handshake.query['client_id'];

    if (!client_id) {
        client_id = socket.id;
    }

    socket.Client = {
        id: () => {
            return client_id
        },
        realm: () => {
            return realm
        }
    };

    logger.debug(`Connection ClientID: ${client_id} Realm: ${realm} SID: ${socket.id}`);

    /**
     * lock event processing
     */
    socket.on(Locker.events.lock, function (res) {
        logger.debug(`Lock ClientID: ${socket.Client.id()} Realm: ${socket.Client.realm()}; Obj: ${JSON.stringify(res)}`);
        Locker.lock(res, socket);
    });

    /**
     * unlock event processing
     */
    socket.on(Locker.events.unlock, function (res) {
        logger.debug(`Unlock ClientID: ${socket.Client.id()} Realm: ${socket.Client.realm()}; Obj: ${JSON.stringify(res)}`);
        Locker.unlock(res, socket);
    });
    /**
     * isLock event processing
     */
    socket.on(Locker.events.isLock, function (res) {
        logger.debug(`IsLock ClientID: ${socket.Client.id()} Realm: ${socket.Client.realm()}; Obj: ${JSON.stringify(res)}`);
        Locker.isLock(res, socket);
    });

    /**
     * lockTable event processing
     */
    socket.on(Locker.events.lockTable, function (data) {
        let realm = data;

        if (!realm) {
            realm = socket.Client.realm();
        }
        Locker.lockTable(socket, realm);
    });

    /**
     * lockTable event processing
     */
    socket.on(Locker.events.forceUnlock, function (res) {
        logger.debug(`ForceUnlock ClientID: ${socket.Client.id()} Realm: ${socket.Client.realm()}; Obj: ${JSON.stringify(res)}`);
        Locker.forceUnlock(res, socket)

    });

    /**
     * disconnect event processing
     */
    socket.on('disconnect', function (e) {
        logger.debug(`Disconnect ClientID: ${client_id}  Realm ${realm} Reason: ${e}`);

        Locker.clearLocks(socket);
    });

    /**
     * error event processing
     */
    socket.on('error', function (err) {
        logger.error(`Error ClientID: ${socket.Client.id()} Realm: ${socket.Client.realm()}, processing error event, ${JSON.stringify(err)}`);
        logger.error((new Date).toUTCString() + ' uncaughtException:', err.message);
        logger.error(err.stack);
    });

});

socketio._clearSids = Locker.clearSids;


module.exports = socketio;
