var DrawTetrisGame = require('./drawTetrisGame');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var global = require('./global');

var p5Object, games = [];

inherits(Main, EventEmitter);

function Main() {
    var self = this;

    self.allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        32: 'space'
    };

    self.game = {};

    self.on('redraw', function(inputGame) {
        self.game = inputGame;
        p5Object.redraw();
    });

    self.on('UpdateIsPause', function(pauseData) {
        self.game.isPause = pauseData.data;
        p5Object.redraw();
    });

    self.on('drawUsers', function(users) {
        self.game = users[0];
        p5Object.redraw();
    });

    self.p5sketch = function(p) {
        p5Object = p;
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
            var str = '';
            //if (self.game.find == undefined) return;

            if (self.game.isPause) {
                if (p.keyCode === p.ENTER) {
                    str = 'Enter_Key';
                } else if (p.key === 'R') {
                    str = 'R_Key';
                } else str = 'none';
            } else {
                if (p.keyCode === p.ENTER) {
                    str = 'Enter_Key';
                } else if (p.key === 'R') {
                    str = 'R_Key';
                } else if (p.key === 'A') {
                    str = 'A_Key';
                } else if (p.key === 'S') {
                    str = 'S_Key';
                } else if (p.keyCode === global.KEY_SPACE) { /*space bar*/
                    str = 'Space_Key';
                } else if (p.keyCode === global.KEY_SHIFT) { /*shift*/
                    // hold 할 수 없으면 전송하지 않는다.
                    if (self.game.holdable) {
                        str = 'Shift_Key';
                    }
                } else if (p.keyCode === p.LEFT_ARROW) {
                    str = 'Left_Key';
                } else if (p.keyCode === p.RIGHT_ARROW) {
                    str = 'Right_Key';
                } else if (p.keyCode === p.DOWN_ARROW) {
                    str = 'Down_Key';
                } else if (p.keyCode === p.UP_ARROW) {
                    str = 'Up_Key';
                } else str = 'none';
            }

            if (str !== 'none') self.emit('Key_Pressed', {
                data: str
            });
            p.redraw();
        };
    };
}

Main.prototype.startGame = function (game) {
    var self = this;
    self.game = game;
    new p5(self.p5sketch, 'myp5sketch');
};


module.exports = Main;