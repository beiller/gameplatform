
var INVINCIBILITY_TIME = 2000;
var BLEND_ANIMATION_TIME = 0.33;

function Controller(character, game) {
    this.character = character;
    this.game = game;

    this.animation = null;
    this.updateFunction = this.playAnimation;
}
Controller.prototype.playAnimation = function(delta) {
    if(this.animation) {
        this.character.setAnimation(this.animation, { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
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
