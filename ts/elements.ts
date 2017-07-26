class Item {
    type: string;
    sprite: Phaser.Sprite;
    matchGame: MatchGame;
    xPos = 0;
    yPos = 0;
    static killDuration = 800;
    static moveDuration = 150;
    constructor(type: string, coord: Phaser.Point, matchGame: MatchGame) {
        this.type = type;
        this.matchGame = matchGame;
        this.sprite = this.matchGame.game.add.sprite(coord.x, coord.y, "sprites");
        this.sprite.frame = Item.frameNumber(type);
        this.sprite.inputEnabled = true;
        this.sprite.events.onInputDown.add(() => this.matchGame.onDown(this), this.matchGame);
        this.sprite.events.onInputUp.add(() => this.matchGame.onUp(this), this.matchGame);
    }

    static codeToType(code: string): string {
        if (code.length > 1) return code;
        switch (code) {
            case "a": return "bb8";
            case "g": return "boba";
            case "l": return "c3po";
            case "p": return "falcon";
            case "f":
            default:
                return "r2d2";
        }
    }

    static frameNumber(type: string) {  // TODO: Move this to config
        switch (type) {
            case "bb8": return 1;
            case "boba": return 2;
            case "c3po": return 3;
            case "falcon": return 4;
            case "r2d2":
            default:
                return 5;
        }
    }

    moveToGoal() {
        this.sprite.bringToTop();
        let goal = this.matchGame.goals[this.type];
        if (goal) {
            this.matchGame.game.add.tween(this.sprite).to({ x: goal.sprite.x, y: goal.sprite.y }, Item.killDuration, Phaser.Easing.Cubic.In, true);
            this.matchGame.game.add.tween(this.sprite).to({ alpha: 0.5 }, Item.killDuration, Phaser.Easing.Linear.None, true);
            setTimeout(() => {
                this.sprite.destroy();
                goal.val++;              // TODO: Fast and dirty. Move this to the 'core'
                goal.updateText();
            }, Item.killDuration);
        } else {
            this.sprite.destroy();
        }
    }

    moveToPit() {
        this.sprite.bringToTop();
        this.matchGame.game.add.tween(this.sprite).to({ alpha: 0 }, Item.killDuration, Phaser.Easing.Linear.None, true);
        this.matchGame.game.add.tween(this.sprite.scale).to({ x: 1.5, y: 1.5 }, Item.killDuration, Phaser.Easing.Linear.None, true);
        setTimeout(() => {
            this.sprite.destroy();
        }, Item.killDuration);
    }

    moveToPos(xPos, yPos) {
        this.sprite.bringToTop();
        let coord = this.matchGame.posToCoord(xPos, yPos);
        this.matchGame.game.add.tween(this.sprite).to({ x: coord.x, y: coord.y, alpha: 1 }, Item.moveDuration, Phaser.Easing.Linear.None, true);
        this.xPos = xPos;
        this.yPos = yPos;
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), Item.moveDuration);
        });
    }

    preSpawn() {
        this.sprite.alpha = 0;
    }
}

class Goal {
    type: string;
    sprite: Phaser.Sprite;
    text: Phaser.Text;
    matchGame: MatchGame;
    val = 0;
    max = 0;
    constructor(type: string, max: number, coord: Phaser.Point, matchGame: MatchGame) {
        this.type = type;
        this.max = max;
        this.matchGame = matchGame;
        this.sprite = this.matchGame.game.add.sprite(coord.x, coord.y, "sprites");
        this.sprite.frame = Item.frameNumber(type);
        this.text = this.matchGame.game.add.text(coord.x + this.matchGame.spriteSize + 10, coord.y + this.matchGame.spriteSize / 2 - 15, "0/0", { font: "32px Arial", fill: "#ffffff" });
        this.updateText();
    }

    updateText(newVal?: number) {
        if (newVal) {
            this.val = newVal;
        }
        this.text.text = this.val.toString() + "/" + this.max;
    }

    isComplete() {
        return this.val >= this.max;
    }
}

class MovesLeft {
    text: Phaser.Text;
    matchGame: MatchGame;
    val = 0;
    constructor(val: number, coord: Phaser.Point, matchGame: MatchGame) {
        this.val = val;
        this.matchGame = matchGame;
        this.text = this.matchGame.game.add.text(coord.x , coord.y , "0", { font: "32px Arial", fill: "#ffffff" });
        this.updateText();
    }

    updateText(newVal?: number) {
        if (newVal) {
            this.val = newVal;
        }
        this.text.text = this.val.toString();
    }

    isLost() {
        return this.val <= 0;
    }
}

enum SwapResult {
    Succces,
    Fail,
    Uswappable
}