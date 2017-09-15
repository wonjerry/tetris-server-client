var global = require('./global');
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
    // 클라이언트에서만 사용하는 배열
    self.pendingInputs = [];
    self.messages = [];
    // 서버에서만 사용하는 배열
    self.processedInputs = [];

    // key flags
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

    self.block = new Shape(options.randomSeed);

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

TetrisGame.prototype.processServerMessages = function () {
    var self = this;

    while (self.messages.length !== 0) {

        var message = self.messages.splice(0, 1);
        var worldStates = message[0].worldState;

        while (worldStates.length !== 0) {

            var state = (worldStates.splice(0, 1))[0];

            var player = null;
            // 들어온 state가 자기 자신에 관한 것 일 때

            if (self.player.id === state.playerId) {
                // 여기서 받은 x ,y는 서버측의 player의 position이다
                player = self.players[0];
                player.col = state.x;
                player.row = state.y;

                var j = 0;
                while (j < self.pendingInputs.length) {
                    var input = self.pendingInputs[j];

                    if (input.sequenceNumber <= state.lastProcessedInput) {
                        // Already processed. Its effect is already taken into account into the world update
                        // we just got, so we can drop it.
                        self.pendingInputs.splice(j, 1);
                    } else {
                        // Not processed by the server yet. Re-apply it.
                        //input에 있는 x,y의 delta 값이다
                        player.applyInput(input.x, input.y);
                        j++;
                    }
                }

                // 디른 클라이언트일 때
            } else {

                self.players.forEach(function (ele) {
                    if (ele.id === state.playerId) {
                        //console.log(state.x);
                        ele.col = state.x;
                        ele.row = state.y;
                    }

                });

                //console.log(self.players)
            }


        }

    }
};

TetrisGame.prototype.processInput = function () {

    var self = this;

    var input = null;

    if (self.key_left) {
        input = {
            type: 'move',
            blockType: self.block.currentBlock.type,
            x: -1,
            y: 0
        };
    } else if (self.key_right) {
        input = {
            type: 'move',
            blockType: self.block.currentBlock.type,
            x: 1,
            y: 0
        };
    } else if (self.key_down) {
        input = {
            type: 'move',
            blockType: self.block.currentBlock.type,
            x: 0,
            y: 1
        };
    } else if (self.key_up) {
        input = {
            type: 'rotate',
            blockType: self.block.currentBlock.type,
            direction: 'right'
        };
    } else if (self.key_a) {
        input = {
            type: 'rotate',
            blockType: self.block.currentBlock.type,
            direction: 'left'
        };
    } else if (self.key_s) {
        input = {
            type: 'rotate',
            blockType: self.block.currentBlock.type,
            direction: 'right'
        };
    } else if (self.key_shift) {
        self.key_shift = false;
        if(!self.hold()) return;

        input = {
            type: 'hold',
            currentBlockType: self.block.currentBlock.type,
            nextBlockType: self.block.currentBlock.type,
            holdBlockType: self.block.currentBlock.type
        };

    } else if (self.key_space) {
        self.key_space = false;
        var deltaY = self.letFall();
        input = {
            type: 'letFall',
            blockType: self.block.currentBlock.type,
            deltaY: deltaY
        };
    } else {
        return;
    }

    // 만양 회전이나 이동이 불가능 할 때는 input data를 보내지 않는다.
    // 서버에서도 이걸로 validate 검사를 할 수 있을 듯 하다
    var moveable = true;

    if (input.type === 'move') {
        moveable = self.move(input.y, input.x, self.block.currentBlock.array);
    } else if (input.type === 'rotate') {
        moveable = self.rotate(input.direction);
    }

    if (!moveable) return;

    input.sequenceNumber = self.sequenceNumber++;
    input.clientId = self.id;
    input.roomId = self.roomId;

    self.emit('sendInput', input);


    self.pendingInputs.push(input);

};

TetrisGame.prototype.handleInput = function (key) {
    var self = this;

    if (self.isGameOver) return;

    switch (key) {
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

TetrisGame.prototype.syncAction = function (input) {
    var self = this;

    var validate = false;

    switch (input.type) {
        case 'move':
            validate = self.move(input.y, input.x, self.block.currentBlock.array);
            break;
        case 'move_interval':
            validate = self.go();
            break;
        case 'rotate':
            validate = self.rotate(input.direction);
            break;
        case 'letFall':
            var delta = 0;
            delta = self.letFall();

            validate = (delta === input.deltaY)
            break;
        case 'hold':
            validate = self.hold();
    }


    if (!validate) console.warn('invalid event!!!!!!!');

    self.processedInputs.push(input);

};


/*
TetrisGame.prototype.pushHistory = function (time, seed, type, message) {
    var self = this;
    self.randomSeed = seed;
    // push action to history log
    self.history.push({ time: time, owner: self.id, seed: seed, type: type, message: message })
};


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

    if (self.intersectCheck(self.block.Y + 1, self.block.X, self.block.currentBlock.array)) {
        self.board = self.applyCurrentBlockToBoard(self.block.Y, self.block.X);

        self.deleteLine();
        self.holdable = true;

        if (self.intersectCheck(0, 3, self.block.nextBlock.array)) {
            self.setIsGameover(true);
        } else {
            self.block.changeCurrentToNext();
        }

    } else {
        self.block.goDown();
    }
    return true;
};

TetrisGame.prototype.calculateAndSetScore = function (deletedLineNum) {
    var self = this;

    self.score += deletedLineNum * deletedLineNum * 10;
};


TetrisGame.prototype.intersectCheck = function (y, x, block) {
    var self = this;
    var board = self.board;

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            if (block[i][j]) {
                if (i + y >= global.BOARD_HEIGHT || j + x >= global.BOARD_WIDTH || j + x < 0 || board[y + i][x + j]) {
                    return true;
                    /* 움직였을 때 어떤 물체 또는 board 끝에 겹침을 뜻함*/
                }
            }
        }
    }
    return false;
};

TetrisGame.prototype.applyCurrentBlockToBoard = function (y, x) {
    var self = this;
    var board = self.board;
    var block = self.block.currentBlock.array;

    var newBoard = [];

    for (var i = 0; i < global.BOARD_HEIGHT; i++) {
        newBoard[i] = board[i].slice();
    }

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            if (block[i][j]) {
                newBoard[i + y][j + x] = block[i][j];
            }
        }
    }
    return newBoard;
};

TetrisGame.prototype.deleteLine = function () {
    var self = this;
    var board = self.board;

    var newBoard = [];
    var count = global.BOARD_HEIGHT;
    for (var i = global.BOARD_HEIGHT; i-- > 0;) {
        for (var j = 0; j < global.BOARD_WIDTH; j++) {
            if (!board[i][j]) {
                /* 0인 성분이 있으면 한줄이 다 안 채워진 것이므로 붙여넣기 해 준다.*/
                /*--count로 아래부터 새로운 board를 채워주는 이유는 맨 아래줄부터 1로 채워진 줄이 있다면 자동적으로
                새로운 board에는 추가되지 않기 때문이다. 이 이후에 맨위부터 count까지는 0으로 채워 주어야 한다.*/
                newBoard[--count] = board[i].slice();
                break;
            }
        }
    }

    for (var i = 0; i < count; i++) {
        newBoard[i] = [];
        for (var j = 0; j < global.BOARD_WIDTH; j++) {
            newBoard[i][j] = 0;
        }
    }

    self.board = newBoard;
    self.calculateAndSetScore(count);
};


TetrisGame.prototype.move = function (dy, dx, inputBlock) {
    var self = this;

    if (!self.intersectCheck(self.block.Y + dy, self.block.X + dx, inputBlock)) {
        self.block.X += dx;
        self.block.Y += dy;
        return true;
    }
    return false;
};

TetrisGame.prototype.rotate = function (direction) {
    var self = this;

    var newBlock;

    if (direction === 'left') {
        newBlock = self.block.rotateLeft();
    } else if (direction === 'right') {
        newBlock = self.block.rotateRight();
    }

    if (!self.intersectCheck(self.block.Y, self.block.X, newBlock)) {
        self.block.setCurrentBlock(newBlock);
        return true;
    }
    return false;
};

TetrisGame.prototype.letFall = function () {
    var self = this;
    var deltaY = 0;
    while (self.move(1, 0, self.block.currentBlock.array)) {
        deltaY++;
    }
    self.go();

    return deltaY;
};

TetrisGame.prototype.hold = function () {
    var self = this;

    if (!self.holdable) return false;

    self.holdable = false;
    self.block.hold();

    return true;
};

TetrisGame.prototype.getIntervalHandler = function () {
    var self = this;

    return self.intervalHandler;
};

TetrisGame.prototype.setIntervalHandler = function (ih) {
    var self = this;

    self.intervalHandler = ih;
};

TetrisGame.prototype.getId = function () {
    var self = this;

    return self.id;
};

TetrisGame.prototype.getStartX = function () {
    var self = this;

    return self.startX;
};

TetrisGame.prototype.getOrder = function () {
    var self = this;
    return self.order;
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

TetrisGame.prototype.getScore = function () {
    var self = this;

    return self.score;
};
TetrisGame.prototype.getCurrentBlock = function () {
    var self = this;

    return self.block.currentBlock.array;
};

TetrisGame.prototype.getNextBlock = function () {
    var self = this;

    return self.block.nextBlock.array;
};


TetrisGame.prototype.getHoldBlock = function () {
    var self = this;

    return self.block.holdBlock.array;
};

TetrisGame.prototype.getHoldable = function () {
    var self = this;

    return self.holdable;
};

TetrisGame.prototype.getBoard = function () {
    var self = this;

    return self.applyCurrentBlockToBoard(self.block.Y, self.block.X);
};

TetrisGame.prototype.getGameData = function () {
    var self = this;
    /*
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
    */
};

module.exports = TetrisGame;
