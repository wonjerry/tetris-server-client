//var global = require('./global');
var Shape = require('./shape');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');

inherits(TetrisGame, EventEmitter);

/*전체적으로 게임을 진행시키기 위한 데이터와 메소드를 담고있는 객체*/
function TetrisGame(options) {

    var self = this;
    if (!(self instanceof TetrisGame)) return new TetrisGame(options);

    self.id = options.clientId || 'offline';
    self.roomId = options.roomId || 'offline';
    self.order = options.order || 1;


    self.history = [];
    self.sequenceNumber = 0;
    self.pendingInputs = [];
    //space는 밑으로 바로 내려버리는 것 이므로 꾹 누를 필요가 없다
    //space 처리를 하고 바로 false로 바꾸자
    //shift도 마찬가지
    self.key_right = false;
    self.key_left = false;
    self.key_up = false;
    self.key_down = false;
    self.key_shift = false;
    self.key_a = false;
    self.key_s = false;
    self.key_space = false;

    self.intervalHandler = -1;

    self.isGameOver = false;
    self.isPause = false;
    self.holdable = true;

    self.block = new Shape(self.randomSeed);

    self.startX = 0;
    self.score = 0;

    self.board = [];

    for (var i = 0; i < 20; i++) {
        self.board[i] = [];
        for (var j = 0; j < 10; j++) {
            self.board[i][j] = 0;
        }
    }

}

TetrisGame.prototype.processInput = function () {

    var self = this;
    var input = null;

    if (self.key_left) {
        self.steerLeft();
    } else if (self.key_right) {
        self.steerRight();
    } else if (self.key_up) {
        self.rotateRight();
    } else if (self.key_down) {
        self.steerDown();
    }else if (self.key_shift) {
        self.key_shift = false;
        self.hold();
    }else if (self.key_space) {
        self.key_space = false;
        self.letFall();
    }else if (self.key_a) {
        self.rotateLeft();
    }else if (self.key_s) {
        self.rotateRight();
    } else {
        return;
    }

    /*
    input.sequenceNumber = self.sequenceNumber++;
    input.clientId = self.id;
    input.roomId = self.roomId;
    self.emit('sendInput', input);


    self.pendingInputs.push(input);
    */
};

TetrisGame.prototype.handleInput = function (key) {
    var self = this;

    if(self.isGameOver) return;

    var input;
    switch (key){
        case 'a':
            self.key_a = true;
            break;
        case 's':
            self.key_s = true;
            break;
        case 'left':
            self.key_left = true;
            break;
        case 'right':
            self.key_right = true;
            break;
        case 'up':
            self.key_up = true;
            break;
        case 'down':
            self.key_down = true;
            break;
        case 'space':
            self.key_space = true;
            break;
        case 'shift':
            self.key_shift = true;
            break;
        case 'key_Released':
            self.key_right = false;
            self.key_left = false;
            self.key_up = false;
            self.key_down = false;
            self.key_shift = false;
            self.key_space = false;
            self.key_a = false;
            self.key_s = false;
            break;
    }
};
/*
TetrisGame.prototype.pushHistory = function (time, seed, type, message) {
    var self = this;
    self.randomSeed = seed;
    // push action to history log
    self.history.push({ time: time, owner: self.id, seed: seed, type: type, message: message })
};

TetrisGame.prototype.syncAction = function(posFrom, posTO, message) {
    var self = this;

    if(message.inputType === 'move_key'){

    }else if(message.inputType === 'move_interval'){

    }else if(message.inputType === 'rotate'){

    }


    posFrom.type = self.jewelMap[posFrom.y][posFrom.x].type
    posTO.type = self.jewelMap[posTO.y][posTO.x].type

    self.jewelMap[posFrom.y][posFrom.x].type = posTO.type
    self.jewelMap[posTO.y][posTO.x].type = posFrom.type

    var result = self.processMatch()
    if (!result.is_matched) {
        self.jewelMap[posFrom.y][posFrom.x].type = posFrom.type
        self.jewelMap[posTO.y][posTO.x].type = posTO.type
        console.warn('client '+ self.id + ' recieved invalidate action');
    }else {
        self.pushHistory(message.time, message.randomSeed, message.type, message.message)
    }
    return result
}
*/
/*interval 함수의 인자로 쓰일 함수이다. 시간 간격 이후에 할 일을 정의한다.
1. 현재 Gameover 상태인지 체크한다.
2. 현재 블록이 내려갔을때 겹치는지 체크한다.
  2-1. 겹치면 블록을 현재 위치에 적용시킨다
  2-2. 블록이 한 줄 다 채워졌는지 체크하여 지운다.
  2-3. 만약 새로나올 블록의 위치에 어떤 블록이 나오면 Gameover 상태로 바꾼다.
  2-4. 그게 아니라면 다음 블록을 내보낸다.

3.  겹치지 않는다면 블록을 한 칸 내린다.
*/

TetrisGame.prototype.go = function () {
    var self = this;

    if (self.getisGameover()) {
        return false;
    }

    if (self.block.intersectCheck(self.block.Y + 1, self.block.X, self.block.currentBlock, self.board)) {
        self.board = self.block.applyBlock(self.block.Y, self.block.X, self.block.currentBlock, self.board);
        var r = self.block.deleteLine(self.board);
        self.board = r.board;
        self.score += r.deletedLineCount * r.deletedLineCount * 10;
        self.setHoldable(true);
        if (self.block.intersectCheck(0, 3, self.block.nextBlock, self.board)) {
            self.setIsGameover(true);
        } else {
            self.block.currentBlock = self.block.nextBlock;

            self.block.nextBlock = self.block.randomBlock();
            self.block.X = 3;
            self.block.Y = 0;
        }
    } else {
        self.block.Y += 1;

    }
    return true;
};

TetrisGame.prototype.steerLeft = function () {
    var self = this;

    if (!self.block.intersectCheck(self.block.Y, self.block.X - 1, self.block.currentBlock, self.board)) {
        self.block.X -= 1;
        return true;
    }
    return false;
};

TetrisGame.prototype.steerRight = function () {
    var self = this;

    if (!self.block.intersectCheck(self.block.Y, self.block.X + 1, self.block.currentBlock, self.board)) {
        self.block.X += 1;
        return true;
    }
    return false;
};

TetrisGame.prototype.steerDown = function () {
    var self = this;

    if (!self.block.intersectCheck(self.block.Y + 1, self.block.X, self.block.currentBlock, self.board)) {
        self.block.Y += 1;
        return true;
    }
    return false;
};

TetrisGame.prototype.rotateLeft = function () {
    var self = this;

    var newBlock = self.block.rotateLeft(self.block.currentBlock);
    if (!self.block.intersectCheck(self.block.Y, self.block.X, newBlock, self.board)) {
        self.block.currentBlock = newBlock;
        return true;
    }
    return false;
};

TetrisGame.prototype.rotateRight = function () {
    var self = this;

    var newBlock = self.block.rotateRight(self.block.currentBlock);
    if (!self.block.intersectCheck(self.block.Y, self.block.X, newBlock, self.board)) {
        self.block.currentBlock = newBlock;
        return true;
    }
    return false;
};

TetrisGame.prototype.letFall = function () {
    var self = this;

    while (!self.block.intersectCheck(self.block.Y + 1, self.block.X, self.block.currentBlock, self.board)) {
        self.block.Y += 1;
    }
    self.go();
};

TetrisGame.prototype.hold = function () {
    var self = this;

    self.holdable = false;
    /* hold블록이 비어있으면 currentBlock에 nextblock을 넣어줘야 한다.*/
    if (self.block.emptyCheck(self.block.holdBlock)) {
        self.block.clone(self.block.currentBlock, self.block.holdBlock);
        self.block.clone(self.block.nextBlock, self.block.currentBlock);
        var result
        self.block.nextBlock = self.block.randomBlock();
    } else {
        var temp = [];
        for (var i = 0; i < 4; i++) {
            temp[i] = [];
        }

        self.block.clone(self.block.holdBlock, temp);
        self.block.clone(self.block.currentBlock, self.block.holdBlock);
        self.block.clone(temp, self.block.currentBlock);
    }

    self.block.X = 3;
    self.block.Y = 0;

};

TetrisGame.prototype.getIntervalHandler = function () {
    var self = this;

    return self.intervalHandler;
};

TetrisGame.prototype.setIntervalHandler = function (ih) {
    var self = this;

    self.intervalHandler = ih;
}

TetrisGame.prototype.getId = function () {
    var self = this;

    return self.id;
};

TetrisGame.prototype.setId = function (id) {
    var self = this;

    self.id = id;
};

TetrisGame.prototype.getId = function () {
    var self = this;

    return self.id;
};

TetrisGame.prototype.setStartX = function (sx) {
    var self = this;

    self.startX = sx;
};

TetrisGame.prototype.getStartX = function () {
    var self = this;

    return self.startX;
}

TetrisGame.prototype.getBlockX = function () {
    var self = this;

    return self.block.X;
};

TetrisGame.prototype.getBlockY = function () {
    var self = this;

    return self.block.Y;
};

TetrisGame.prototype.getisGameover = function () {
    var self = this;

    return self.isGameOver;
};

TetrisGame.prototype.getisPause = function () {
    var self = this;

    return self.isPause;
};

TetrisGame.prototype.setIsGameover = function (bool) {
    var self = this;

    self.isGameOver = bool;
};

TetrisGame.prototype.setIsPause = function (bool) {
    var self = this;

    self.isPause = bool;
};

TetrisGame.prototype.getScore = function () {
    var self = this;

    return self.score;
};
TetrisGame.prototype.getCurrentBlock = function () {
    var self = this;

    return self.block.currentBlock;
};

TetrisGame.prototype.getNextBlock = function () {
    var self = this;

    return self.block.nextBlock;
};

TetrisGame.prototype.setHoldBlock = function (input) {
    var self = this;

    self.block.holdBlock = input;
};

TetrisGame.prototype.getHoldBlock = function () {
    var self = this;

    return self.block.holdBlock;
};

TetrisGame.prototype.getHoldable = function () {
    var self = this;

    return self.holdable;
};

TetrisGame.prototype.setHoldable = function (input) {
    var self = this;

    self.holdable = input;
};

TetrisGame.prototype.getBoard = function () {
    var self = this;

    return self.block.applyBlock(self.block.Y, self.block.X, self.block.currentBlock, self.board);
};

TetrisGame.prototype.getGameData = function () {
    var self = this;

    return {
        id: self.id,
        startX: self.startX,
        isGameOver: self.getisGameover(),
        isPause: self.getisPause(),
        holdable: self.getHoldable(),
        score: self.getScore(),
        X: self.block.X,
        Y: self.block.Y,
        currentBlock: self.getCurrentBlock(),
        nextBlock: self.getNextBlock(),
        holdBlock: self.getHoldBlock(),
        board: self.getBoard()
    };
};

module.exports = TetrisGame;
