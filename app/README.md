service/locker-cache
=================

## Использование 

У сервиса есть инструмент работы с заблокированными обьектами.
По адресу `https://locker-service.dev.lan/test`

Для доступа используйте логин и пароль который указали в `.env`

## Подключение:
Для подключения и работы с сервисом понадобится клиент из библиотеки `socket.io-client`

Для примера использования можете посмотреть файл `src/public/js/client-test.js` в котором реализованы все методы работы с сервисом.

Читать документацию по клиенту https://socket.io/docs/v3/client-api/index.html
```
# подключение

const io = require('socket.io-client');
// or with import syntax
import { io } from 'socket.io-client';

window.socketConnect = io('/', {query: {'realm': 'my_test_realm.com.ua', 'client_id': 42}});

```

Для работы вашего приложения с сервисом вы должны указать уникальный `realm`  для вашего приложения, 
это может быть например ваш домен `app.domain.com.ua`

Для каждого подключения пользователем вы должны передавать его идентификатор.
Это может быть user_id пользователя авторизированнов  вашей системе

### Структура обьекта запроса:
```
let res = {
    resource: {
        entity: "products",
        entityID: "42"
    },
    details: {
        userName: "garry.potter"
    }
};
```
`resource` - зарезервированное слово в структуре, должен содержать тип обьект с вашими полями

`details` - для передачи в запросе опционально но ключ является зарезервированым слово в структуре, 
можете дополнительно передавать служебные параметры кроме ключевый слов (`realm`, `client_id`, `sids`) 
иначе ваши значения будут перезатертые.

В примере мы передаем `userName` - что бы знать логин пользователя который заблокировал ресурс, 
и сообщает его другим клиентам.

В ответах на отправленую структуру вы обратно получите её же, блок `resource` не модифицируется, 
а блок `details` - разширяется служебной информацие `realm, client_id, sids` + новый ключ `resourceID`

`sids` (socket-ids) -  массив с индентификаторами сокет клиентов. Если один и тот же client_id открывает 
несколько разных соединений  и хочет работать с тем же обьектов, мы запоминимаем кто из них сейчас подключен.

Например:

Пользователь в браузере открыл несколько вкладок с одним и тем же ресурсом, client_id одинаковый будет, 
но сокет соединение у них разное. При варианте когда человек просто закрывает вкладку браузера, соединение рвется.
И запускается механизм разлочки всех записей этого содинения , но это неправильно,  у нас же в другой вкладке 
этот ресурс залочен. и не должны упускать лочку, а держать обьект заблокированым.

Для это принято решение хранить в залоченом обьекте список идентификаторов конекта, и проверять не только по client_id 
но и socket.id. Ресурс будет разлочен когда размер массива sids = 0.

### Методы:
- lock - залочить ресурс
- unlock - разлочить ресурс
- isLock - проверить состояния лока ресурса
- lockTable - получить список заблокированых обьектов
- forceUnlock - принудительно разлочить обьект

### Lock
```
# request
let res = {
    resource: {
        entity: "orders",
        entityID: 42
    },
    details: {
        userName: "username"
    }
};

window.socketConnect.emit('lock', res);
```
```
# response
window.socketConnect.on('lock', function (data) {
    # data ->
    { data: {
        details: {userName: "username", realm: "my_test_realm.com.ua", client_id: "42"},
        resource: {entity: "orders", entityID: "42"},
        resourceID: "aac108da1d2f83cc27bd00482d9f49fa00f0a4e8",
        },
     result: "ok",
     status: "locked"
    }
});

```
Ответ всегда состоит с трех блоков:
- result - результат выпольнения команды (`ok`, `error`)
- status - статус обьекта (`locked`, `already`, `error`)
- data - сам обьект + доп параметры

`ok` - запрос выполнительно успешно

`error` - ошибка выполнения, или не удалось произвести операцию

`locked` - обьект заблокирован

`already` - обьект уже вами залочен, также это дает возможность обновить время кеша обьекта 

если `result`и `status` возвращают `error` - это означает что ошибки в работе сервиса
 
`resourceID` - одедержить уникальный хеш обьекта `resource`. В дальнейшем его можно использовать для розлочки.


В системе поумолчанию обьект кешируется на 900 сек (параметр можно изменить через .env), и лок будет снят 
по истечению времени.
Вы можете повторно отправлять на лок ресурс допустим каждые пять минут, что бы продлить время лочки.

### isLock
```
# request
let res = {
    resource: {
        entity: "orders",
        entityID: 42
    }
};

window.socketConnect.emit('isLock', res);
```
Если Вам не нужны доп параметры в запроса, то Вы можете отказатся от структуры `details`. Но Вы все равно 
ее получите в ответ с метаданными
```
# response
window.socketConnect.on('isLock', function (data) {
    # data ->
    { data:{
          details: {userName: "username", realm: "my_test_realm.com.ua", client_id: "42"},
          resource: {entity: "orders", entityID: "42"},
          resourceID: "aac108da1d2f83cc27bd00482d9f49fa00f0a4e8"
      }
      result: "ok",
      status: "locked"
    }
});

```
- status - статус обьекта (`locked`, `free`, `error`)

`locked` - ресурс заблокирован, в дата будет содержатся ресурс с информацией по лочке

`free` - ресурс свободный, в дата будет то что вы и отправили 

### Unlock
```
# request
let res = {
    resource: {
        entity: "orders",
        entityID: 42
    }
};

window.socketConnect.emit('unlock', res);
```
Разлочить можно передав тот же resource который залочили, но можно передать и resourceID полученый в ответ на команду Lock.
```
# request
const resourceID = 'aac108da1d2f83cc27bd00482d9f49fa00f0a4e8';

window.socketConnect.emit('unlock', resourceID);
```
Результат будет тот же.
```
# response
window.socketConnect.on('unlock', function (data) {
    # data ->
    { data:{
          details: { userName: "username", realm: "my_test_realm.com.ua", client_id: "42"},
          resource: {entity: "orders", entityID: "42"},
          resourceID: "aac108da1d2f83cc27bd00482d9f49fa00f0a4e8"
      }
      result: "ok",
      status: "unlock"
    }
});

```
- status - статус обьекта (`locked`, `not_lock`, `unlock`, `error`)

`locked` - ресурс заблокирован, в дата будет содержатся ресурс с информацией по лочке

`not_locked` - вы пытаетесь разлочить не залоченный ресурс, тоесть ресурс свободный

`unlock` - ресурс освобожден, в дата будет содержатся ресурс с информацией по лочке

### forceUnlock
Метод forceUnlock принимает такие же параметры что и Unlock. Но с помощью его можно разлочить ресур, 
который залочен другим пользователем. Злой метод.

### Socket disconnect
Обьект залоченные текущим пользователем будет автоматически разлочены через 900 сек - удалятся с кеша, если у клиента еще живое соединение.

Если сокет соединения разорванно(пропал инет, закрыл браузер или вкладку), то залоченные обьекты пользователя также будут разлоченны.
 

### lockTable
```
# request
const realm = 'my_test_realm.com.ua';

window.socketConnect.emit('lockTable', realm);
```
`realm` - можно и не передавать, тогда вы получите все залоченные обьекты текущего реалма 
к которому подключенны, но передавая параметр реала можно смотреть локи других реалмов.

```
# response
window.socketConnect.on('lockTable', function (data) {
    # data ->
    {
      "my_test_realm.com.ua": {
        "aac108da1d2f83cc27bd00482d9f49fa00f0a4e8": {
          "details": {
            "client_id": "42",
            "realm": "my_test_realm.com.ua",
            "userName": "username"
          },
          "resource": {
            "entity": "orders",
            "entityID": "42"
          },
          "resourceID": "aac108da1d2f83cc27bd00482d9f49fa00f0a4e8"
        }
      }
    }
});

```

Ответ содержит обьект с ключем имени реалма, который содержить набор обьектов, ключи которого это ключи залоченых ресурсов,
а их значения это сами залоченные обьеты.
