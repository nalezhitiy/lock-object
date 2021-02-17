/**
 *
 */

'use strict';

const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-redis');

const DEFAULT_TTL = process.env.APP_LOCK_DEFAULT_TTL ? process.env.APP_LOCK_DEFAULT_TTL : 900;

const REDIS_DNS= process.env.APP_REDIS_DSN

module.exports = function (storage_type) {

    if (storage_type === 'memory') {
        return cacheManager.caching(
            {store: 'memory', max: 0, ttl: DEFAULT_TTL}
        );
    } else if (storage_type === 'redis') {
        return cacheManager.caching(
            {
                store: redisStore,
                url: REDIS_DNS
            }
        );
    }
};

