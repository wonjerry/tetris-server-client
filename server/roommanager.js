var Game = require('./gameroom');
//var debug = require('debug')('bejeweled:RoomManager');
var MAX_CLIENT = 2;

function RoomManager(socketio) {
    var self = this;
    if (!(self instanceof RoomManager)) return new RoomManager(socketio);

    self.gameRooms = {};
    self.sockets = [];
    self.io = socketio;
}

RoomManager.prototype.requestGameRoom = function (socket) {
    var self = this;
    if (!self.sockets.contains(socket)) {
        self.sockets.push(socket)
    }

    var hasJoined = false;
    // 순차적으로 빈 방이 있는지 확인, MAX_CLIENT 확인
    for (var key in self.gameRooms) {
        if (self.gameRooms.hasOwnProperty(key)) {
            var gameroom = self.gameRooms[key];
            var length = gameroom.players.length;

            if (length > MAX_CLIENT) continue;

            length++;
            socket.join(key);

            var options = {
                clientId: socket.id,
                roomId: gameroom.room_id,
                randomSeed: Math.random().toString(36).substr(2),
                order: length
            };

            // 같은 데이터를 server측 player와 client측 player가 가진다
            gameroom.pushClient(options);
            socket.emit('welcome', options);
            // 각 클라이언트들에게 player의 join을 알린다
            // 나중에 해당 클라이언트의 정보도 넘겨 줄 것 이다

            /*
            if (length === MAX_CLIENT) {
                gameroom.initGame();
                // 맨 처음 들어온 클라이언트에게만 보내는 것을 구상하자
                self.io.in(gameroom.room_id).emit('activate start button');
            }
            */

            hasJoined = true
        }
    }

    // 준비된 방이 없으면 새로 만든다.
    if (!hasJoined) {
        self.createGameRoom(socket)
    }

    // 게임 이벤트 핸들러를 바인딩한다.
    socket.on('game packet', function (message) {
        var gameroom = self.gameRooms[message.room_id];

        gameroom.clientEventHandler.call(gameroom, message);
    })
};

RoomManager.prototype.createGameRoom = function (socket) {
    var self = this;

    var gameroom = new Game({room_id: Math.random().toString(36).substr(2)});

    socket.join(gameroom.room_id);
    //gameroom.on('userleave', self.leaveGameRoom.bind(self));
    gameroom.on('response', self.roomResponse.bind(self));

    var options = {
        clientId: socket.id,
        roomId: gameroom.room_id,
        randomSeed: Math.random().toString(36).substr(2),
        order: 1
    };

    // 같은 데이터를 server측 player와 client측 player가 가진다
    gameroom.pushClient(options);
    socket.emit('welcome', options);

    // gameRooms 배열에 새로 생성된 gameRoom을 저장한다
    self.gameRooms[gameroom.room_id] = gameroom;

    gameroom.initGame();
    // 맨 처음 들어온 클라이언트에게만 보내는 것을 구상하자
    self.io.in(gameroom.room_id).emit('activate start button');
};

RoomManager.prototype.roomResponse = function (message) {
    var self = this;
    if (message.broadcast) {
        self.io.in(message.room_id).emit('game packet', message);
    } else {
        self.io.to(message.client_id).emit('game packet', message);
    }
};
/*
RoomManager.prototype.leaveGameRoom = function (message) {
    var self = this;
    var socket = self.io.sockets.connected[message.client_id];
    socket.leave(message.room_id);

    if (message.room_is_empty) delete self.gameRooms[message.room_id];
    self.requestGameRoom(socket);
};

RoomManager.prototype.userDisconnect = function (socket) {
    var self = this
    var rooms = self.io.sockets.adapter.rooms
    //debug('Rooms: ' + JSON.stringify(rooms))
    for (var key in rooms) {
        if (rooms.hasOwnProperty(key)) {
            if (self.gameRooms[key]) {
                if (self.gameRooms[key].players[socket.id]) {
                    self.gameRooms[key].updateDisconectedUser(socket.id)
                }
            }
        }
    }
};
*/
// How do I check if an array includes an object in JavaScript?
// https://stackoverflow.com/questions/237104/how-do-i-check-if-an-array-includes-an-object-in-javascript
Array.prototype.contains = function (obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true
        }
    }
    return false
};

module.exports = RoomManager;
