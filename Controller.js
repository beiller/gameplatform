
var INVINCIBILITY_TIME = 2000;
var BLEND_ANIMATION_TIME = 0.33;

function Controller(character, game) {
    this.character = character;
    this.game = game;

    this.animation = null;
    this.updateFunction = this.playAnimation;

    this.blendAnimationSpeed = 15.0;
    this.runBlendAnimationSpeed = 0.33;
}
/*
TODO general purpose controller items
 */
Controller.prototype.meleeDefending = function(delta) {
    var blockChance = Math.random();
    if(blockChance < this.character.characterStats.blockRatio) {
        //var randomCounterDelay = Math.floor(Math.random() * 800) + 400;
        console.log(this.character.name + " has blocked");
        this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false, timeScale: 2 });
        this.changeState(this.blockedAttack);
    } else {
        console.log("Monster has taken damage");
        this.character.hit(this.game.characters[this.target].characterStats);
        this.character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false, loop:THREE.LoopOnce, timeScale: 1 });
        this.changeState(this.stunned);
        this.changeState(this.idle, 1000);
    }
};

Controller.prototype.playAnimation = function(delta) {
    if(this.animation) {
        this.character.setAnimation(this.animation, { crossFade: true, crossFadeDuration: this.blendAnimationSpeed, crossFadeWarp: false });
        this.character.playingAnimation = true;
    }
};
Controller.prototype.changeState = function(updateFunction, delayTime) {
    if(this.timeout) {
        clearTimeout(this.timeout);
    }
    if(delayTime !== undefined) {
        var scope = this;
        this.timeout = setTimeout(function() {scope.updateFunction = updateFunction;}, delayTime);
    } else {
        this.updateFunction = updateFunction;
    }
};
Controller.prototype.update = function(delta) {
    this.updateFunction(delta);
};
