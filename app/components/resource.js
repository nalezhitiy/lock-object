/**
 *
 */
'use strict';

const hash = require('object-hash');
/**
 * Возвращает собраный обьект для лочки
 */
module.exports = function (obj, realm, client_id, sid) {

    let lock = {};

    lock.resource = obj.resource;
    lock.details = obj.details ?? {};
    lock.details.realm = realm;
    lock.details.client_id = client_id;

    if(lock.details.sids === undefined){
        lock.details.sids = [];
    }
    lock.details.sids.push(sid);

    lock.resourceID = hash(obj.resource);

    return lock;

};
