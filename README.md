service/lock-object
=================

### Шаги по подготовке DEV окружения:
```
$ cp .env.example .env
$ make container@build  // - запустить сборку контейнера
$ make project@update  // - обновить зависимости package.json

$ make container@start   // - запуск контейнеров

```


### Env:
```
APP_HOSTNAME - Имя хоста для дев окружения и traefik
APP_HTTP_PORT - Номер порта запуска сервера NodeJS
APP_AUTH_USER - Имя юзера для WWW-Authenticate 
APP_AUTH_PASSWORD - Пароль юзера для WWW-Authenticate 
APP_MODE - Окружение (production, development)
APP_STORAGE_TYPE - Тип хранилища (redis, memory)
APP_LOCK_DEFAULT_TTL - Время жизни обектов поумолчанию в хранилище
APP_REDIS_DSN - урл для поключения к редису

```

### Дополнительно:
`APP_MODE=production` - отключает логирования в режиме дебаг

`http://locker-service.dev.lan/test` - UI test page , страница для тестирвоания , мониторинга и дебага
 
Обновить зависимости nodejs
```
$ make project@update
```

Help по командам Makefile
```
$ make 
```

Рестарт контейнеров
```
$ make container@restart
```
Рестарт контейнеров
```
$ make container@shell
```

