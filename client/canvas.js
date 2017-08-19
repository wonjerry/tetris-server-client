var global = require('./global');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var p5Object, drawObject ,games = [];

inherits(DrawTetrisGame, EventEmitter);

function DrawTetrisGame() {
  if (!(this instanceof DrawTetrisGame)) return new DrawTetrisGame();
  this.game = {};
  this.on('redraw', function(inputGame) {
    for(var i= 0; i < games.length; i++){
      if(games[i].id === inputGame.id){
        games[i] = inputGame;
      }
    }
    this.game = inputGame;
    p5Object.redraw();
  });

  this.on('UpdateIsPause', function(pauseData) {
    this.game.isPause = pauseData.data;
    p5Object.redraw();
  });

  this.on('drawUsers', function(users) {
    games = users;
    p5Object.redraw();
  });

}


DrawTetrisGame.prototype.drawGame = function() {
  var length = games.length;
  for(var i=0; i<length; i++){
    this.drawNextBlock(games[i].nextBlock, games[i].startX, 0);
    this.drawHoldBlock(games[i].holdBlock, games[i].startX, 0);
    this.drawTetrisBoard(games[i].board, games[i].startX, 0);
    this.drawScore(games[i].score, games[i].startX, 0);
    this.drawState(games[i].isPause, games[i].isGameOver, games[i].startX, 0);
  }

}

DrawTetrisGame.prototype.drawTetrisBoard = function(board, Sx, Sy) {
  this.drawBlock(board, global.BOARD_HEIGHT, global.BOARD_WIDTH, 0 + Sx, 170 + Sy);
}

DrawTetrisGame.prototype.drawBlock = function(board, rowNum, colNum, Sx, Sy) {
  for (var i = 0; i < rowNum; i++) {
    for (var j = 0; j < colNum; j++) {
      /*뭔가 for문안에서 push pop이 발생하니 느릴 것 같다.*/
      p5Object.push();
      p5Object.translate(Sx + j * global.BLOCK_WIDTH, Sy + i * global.BLOCK_HEIGHT);
      var colorType = '#000000';
      switch (board[i][j]) {
        case 11:
          colorType = '#ed0345';
          break;
        case 12:
          colorType = '#ef6a32';
          break;
        case 13:
          colorType = '#fbbf45';
          break;
        case 14:
          colorType = '#aad962';
          break;
        case 15:
          colorType = '#03c383';
          break;
        case 16:
          colorType = '#017351';
          break;
        case 17:
          colorType = '#a12a5e';
          break;
      }
      p5Object.fill(p5Object.color(colorType)); /*black*/
      p5Object.rect(0, 0, global.BLOCK_WIDTH, global.BLOCK_HEIGHT);
      p5Object.pop();
    }
  }
}

DrawTetrisGame.prototype.drawNextBlock = function(board, Sx, Sy) {
  p5Object.push();
  p5Object.translate(0 + Sx, 0 + Sy);
  p5Object.text("Next Block", 0, 20);
  p5Object.pop();
  this.drawBlock(board, 4, 4, 0 + Sx, 30 + Sy);
}

DrawTetrisGame.prototype.drawHoldBlock = function(board, Sx, Sy) {
  p5Object.push();
  p5Object.translate(180 + Sx, 0 + Sy);
  p5Object.text("Hold Block", 0, 20);
  p5Object.pop();
  this.drawBlock(board, 4, 4, 180 + Sx, 30 + Sy);

}

DrawTetrisGame.prototype.drawScore = function(score, Sx, Sy) {
  var str = "SCORE";
  p5Object.push();
  p5Object.translate(0 + Sx, 790 + Sy);
  p5Object.rect(0, 0, 120, 50);
  p5Object.text(str, 10, 20);
  p5Object.text(score || 0, 10, 45);
  p5Object.pop();
}

DrawTetrisGame.prototype.drawState = function(isPaused, isGameOver, Sx, Sy) {
  p5Object.push();
  p5Object.translate(180 + Sx, 790 + Sy);
  p5Object.rect(0, 0, 120, 50);

  if (isGameOver) {
    p5Object.text("GAME OVER", 10, 35);
    p5Object.pop();
    return;
  }

  if (isPaused) {
    p5Object.text("PAUSED", 25, 35);
  }
  p5Object.pop();
}

var p5sketch = function(p) {
  p5Object = p;

  p.setup = function() {
    p.createCanvas(1500, 850);
    p.textSize(20);
    p.noLoop();
  }
  p.draw = function() {
    if (drawObject.game == undefined) return;
    p.clear();
    drawObject.drawGame();
  }
  p.keyPressed = function() {
    var str = '';
    if (drawObject.game == undefined) return;

    if (drawObject.game.isPause) {
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
        if (drawObject.game.holdable) {
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

    if (str !== 'none') drawObject.emit('Key_Pressed', {
      data: str
    });
    p.redraw();
  }


}

new p5(p5sketch, 'myp5sketch');

drawObject = new DrawTetrisGame();
module.exports = drawObject;
