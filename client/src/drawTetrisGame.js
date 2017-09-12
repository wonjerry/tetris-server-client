var global = require('./global');

function DrawTetrisGame(p) {
    var self = this;
    if (!(self instanceof DrawTetrisGame)) return new DrawTetrisGame(p);

    self.p5Object = p;
}


DrawTetrisGame.prototype.drawGame = function (game) {
    this.drawNextBlock(game.block.nextBlock, game.startX, 0);
    this.drawHoldBlock(game.block.holdBlock, game.startX, 0);
    this.drawTetrisBoard(game.board, game.startX, 0);
    this.drawScore(game.score, game.startX, 0);
    this.drawState(game.isPause, game.isGameOver, game.startX, 0);
};

DrawTetrisGame.prototype.drawTetrisBoard = function (board, Sx, Sy) {
    var self = this;
    this.drawBlock(board, global.BOARD_HEIGHT, global.BOARD_WIDTH, 0 + Sx, 170 + Sy);
};

DrawTetrisGame.prototype.drawBlock = function (board, rowNum, colNum, Sx, Sy) {
    var self = this;

    for (var i = 0; i < rowNum; i++) {
        for (var j = 0; j < colNum; j++) {
            /*뭔가 for문안에서 push pop이 발생하니 느릴 것 같다.*/
            self.p5Object.push();
            self.p5Object.translate(Sx + j * global.BLOCK_WIDTH, Sy + i * global.BLOCK_HEIGHT);
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
            self.p5Object.fill(self.p5Object.color(colorType));
            /*black*/
            self.p5Object.rect(0, 0, global.BLOCK_WIDTH, global.BLOCK_HEIGHT);
            self.p5Object.pop();
        }
    }
};

DrawTetrisGame.prototype.drawNextBlock = function (board, Sx, Sy) {
    var self = this;

    self.p5Object.push();
    self.p5Object.translate(0 + Sx, 0 + Sy);
    self.p5Object.text("Next Block", 0, 20);
    self.p5Object.pop();
    this.drawBlock(board, 4, 4, 0 + Sx, 30 + Sy);
};

DrawTetrisGame.prototype.drawHoldBlock = function (board, Sx, Sy) {
    var self = this;

    self.p5Object.push();
    self.p5Object.translate(180 + Sx, 0 + Sy);
    self.p5Object.text("Hold Block", 0, 20);
    self.p5Object.pop();
    this.drawBlock(board, 4, 4, 180 + Sx, 30 + Sy);

};

DrawTetrisGame.prototype.drawScore = function (score, Sx, Sy) {
    var self = this;

    var str = "SCORE";
    self.p5Object.push();
    self.p5Object.translate(0 + Sx, 790 + Sy);
    self.p5Object.rect(0, 0, 120, 50);
    self.p5Object.text(str, 10, 20);
    self.p5Object.text(score || 0, 10, 45);
    self.p5Object.pop();
};

DrawTetrisGame.prototype.drawState = function (isPaused, isGameOver, Sx, Sy) {
    var self = this;

    self.p5Object.push();
    self.p5Object.translate(180 + Sx, 790 + Sy);
    self.p5Object.rect(0, 0, 120, 50);

    if (isGameOver) {
        self.p5Object.text("GAME OVER", 10, 35);
        self.p5Object.pop();
        return;
    }

    if (isPaused) {
        self.p5Object.text("PAUSED", 25, 35);
    }
    self.p5Object.pop();
};

module.exports = DrawTetrisGame;
