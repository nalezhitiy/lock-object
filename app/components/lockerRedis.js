/**
 *
 */

'use strict';
const logger = require('../services/logger');
const lock_table = require('./storage')('redis');
const res = require('./resource');

const Locker = require('./locker');

lock_table.store.events.on('redisError', function (error) {
    // handle error here
    logger.error(`redisError: ${error}`);
});

Locker.lock = function (obj, socket) {
    const client_id = socket.Client.id();
    const realm = socket.Client.realm();
    const sid = socket.id;
    const resource = new res(obj, realm, client_id, sid);
    const resourceID = resource.resourceID;
    const cacheKey = Locker.makeCacheKey(realm, resourceID);

    // делаем поиск есть ли такая запись по ключу
    lock_table.get(cacheKey, function (err, res) {
        if (err) {
            Locker.returnError('lock', obj, socket);
            return false;
        }

        if (!res) {
            // ресурс не найден лочим
            lock_table.set(cacheKey, resource, {ttl: Locker.TTL}, function (err) {
                socket.emit(
                    Locker.events.lock,
                    {
                        result: 'ok',
                        status: 'locked',
                        data: resource
                    });
                return true;
            });
        } else {
            const obj_client_id = res['details']['client_id'];
            // Если это тот же клиент то продливаем время жизни ресурса
            if (client_id === obj_client_id) {
                if (res['details']['sids'].indexOf(sid) === -1) {
                    res['details']['sids'].push(sid);
                }
                delete resource['details']['sids'];
                const details = {...res['details'], ...resource['details']};

                resource['details'] = details;

                lock_table.set(cacheKey, resource, {ttl: Locker.TTL}, function (err) {
                    socket.emit(
                        Locker.events.lock,
                        {
                            result: 'ok',
                            status: 'already',
                            data: res
                        });
                    return true;
                });
            } else {
                // если это другой клиент, то говорим ему что ресур заблокирован другим пользователем
                socket.emit(
                    Locker.events.lock,
                    {
                        result: 'error',
                        status: 'locked',
                        data: res
                    });
                return true;
            }
        }
    });
};


Locker.lockTable = function (socket, realm) {

    lock_table.keys(`${realm}_*`, function (err, keys) {
        if (err) {
            Locker.returnError('lockTable', {}, socket);
            return false;
        }
        let promises = [];

        keys.forEach(key => {
            promises.push(lock_table.get(key));
        });

        Promise.all(promises).then(function (result) {
            let table = {};

            result.forEach(function (obj, k) {
                let key = '';
                if (obj && obj['resourceID'] !== undefined) {
                    key = obj['resourceID'];
                }

                const obj_realm = obj['details']['realm'];
                if (obj_realm) {
                    if (table[obj_realm] === undefined) {
                        table[obj_realm] = {};
                    }
                    table[obj_realm][key] = obj;
                }
            });

            let answer = {};

            if (realm) {
                answer[realm] = table[realm];
            } else {
                answer = table
            }
            socket.emit(Locker.events.lockTable, answer);
        });
    });
};

Locker.isLock = function (obj, socket) {
    const client_id = socket.Client.id();
    const realm = socket.Client.realm();

    const resource = new res(obj, realm, client_id);
    const resourceID = resource.resourceID;
    const cacheKey = Locker.makeCacheKey(realm, resourceID);

    lock_table.get(cacheKey, function (err, res) {
        if (err) {
            Locker.returnError('isLock', obj, socket);
            return false;
        }
        if (res) {
            socket.emit(Locker.events.isLock, {
                result: 'ok',
                status: 'locked',
                data: res
            });
            return true;
        } else {
            socket.emit(Locker.events.isLock, {
                result: 'ok',
                status: 'free',
                data: obj
            });
            return false;
        }
    });

};

Locker.unlock = function (obj, socket) {
    const client_id = socket.Client.id();
    const realm = socket.Client.realm();
    const sid = socket.id;
    let resourceID = '';

    if (typeof obj === 'string') {
        resourceID = obj;
    } else {
        const resource = new res(obj, realm, client_id);
        resourceID = resource.resourceID;
    }

    const cacheKey = Locker.makeCacheKey(realm, resourceID);

    // делаем поиск есть ли такая запись по ключу
    lock_table.get(cacheKey, function (err, res) {
        if (err) {
            console.log(err);
            Locker.returnError('unlock', obj, socket);
            return false;
        }

        if (!res) {
            // ресурс не найден return error
            socket.emit(
                Locker.events.unlock,
                {
                    result: 'error',
                    status: 'not_locked',
                    data: obj
                });
            return true;
        } else {
            const obj_client_id = res['details']['client_id'];

            // Если это тот же клиент то продливаем время жизни ресурса
            if (client_id === obj_client_id) {
                let sids = res['details']['sids'];
                // Проверил сколько екземпляров соединения по одному client_id и начнем их чистить

                const index = sids.indexOf(sid);
                if (index > -1) {
                    sids.splice(index);
                }

                if (sids.length !== 0) {
                    res['details']['sids'] = sids;
                    lock_table.set(cacheKey, res, {ttl: Locker.TTL}, function (err) {
                        socket.emit(Locker.events.unlock, {
                            result: 'ok',
                            status: 'locked',
                            data: res
                        })
                    });
                    return true;
                } else {
                    lock_table.del(cacheKey, function (err) {
                        socket.emit(
                            Locker.events.unlock,
                            {
                                result: 'ok',
                                status: 'unlock',
                                data: res
                            }
                        );
                        return true;
                    });
                }

            } else {
                // если это другой клиент, то говорим ему что ресур заблокирован другим пользователем
                socket.emit(
                    Locker.events.unlock,
                    {
                        result: 'error',
                        status: 'locked',
                        data: res
                    });
                return true;
            }
        }
    });
};

Locker.forceUnlock = function (obj, socket) {
    const client_id = socket.Client.id();
    const realm = socket.Client.realm();

    let resourceID = '';

    if (typeof obj === 'string') {
        resourceID = obj;
    } else {
        const resource = new res(obj, realm, client_id);
        resourceID = resource.resourceID;
    }

    const cacheKey = Locker.makeCacheKey(realm, resourceID);

    lock_table.get(cacheKey, function (err, res) {
        if (err) {
            logger.error(`Force unlock ${cacheKey} error: ${err}`);
            Locker.returnError('forceUnlock', obj, socket);
            return false;
        }

        lock_table.del(cacheKey, function (err) {
            socket.emit(
                Locker.events.forceUnlock,
                {
                    result: 'ok',
                    status: 'unlock',
                    data: res
                }
            );
        })
    });
};

Locker.clearLocks = function (socket) {
    const client_id = socket.Client.id();
    const realm = socket.Client.realm();
    const sid = socket.id;

    lock_table.keys(`${realm}_*`, function (err, keys) {

        keys.forEach(key => {
            lock_table.get(key, function (e, res) {
                const obj_client_id = res['details']['client_id'];

                if (client_id === obj_client_id) {
                    let sids = res['details']['sids'];
                    // Проверил сколько екземпляров соединения с одинаковым client_id и начнем их чистить

                    const index = sids.indexOf(sid);
                    if (index > -1) {
                        sids.splice(index);
                    }
                    if (sids.length !== 0) {
                        logger.debug(`Update cache ${JSON.stringify(res)} - ${JSON.stringify(sids)}`);
                        res['details']['sids'] = sids;
                        lock_table.set(key, res, {ttl: Locker.TTL}, function (err) {
                            socket.emit(Locker.events.unlock, {
                                result: 'ok',
                                status: 'locked',
                                data: res
                            })
                        });
                        return true;
                    } else {
                        lock_table.del(key, function (err) {
                            logger.info(`Client ${client_id}:${sid} disconnect. Released resources ${key}`)
                        });
                    }

                }
            });
        });
    });
};

Locker.clearSids = function () {
    lock_table.keys('*', function (err, keys) {
        keys.forEach(key => {
            lock_table.get(key, function (err, res) {
                res['details']['sids'] = [];
                lock_table.set(key, res, {ttl: Locker.TTL}, function (err) {
                    logger.debug(`Clear sids for key ${key} in ${JSON.stringify(res)}`);
                })
            })
        });
    });
};


module.exports = Locker;
