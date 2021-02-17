/**
 *
 */

'use strict';
const logger = require('../services/logger');

let Locker = {};
// SET CACHE TTL
Locker.TTL = process.env.APP_LOCK_DEFAULT_TTL ? process.env.APP_LOCK_DEFAULT_TTL : 600;

Locker.makeCacheKey = function (realm, hashObj) {
    return `${realm}_${hashObj}`;
};

Locker.events = {
    lock: 'lock', // Лок и пролонгировать время лока
    isLock: 'isLock', // Проверка лока
    unlock: 'unlock', // Разлочка
    lockTable: 'lockTable', // Список локов
    forceUnlock: 'forceUnlock' // Злая разлочка
};

Locker.returnError = function (ev, data, socket) {
    socket.emit(ev,
        {
            result: 'error',
            status: 'error',
            data: data
        });
};

Locker.parseKey = function (key) {
    const parseKey = key.match(/^(.+)\_(.+)$/);

    if (parseKey) {
        logger.debug(`Realm: ${parseKey[1]} ObjID: ${parseKey[2]}`);
        return {realm: parseKey[1], obj_key: parseKey[2]};
    }
    return {obj_realm: null, obj_key: null}
};


/*

lock resource results:

// success lock
{
    result: 'ok',
    status: 'locked',
    data: {resource: {}, details:{}, resourceID: ""}
}
// success lock already - modify ttl cache object if current client id and current realm
{
    result: 'ok',
    status: 'already',
    data: {resource: {}, details:{}, resourceID: ""}
}

// success lock error - object lock other client_id
{
    result: 'error',
    status: 'locked',
    data: {resource: {}, details:{}, resourceID: ""}
}

// success lock error - error lock object
{
    result: 'error',
    status: 'error',
    data: {resource: {}, details:{}, resourceID: ""}
}

 */

Locker.lock = function (obj, socket) {
};

Locker.lockTable = function (socket, realm) {
};

Locker.isLock = function (obj, socket) {
};

Locker.unlock = function (obj, socket) {
};

Locker.forceUnlock = function (obj, socket) {
};

Locker.clearLocks = function (socket) {
};

Locker.clearSids = function () {
};

module.exports = Locker;
