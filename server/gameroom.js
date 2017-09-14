//var debug = require('debug')('bejeweled:GameObject')
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');

var Util = require('./util');
var Player = require('./../client/src/tetrisGameLogic');

/**
 * GameRoom
 *
 * @event userleave 유저가 방을 나가는 액션을 할 때 호출. socket disconnect할 땐 반대로 roomManager에서 메소드를 호출한다.
 */

inherits(GameRoom, EventEmitter);

function GameRoom(options) {
    var self = this;
    if (!(self instanceof GameRoom)) return new GameRoom(options);

    self.roomId = options.roomId || Math.random().toString(36).substr(2)
    self.gameState = Util.GAMESTATES.INIT;// 시퀀셜 진행

    self.players = {};
    self.gameInterval = null;
    self.prevTick = 0;

    self.ChangeGameState = function(state) {
        self.gameState = state;
        self.prevTick = Date.now()
        // self.makeRespnse()
    };

    self.lastProcessedInput = [];
    self.messages = [];
}

GameRoom.prototype.initGame = function() {
    var self = this;
    self.ChangeGameState(Util.GAMESTATES.READY);

    function gameLoop() {
        var self = this;
        self.processInput();

        //self.sendWorldState();
        /*

        for (var key in self.players) {
            if (self.players.hasOwnProperty(key)) {
                var player = self.players[key];


            }
        }
        */
    }

    if (self.gameInterval) clearInterval(self.gameInterval);
    self.gameInterval = setInterval(gameLoop.bind(self), 1000) // call every second
};


GameRoom.prototype.processInput = function () {
    var self = this;

    while (true) {
        var message = (self.messages.splice(0, 1))[0];
        if (!message) break;

        // validInput 만들기
        //if(self.game.validInput()){


        if (true) {

            for (var key in self.players) {
                if (self.players.hasOwnProperty(key)) {
                    var player = self.players[key];
                   //console.log(player.id);
                    if (message.clientId === player.id) {
                        // 여기서 받는 x,y는 delta 값이다
                        // 이 부분 조정해 주어야 한다
                        player.syncAction(message);
                        //self.lastProcessedInput[message.clientId] = message.sequenceNumber;
                    }

                }
            }
        }


    }
};


GameRoom.prototype.sendWorldState = function () {
    var self = this;

    var world_state = [];

    for (var key in self.players) {
        if (self.players.hasOwnProperty(key)) {
            var player = self.players[key];
            world_state.push({
                playerId: player.id,
                processedInputs : player.processedInputs,
                lastProcessedInput: self.lastProcessedInput[player.id]
            });

        }
    }

    var response = {
        room_id: self.roomId,
        broadcast: true,
        time: Date.now(),
        seed: Math.random().toString(36).substr(2),
        type: Util.ACTION_TYPE.WORLDSTATE_RECEIVED,
        message: '',
        worldState: world_state
    };

    self.emit('response', response);
};
/**
 *
 * @param options { clientId, roomId, randomSeed, order }
 */

GameRoom.prototype.pushClient = function(options) {
    var self = this;
    var player = new Player(options);
    self.players[options.clientId] = player
};

/**
 * clientEventHandler
 *
 * @param {*} message {
 *  client_id: String
 *  room_id: String
 *  time: Timetic by client,
    seed: current seed number for random
    type: (0 for player connection, 1 for recieved seed transfer, 2 for player made action),
    message: any
 * }
 * @event {*} response {
 *  client_id: String
 *  room_id: String
 broadcast:
 time:
 seed:
 type:
 message: any :: send random seed, send otherPlayer's action and connection info, restore otherPlaye's game by history
 * }
 */
GameRoom.prototype.clientEventHandler = function(message) {
    var self = this;
    self.messages.push(message);
};

GameRoom.prototype.updateDisconectedUser = function(client_id) {
    var self = this
    if (self.players[client_id]) {
        var response = {
            client_id: client_id,
            room_id: self.room_id,
            broadcast: true,
            type: Util.ACTION_TYPE.DISCONNECT
        }
        self.emit('response', response)

        delete self.players[client_id]
    }
    //debug('client: ' + client_id + ' disconnect from room: ' + self.room_id)
};

module.exports = GameRoom;
