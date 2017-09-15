var DrawTetrisGame = require('./drawTetrisGame');
var TetrisGameLogic = require('./tetrisGameLogic');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var global = require('./global');
var Util = require("./../../server/util");

inherits(Main, EventEmitter);

function Main() {
    var self = this;

    self.allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        32: 'space',
        16: 'shift',
        65: 'a',
        83: 's'
    };

    self.game = {};
    self.p5Object = null;
    self.otherPlayers = [];
}


Main.prototype.socketHandler = function (message) {

    var self = this;
    // 서버에 어떤 클라이언트가 입장했을 때 새로운 게임을 생성하고 otherPlayers 배열에 추가한다
    if (message.type === Util.ACTION_TYPE.CONNECTION) {
        if (message.clientId === self.game.id) return;

        self.otherPlayers[message.clientId] = new TetrisGameLogic({
            clientId: message.clientId,
            roomId: message.roomId,
            order: message.order,
            randomSeed: message.randomSeed
        });

        // 게임 플레이중일때 서버에서 처리한 input message
    } else if (message.type === Util.ACTION_TYPE.WORLDSTATE_RECEIVED) {
        // 이 부분을 잘 조정 해 주어야 한다
        //if (self.main.game.gameState !== 1) return;
        //game에도 message queue를 만들어야 한다
        //self.main.game.messages.push(message);
        var worldState = message.worldState;
        var wlength = worldState.length;

        for (var i = 0; i < wlength; i++) {

            if (self.game.id === worldState[i].clientId) continue;

            var player = self.otherPlayers[worldState[i].clientId];
            if (!player) return;

            var ilength = worldState[i].processedInputs.length;

            for (var j = 0; j < ilength; j++) {
                player.syncAction(worldState[i].processedInputs[j]);
                if(worldState[i].processedInputs[j].type === 'letFall') {
                    console.log(worldState[i].processedInputs[j]);
                }

            }

        }


    } else if (message.type === Util.ACTION_TYPE.FETCH_PLAYERS) {

        var tempOthers = message.others;

        var length = tempOthers.length;
        for (var i = 0; i < length; i++) {

            if (tempOthers[i].clientId === self.game.id) continue;

            self.otherPlayers[tempOthers[i].clientId] = new TetrisGameLogic({
                clientId: tempOthers[i].clientId,
                roomId: tempOthers[i].roomId,
                order: tempOthers[i].order,
                randomSeed: tempOthers[i].randomSeed
            });

        }

    }
};

Main.prototype.initGame = function (options) {
    var self = this;
    self.game = new TetrisGameLogic(options);
};

Main.prototype.startGame = function () {
    var self = this;

    self.game.on('sendInput', function (input) {

        self.emit('Key_Pressed', input);
    });


    self.game.intervalHandler = setInterval(
        function () {
            // 지금은 게임이 진행 될 때만 그려주지만 나중에는 그냥 그릴 수 있게 하기
            if (self.game.go()) {
                self.p5Object.redraw();

                var input = {
                    clientId: self.game.id,
                    roomId: self.game.roomId,
                    type: 'move_interval',
                    x: 0,
                    y: 1,
                    sequenceNumber: self.game.sequenceNumber++
                };
                self.emit('Key_Pressed', input);
            } else {
                // 음 서버에서 이 함수 외부에서 모든 유저가 Gameover인지 체크해서 true이면 clearInterval 하면 될 것 같다.
                // 일단은 이렇게
                clearInterval(self.game.getIntervalHandler());
            }
        },
        global.FALLING_TIME
    );


    var playerNum = Object.keys(self.otherPlayers).length + 1;
    self.p5sketch = function (p) {

        self.p5Object = p;
        self.drawObj = new DrawTetrisGame(p);
        p.setup = function () {
            var parent = document.getElementById("canvasParent");
            parent.innerHTML = "";
            var canvas = p.createCanvas(350 * playerNum, 850);

            canvas.parent('canvasParent');

            p.textSize(20);
            //p.noLoop();
            p.frameRate(3);
        };

        p.draw = function () {
            //if (self.game.find == undefined) return;
            p.clear();
            // go 함수는 일정 시간 이후에만 처리되도록 해야한다
            // keyinput뒤에 redraw하니까 key입력이 많아지면 엄청 빠르게 움직인다
            self.game.processInput();

            for (var key in self.otherPlayers) {
                if (self.otherPlayers.hasOwnProperty(key)) {
                    self.drawObj.drawGame(self.otherPlayers[key]);
                }
            }
            self.drawObj.drawGame(self.game);
        };

        p.keyPressed = function () {
            var key = self.allowedKeys[p.keyCode];
            self.game.handleInput(key);
            // 나중에 key를 소켓을 통해 보낸다
            self.emit('Key_Pressed', {keyInput: key});
            p.redraw();
        };

        p.keyReleased = function () {
            self.game.handleInput('key_Released');
            p.redraw();
        }
    };

    new p5(self.p5sketch, 'myp5sketch');
};


module.exports = Main;