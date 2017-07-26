class MatchGame {

    constructor() {
        this.game = new Phaser.Game(this.screenWidth, this.screenHeight, Phaser.CANVAS, 'content', { preload: () => this.preload(), create: () => this.create() });
    }

    screenWidth = 1024;
    screenHeight = 768;
    spriteSize = 64;
    goalSize = 160;  // Perhaps should be calculated dynamically and moved to Goal class...

    config: Config;

    game: Phaser.Game;
    background: Phaser.Sprite;
    scoreBackground: Phaser.Sprite;

    width: number;
    height: number;
    sX: number;
    sY: number;
    field: Item[][];
    goals: { [key: string]: Goal } = {};
    movesLeft: MovesLeft;
    inputEnabled = false;
    swappingNow = false;
    movingItem: Item = null;
    selectedItem: Item = null;
    seltectionSprite: Phaser.Sprite;
    gameOver = false;

    private preload() {
        this.game.load.image('background', 'img/background.jpg');
        this.game.load.image('scoreBackground', 'img/score.png');
        this.game.load.spritesheet("sprites", "img/sprites.png", this.spriteSize, this.spriteSize);
        this.game.load.json('config', 'config.json');
    }

    private create() {
        //this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL; // TODO: Set appropriate
        this.setupBackground();
        this.config = this.game.cache.getJSON('config');
        this.init();
        this.matchAndKill();
    }

    private setupBackground() {
        this.background = this.game.add.sprite(this.screenWidth / 2, this.screenHeight / 2, 'background');
        this.background.anchor.set(0.5, 0.5);
        this.scoreBackground = this.game.add.sprite(this.screenWidth / 2, 0, 'scoreBackground');
        this.scoreBackground.anchor.set(0.5, 0);
    }

    private init() {    // TODO: check config for being correct. Now assuming it's valid.
        this.width = this.config.field[0].length;
        this.height = this.config.field.length;
        this.sX = this.screenWidth / 2 - this.spriteSize * this.width / 2;
        this.sY = this.screenHeight / 2 - this.spriteSize * this.height / 2 + 50;
        this.initGoals();
        this.initMoves();
        this.initField();
        this.initSelectionSprite();

        this.game.input.addMoveCallback((p: Phaser.Pointer, x, y) => this.onMove(p, x, y), this);
    }

    private initSelectionSprite() {
        this.seltectionSprite = this.game.add.sprite(0, 0, "sprites");
        this.seltectionSprite.frame = 6;    // TODO: Remove hardcode.
        this.seltectionSprite.kill();
    }

    private initGoals() {
        let goalCount = 0;
        for (let goalType in this.config.goals) {   // TODO: Bad pattern, refactor this.
            goalCount++;
        }
        let x = this.screenWidth / 2 - this.goalSize * goalCount / 2;
        let y = 10;

        for (let goalType in this.config.goals) {
            let goal = new Goal(goalType, this.config.goals[goalType], new Phaser.Point(x, y), this);
            this.goals[goalType] = goal;
            x += this.goalSize;
        }
    }

    private initMoves() {
        this.movesLeft = new MovesLeft(this.config.moves, new Phaser.Point(this.screenWidth / 2 + 250, 25), this);
    }

    private initField() {
        this.field = [];
        for (let i = 0; i < this.height; i++) {
            this.field.push([]);
            for (let j = 0; j < this.width; j++) {
                if (this.config.field[i][j] !== 0) {
                    let coord = this.posToCoord(j, i);
                    let tile = this.game.add.sprite(coord.x, coord.y, "sprites");
                    let type = this.config.field[i][j];
                    if (type === 1) {
                        type = this.getRandomType();
                    } else {
                        type = Item.codeToType(type as string);
                    }
                    let item = new Item(type, coord, this);
                    item.xPos = j;
                    item.yPos = i;
                    this.field[i].push(item);
                } else {
                    this.field[i].push(null);
                }
            }
        }
    }

    private matchAndKill(): boolean {
        this.inputEnabled = false;
        let found = false;
        let itemsToKill = [];
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                let item = this.field[i][j];
                if (item) {
                    if (this.countMaxNeighbours(j, i) >= 2) {
                        itemsToKill.push(item);
                    }
                }
            }
        }

        itemsToKill.forEach((item: Item) => {
            this.field[item.yPos][item.xPos] = null;
            if (this.config.goals[item.type]) {
                item.moveToGoal();
            } else {
                item.moveToPit();
            }
        });

        if (itemsToKill.length > 0) {
            setTimeout(() => {
                this.checkWinLoose();
                this.fallItems()
                    .then(() => this.matchAndKill());
            }, Item.killDuration);
        } else {
            this.inputEnabled = true;
        }

        return itemsToKill.length > 0;
    }

    private fallItems(): Promise<boolean> {
        let moved = 0;
        for (let i = this.height - 1; i >= 0; i--) {
            // Vertical
            for (let j = 0; j <= this.width; j++) {
                if (this.posOnField(j, i) && this.field[i][j] == null) {
                    if (this.posOnField(j, i - 1) && this.field[i - 1][j] != null) {
                        this.field[i][j] = this.field[i - 1][j];
                        this.field[i - 1][j] = null;
                        this.field[i][j].moveToPos(j, i);
                        moved++;
                    }
                }
            }
            // Diagonal && spawn
            for (let j = 0; j <= this.width; j++) {
                if (this.posOnField(j, i) && this.field[i][j] == null) {
                    if (this.posOnField(j - 1, i - 1) && this.field[i - 1][j - 1] != null) {
                        this.field[i][j] = this.field[i - 1][j - 1];
                        this.field[i - 1][j - 1] = null;
                        this.field[i][j].moveToPos(j, i);
                        moved++;
                    } else if (this.posOnField(j + 1, i - 1) && this.field[i - 1][j + 1] != null) {
                        this.field[i][j] = this.field[i - 1][j + 1];
                        this.field[i - 1][j + 1] = null;
                        this.field[i][j].moveToPos(j, i);
                        moved++;
                    } else {
                        let spawnCoord = this.trySpawn(j, i);
                        if (spawnCoord) {
                            let item = new Item(this.getRandomType(), spawnCoord, this);
                            item.xPos = j;
                            item.yPos = i;
                            item.preSpawn();
                            this.field[i][j] = item;
                            this.field[i][j].moveToPos(j, i);
                        }
                    }
                }
            }
        }
        return new Promise((resolve, reject) => {
            if (moved > 0) {
                setTimeout(() => {
                    this.fallItems()
                        .then(() => {
                            resolve(true);
                        });
                }, Item.moveDuration);
            } else {
                setTimeout(() => resolve(true), Item.moveDuration);
            }
        });
    }

    private trySpawn(xPos, yPos): Phaser.Point | null {
        // Checkihng if on top of the field
        for (let i = yPos - 1; i >= 0; i--) {
            if (this.posOnField(xPos, i)) {
                return null;
            }
        }
        // Checking if spawn here is allowed
        if (this.config.spawnLine[xPos] == 1) {
            return this.posToCoord(xPos, -1);
        }
        return null;
    }

    private checkWinLoose() {
        if (this.gameOver) return;
        let win = true;
        for (let goalType in this.goals) {
            if (!this.goals[goalType].isComplete()) win = false;
        }
        if (win) {
            this.inputEnabled = false;
            this.gameOver = true;
            let winText = this.game.add.text(this.screenWidth / 2, this.screenHeight / 2, "You win!\n;)", { font: "64px Arial", fill: "#ffffff", align: "center", fontWeight: "bold" });
            winText.anchor.set(0.5, 0.5);
            winText.bringToTop();
            this.game.add.tween(winText.scale).to({ x: 2.2, y: 2.2 }, 2500, Phaser.Easing.Linear.None, true);
            // Fast hack. Will not be needed when normal window will be designed.
            setInterval(function() {
                winText.bringToTop();
            }, 500);
        } else if(this.movesLeft.isLost()) {
            this.inputEnabled = false;
            this.gameOver = true;
            let lostText = this.game.add.text(this.screenWidth / 2, this.screenHeight / 2, "Lost!\n ;(", { font: "64px Arial", fill: "#00000", align: "center", fontWeight: "bold" });
            lostText.anchor.set(0.5, 0.5);
            lostText.bringToTop();
            this.game.add.tween(lostText.scale).to({ x: 1.45, y: 1.45 }, 2500, Phaser.Easing.Linear.None, true);
            // Fast hack. Will not be needed when normal window will be designed.
            setInterval(function() {
                lostText.bringToTop();
            }, 500);
        }
    }

    // Interaction    

    onDown(item) {
        if (!this.inputEnabled) return;
        this.movingItem = item;
    }

    onMove(pointer: Phaser.Pointer, x, y) {
        if (!this.inputEnabled) return;
        if (!this.movingItem) return;
        if (this.swappingNow) return;
        let item = this.movingItem;
        let newPos = this.сoordToPos(x, y);
        if (!this.posOnField(newPos.x, newPos.y)) return;
        console.log("onMove", item.type, newPos.x, item.xPos);
        if (newPos.x != item.xPos || newPos.y != item.yPos) { // Swap gesture detected. Prevent all next triggers until start swappin over again.
            this.movingItem = null;
            this.selectItem(null);
        }
        this.trySwap(item.xPos, item.yPos, newPos.x, newPos.y);
    }

    onUp(item) {
        if (!this.inputEnabled) return;
        if (!this.movingItem) return;
        let prevSelected = (this.selectedItem != null) ? this.selectedItem : null;
        if (!prevSelected) {    // Just selecting
            this.selectItem(this.movingItem);
            this.movingItem = null;
        } else {
            this.swappingNow = true;
            this.trySwap(prevSelected.xPos, prevSelected.yPos, this.movingItem.xPos, this.movingItem.yPos)
                .then((res) => {
                    switch (res) {
                        case SwapResult.Succces:
                            this.selectItem(null);
                            break;
                        case SwapResult.Fail:
                            break;
                        case SwapResult.Uswappable:
                        default:
                            this.selectItem(this.movingItem);
                            break;
                    }
                    this.movingItem = null;
                    this.swappingNow = false;
                });
        }
    }

    private trySwap(x1, y1, x2, y2): Promise<SwapResult> {
        if (!this.movedByOneCell(x1, y1, x2, y2)) return Promise.resolve(SwapResult.Uswappable);
        this.inputEnabled = false;
        let item1 = this.field[y1][x1];
        let item2 = this.field[y2][x2];
        if (!item1 || !item2) return Promise.resolve(SwapResult.Uswappable);
        return new Promise((resolve, reject) => {
            this.swapSprites(item1, item2)
                .then(() => {
                    let killResult = this.matchAndKill();
                    if (killResult) {
                        this.movesLeft.updateText(--this.movesLeft.val);
                        resolve(SwapResult.Succces);
                    } else {
                        this.swapSprites(item1, item2)
                            .then(() => {
                                resolve(SwapResult.Fail);
                            });
                    }
                });
        });
    }

    private swapSprites(item1: Item, item2: Item) {
        let remXPos = item1.xPos;
        let remYPos = item1.yPos;
        this.field[item2.yPos][item2.xPos] = item1;
        item1.moveToPos(item2.xPos, item2.yPos);
        this.field[remYPos][remXPos] = item2;
        return item2.moveToPos(remXPos, remYPos);
    }

    private selectItem(item?: Item) {
        if (item) {
            this.selectedItem = item;
            if (!this.seltectionSprite.alive) {
                this.seltectionSprite.revive();
            }
            let coord = this.posToCoord(item.xPos, item.yPos);
            this.seltectionSprite.x = coord.x;
            this.seltectionSprite.y = coord.y;
            this.seltectionSprite.bringToTop();
        } else {
            this.selectedItem = null;
            this.seltectionSprite.kill();
        }
    }

    //Utils

    posToCoord(xPos, yPos): Phaser.Point {
        let x = this.sX + this.spriteSize * xPos;
        let y = this.sY + this.spriteSize * yPos;
        return new Phaser.Point(x, y);
    }

    private сoordToPos(x, y): PIXI.Point {
        return new PIXI.Point(
            Math.floor((x - this.sX) / this.spriteSize),
            Math.floor((y - this.sY) / this.spriteSize));
    }

    private getRandomType() {
        return this.config.itemList[Math.floor(Math.random() * this.config.itemList.length)];
    }

    public posOnField(xPos, yPos): boolean {
        if (xPos < 0 || xPos >= this.width) return false;
        if (yPos < 0 || yPos >= this.height) return false;
        if (this.config.field[yPos][xPos] === 0) return false;
        return true;
    }

    private movedByOneCell(x1, y1, x2, y2) {
        return (x1 == x2 && Math.abs(y1 - y2) == 1) || (y1 == y2 && Math.abs(x1 - x2) == 1);
    }

    private countMaxNeighbours(xPos: number, yPos: number): number { // Too primitve (had do code fast). This part should be rewritten for more complicated mechanics.
        let horNeighbours = this.countSameTo(xPos, yPos, -1, 0) + this.countSameTo(xPos, yPos, 1, 0);
        let vertNeighbours = this.countSameTo(xPos, yPos, 0, -1) + this.countSameTo(xPos, yPos, 0, 1);
        return Math.max(horNeighbours, vertNeighbours);
    }

    private countSameTo(xPos: number, yPos: number, dx: number, dy: number): number {
        let newX = xPos + dx;
        let newY = yPos + dy;
        if (this.posOnField(newX, newY)) {
            if (this.field[newY][newX] && this.field[newY][newX].type == this.field[yPos][xPos].type) {
                return 1 + this.countSameTo(newX, newY, dx, dy);
            }
        }
        return 0;
    }

}

window.onload = () => {
    let matchGame = new MatchGame();
};