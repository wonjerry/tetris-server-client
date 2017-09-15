var Game = require('./gameroom');
//var debug = require('debug')('bejeweled:RoomManager');
var MAX_CLIENT = 4;

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
            var length = Object.keys(gameroom.players).length;

            if (length >= MAX_CLIENT) continue;

            length++;
            socket.join(key);

            var options = {
                clientId: socket.id,
                roomId: gameroom.roomId,
                randomSeed: Math.random().toString(36).substr(2),
                order: length
            };

            // 같은 데이터를 server측 player와 client측 player가 가진다

            // 새로운 클라이언트를 받으면 해당 클라이언트의 데이터를 다른 클라이언트에게 전송하며
            // 다른 플레이어의 시작 데이터들을 배열로 받아서 전송 받게 된다
            socket.emit('welcome', options);
            gameroom.pushClient(options);
            self.io.in(gameroom.roomId).emit("player number" , { num : length} );
            // 각 클라이언트들에게 player의 join을 알린다
            // 나중에 해당 클라이언트의 정보도 넘겨 줄 것 이다

            // 들어왔다가 나가면 다시 버튼 deactive 하도록 하자.
            // 아니면 클라이언트에서 어차피 number 알고 있을테니까 그냥 클라이언트에서 처리할까?
            if (length === MAX_CLIENT) {
                self.io.in(gameroom.roomId).emit('activate start button');
            }


            hasJoined = true
        }
    }

    // 준비된 방이 없으면 새로 만든다.
    if (!hasJoined) {
        self.createGameRoom(socket)
    }

    // 게임 이벤트 핸들러를 바인딩한다.
    socket.on('game packet', function (message) {
        var gameroom = self.gameRooms[message.roomId];
        if(!gameroom) return;
        gameroom.clientEventHandler.call(gameroom, message);
    });

    socket.on("start" , function (data) {
        if (length !== MAX_CLIENT) return;

        self.gameRooms[data.roomId].initGame();
        self.io.in(data.roomId).emit('start');
    });

};

RoomManager.prototype.createGameRoom = function (socket) {
    var self = this;

    var gameroom = new Game({roomId: Math.random().toString(36).substr(2)});

    socket.join(gameroom.roomId);
    //gameroom.on('userleave', self.leaveGameRoom.bind(self));
    gameroom.on('response', self.roomResponse.bind(self));

    var options = {
        clientId: socket.id,
        roomId: gameroom.roomId,
        randomSeed: Math.random().toString(36).substr(2),
        order: 1
    };

    // 같은 데이터를 server측 player와 client측 player가 가진다
    gameroom.pushClient(options);
    socket.emit('welcome', options);

    // gameRooms 배열에 새로 생성된 gameRoom을 저장한다
    self.gameRooms[gameroom.roomId] = gameroom;
};

RoomManager.prototype.roomResponse = function (message) {
    var self = this;
    if (message.broadcast) {
        self.io.in(message.roomId).emit('game packet', message);
    } else {
        self.io.to(message.clientId).emit('game packet', message);
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
