/**
 *
 */
'use strict';

window.TimerList = {};

function runTimer(obj_id, obj){
    if (!(obj_id in window.TimerList)){
        const timer = setInterval(function(){
            obj['details'] = {'updateTime': new Date().getTime()};
            window.socketConnect.emit('lock', obj);
        }, 1000*60*5);

        window.TimerList[obj_id] = timer;

        renderTimerList('timerList', window.TimerList);
    }
    console.log("Timers: ", window.TimerList);
}

function removeTimer(obj_id){
    if(obj_id in window.TimerList){
        clearTimeout(window.TimerList[obj_id]);

        delete window.TimerList[obj_id];
        console.log(window.TimerList);
    }

    renderTimerList('timerList', window.TimerList);
}

function disabledIfSocketNotConnect(status) {
    document.getElementById('lockObj').disabled = status;
    document.getElementById('UnlockObj').disabled = status;
    document.getElementById('getResources').disabled = status;
    document.getElementById('isLock').disabled = status;
    document.getElementById('ForceUnlockObj').disabled = status;
}

function setDataToResultBlock(data) {
    let htmlData = 'Result: ' + data['result'];
    htmlData += '<br>Status: ' + data['status']
    htmlData += '<br>Data: ' + JSON.stringify(data['data']);
    document.getElementById('resultLock').innerHTML = htmlData;
}

document.addEventListener("DOMContentLoaded", () => {
    let client_id = document.getElementById('client_id');
    let nickname = document.getElementById('nickname');
    let realm = document.getElementById('realm');

    let entity_name = document.getElementById('entity_name');
    let entity_id = document.getElementById('entity_id');

    document.getElementById('disconnectSocket').disabled = true;

    disabledIfSocketNotConnect(true);

    function getResource(withDetails=false){
        let res = {
            resource: {
                entity: entity_name.value,
                entityID: entity_id.value
            }
        };

        if(withDetails){
            res.details = {
                userName: nickname.value,
                timeLock: new Date().getTime()
            }
        }
        return res;
    }

    // connect
    document.getElementById('connectSocket').onclick = function (e) {
        // Connect auto, or use manager connect: new io.Manager(..args).connect()
        window.socketConnect = io('/', {query: {'realm': realm.value, 'client_id': client_id.value}});

        // BIND socket events
        // Бинд событий делаем при конекте один раз

        window.socketConnect.on('connect', function(){
            console.log("connection");
            document.getElementById('client_socket_id').innerText = window.socketConnect.id;
            disabledIfSocketNotConnect(false);

            client_id.disabled = true;
            nickname.disabled = true;
            realm.disabled = true;

            document.getElementById('connectSocket').disabled = true;
            document.getElementById('disconnectSocket').disabled = false;
        });

        window.socketConnect.on('disconnect', function(e){
            console.log("Disconnect connection");
            document.getElementById('client_socket_id').innerText = 'None';
            handlerSocketDisconnect(client_id, nickname, realm);
            document.getElementById('disconnectSocket').disabled = true;
            document.getElementById('connectSocket').disabled = false;
        });

        // get lock table
        window.socketConnect.on('lockTable', function (data) {
            console.log(data);
            createTable('resources', data, client_id.value);
        });

        // get result lock data
        window.socketConnect.on('lock', function (data) {
            console.log(data);
            setDataToResultBlock(data);
            // update lock table
            window.socketConnect.emit('lockTable', realm.value);

            // Запускаем таймер только когда получилось залочить обьект
            if(data['result'] === 'ok' && ['locked', 'already'].indexOf(data['status']) > -1){
                const obj = {
                    resource: data['data']['resource'],
                    details: data['data']['details']
                };

                runTimer(data['data']['resourceID'], obj);
            }

        });

        //get result isLock
        window.socketConnect.on('isLock', function (data) {
            console.log(data);
            setDataToResultBlock(data);

            console.log(window.TimerList);
        });

        //get result unlock
        window.socketConnect.on('unlock', function (data) {
            console.log(data);
            setDataToResultBlock(data);
            removeTimer(data['data']['resourceID']);
            // update lock table
            window.socketConnect.emit('lockTable', realm.value);
        });

        //get result forceUnlock
        window.socketConnect.on('forceUnlock', function (data) {
            console.log(data);
            setDataToResultBlock(data);
            removeTimer(data['data']['resourceID']);
            // update lock table
            window.socketConnect.emit('lockTable', realm.value);
        })
    };

    // disconnect
    document.getElementById('disconnectSocket').onclick = function (e) {
        if(window.socketConnect){
            window.socketConnect.disconnect();
            handlerSocketDisconnect(client_id, nickname, realm);
            document.getElementById('disconnectSocket').disabled = true;
        }
        for (const key in window.TimerList){
            removeTimer(key);
        }
    };

    // lock
    document.getElementById('lockObj').onclick = function (e) {
        let res = getResource(true);

        window.socketConnect.emit('lock', res);
    };

    // Unlock
    document.getElementById('UnlockObj').onclick = function (e) {
        let res = getResource();

        window.socketConnect.emit('unlock', res);
    };

    // ForceUnlock
    document.getElementById('ForceUnlockObj').onclick = function (e) {
        let res = getResource();

        window.socketConnect.emit('forceUnlock', res);
    };

    // isLock
    document.getElementById('isLock').onclick = function (e) {
        let res = getResource();

        window.socketConnect.emit('isLock', res);
    };

    // getLockTable
    document.getElementById('getResources').onclick = function (e) {
        window.socketConnect.emit('lockTable', realm.value);
    };

    // click unlock by lock_id
    document.body.onclick = function (ev) {
        if (ev.target.getAttribute('class') && ev.target.getAttribute("class").indexOf('unlockBtn') !== -1) {
            const lock_id = ev.target.dataset.lock_id;
            if (lock_id) {
                window.socketConnect.emit('unlock', lock_id);
                return true;
            }
        }

        if (ev.target.getAttribute('class') && ev.target.getAttribute("class").indexOf('stopTimerBtn') !== -1) {
            const lock_id = ev.target.dataset.lock_id;
            if (lock_id) {
                window.socketConnect.emit('unlock', lock_id);
            }

        }
    };

});


function clearResultBlocks() {
    document.getElementById('resources').innerHTML = '';
    document.getElementById('resultLock').innerHTML = '';
}

function handlerSocketDisconnect(client_id, nickname, realm){

    client_id.disabled = false;
    nickname.disabled = false;
    realm.disabled = false;

    disabledIfSocketNotConnect(true);
    clearResultBlocks();
}

function createTable(parentDivID, data, client_id) {
    let table = document.createElement("table");
    table.className += 'table table-bordered';

    for (let k in data) {
        let r = document.createElement("th");

        let cell = document.createElement("td");
        cell.appendChild(
            document.createTextNode("Realm: " + k)
        );
        cell.colSpan = 3;
        r.appendChild(cell);
        table.appendChild(r);

        if (Object.keys(data[k]).length > 0) {
            for (let j in data[k]) {
                let tr = document.createElement("tr");

                let cell1 = document.createElement("td");

                cell1.appendChild(document.createTextNode("ObjKey: " + j));
                tr.appendChild(cell1);

                let cell2 = document.createElement("td");

                let ObjData = 'resource: ' + JSON.stringify(data[k][j]['resource'] ?? '');
                ObjData += '<br>details: ' + JSON.stringify(data[k][j]['details'] ?? '');

                cell2.innerHTML = ObjData;
                tr.appendChild(cell2);


                const user_id = data[k][j]['details']['client_id'];
                let cell3 = document.createElement("td");
                let btn = document.createElement('button');
                btn.className += 'unlockBtn btn-sm';

                if (user_id != client_id) {
                    btn.disabled = true;
                    btn.className += ' btn-light';
                } else {
                    btn.className += ' btn-danger';
                }

                btn.dataset.lock_id = data[k][j]['resourceID'];
                btn.appendChild(document.createTextNode('unlock'));


                cell3.appendChild(btn);
                tr.appendChild(cell3);

                table.appendChild(tr);
            }
        }

    }
    document.getElementById(parentDivID).innerHTML = '';
    document.getElementById(parentDivID).appendChild(table);

}

function renderTimerList(parentDivID, data){
    let table = document.createElement("table");
    // table.className += 'table table-striped';

    for (let k in data) {
        let tr = document.createElement("tr");
        tr.className += 'mb-2';

        let cell = document.createElement("td");
        cell.appendChild(
            document.createTextNode("Object Lock ID: " + k)
        );

        tr.appendChild(cell);

        let btn = document.createElement('button');
        btn.className += 'stopTimerBtn btn-sm btn-warning';
        btn.appendChild(document.createTextNode('stop & unlock'));

        btn.dataset.lock_id = k;

        let cell2 = document.createElement("td");
        cell2.className += 'ps-5';
        cell2.appendChild(btn);

        tr.appendChild(cell2);
        table.appendChild(tr);


    }
    document.getElementById(parentDivID).innerHTML = '';
    document.getElementById(parentDivID).appendChild(table);
}
