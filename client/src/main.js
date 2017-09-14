var DrawTetrisGame = require('./drawTetrisGame');
var TetrisGameLogic = require('./tetrisGameLogic');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var global = require('./global');

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

    self.p5sketch = function (p) {

        self.p5Object = p;
        self.drawObj = new DrawTetrisGame(p);
        p.setup = function () {
            p.createCanvas(1500, 850);
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
}

Main.prototype.startGame = function (options) {
    var self = this;
    self.game = new TetrisGameLogic(options);

    self.game.on('sendInput', function (input) {
        console.log(input)
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
                self.emit('Key_Pressed', input)
            } else {
                // 음 서버에서 이 함수 외부에서 모든 유저가 Gameover인지 체크해서 true이면 clearInterval 하면 될 것 같다.
                // 일단은 이렇게
                clearInterval(self.game.getIntervalHandler());
            }
        },
        global.FALLING_TIME
    );

    new p5(self.p5sketch, 'myp5sketch');
};


module.exports = Main;