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

    self.on('redraw', function(inputGame) {
        //self.game = inputGame;
        //self.p5Object.redraw();
    });

    self.on('UpdateIsPause', function(pauseData) {
        //self.game.isPause = pauseData.data;
        //self.p5Object.redraw();
    });

    self.on('drawUsers', function(users) {
        //self.game = users[0];
        //self.p5Object.redraw();
    });

    self.p5sketch = function(p) {
        self.p5Object = p;
        self.drawObj = new DrawTetrisGame(p);
        p.setup = function() {
            p.createCanvas(1500, 850);
            p.textSize(20);
            p.noLoop();
        };

        p.draw = function() {
            //if (self.game.find == undefined) return;
            p.clear();
            self.drawObj.drawGame(self.game);
        };

        p.keyPressed = function() {
            var key = self.allowedKeys[p.keyCode]
            self.game.handleInput(key);
            // 나중에 key를 소켓을 통해 보낸다
            p.redraw();
        };
    };
}

Main.prototype.startGame = function () {
    var self = this;
    self.game = new TetrisGameLogic();

    self.game.intervalHandler = setInterval(
        function () {
            // 지금은 게임이 진행 될 때만 그려주지만 나중에는 그냥 그릴 수 있게 하기
            if (self.game.go()) {
                self.p5Object.redraw();
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