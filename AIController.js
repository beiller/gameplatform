AIController.prototype = new Controller();
AIController.prototype.constructor = AIController;
function AIController(character, game) {
    Controller.prototype.constructor.call(this, character, game);
    this.target = 'eve';

    this.attackMovementSpeed = this.character.movementSpeed * 1.25;
    this.nomalMovementSpeed = this.character.movementSpeed;
    this.idleTillAttackTime = 1200;
    this.idleAfterAttackTime = 3000;
    this.viewDistance = 6.0;
    this.attackDistance = 2.0;
    this.damageDistance = this.character.mesh.geometry.boundingSphere.radius * 0.75;
    this.stunDuration = 1000;
    this.timeout = null;

    this.updateFunction = this.idle;
}
AIController.prototype.update = function(delta) {
    Controller.prototype.update.call(this, delta);
    if(!this.character.playingAnimation) {
        this.checkForPlayerHit();
    }
};
AIController.prototype.checkForPlayerHit = function() {
    var enemy = this.game.characters[this.target];
    if(!enemy) {
        return;
    }
    var dist = new THREE.Vector3().copy(enemy.mesh.position);
    dist.sub(this.character.mesh.position);
    if(dist.length() <= this.damageDistance && !enemy.invincible) {
        console.log("Eve just took a hit from Monster!");
        enemy.controllers[0].changeState(enemy.controllers[0].hit);
        enemy.invincible = true;
        var scope = enemy.controllers[0];
        scope.changeState(scope.walk, this.stunDuration);
        var force = new CANNON.Vec3(4000 * (dist.normalize()).x, 2000, 0);
        enemy.body.applyForce(force, enemy.body.position);
        enemy.hit(this.character.characterStats);
    }
};
AIController.prototype.sawTargetReaction = function(delta) {
    this.character.movementSpeed = this.attackMovementSpeed;
    var am = this.character.animationMixer;
    this.character.setAnimation("DE_Provoke", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false, timeScale: 2 });
};
AIController.prototype.finishedAttack = function(delta) {
    this.character.movementSpeed = this.normalMovementSpeed;
    var am = this.character.animationMixer;
    this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
};
AIController.prototype.idle = function(delta) {
    var am = this.character.animationMixer;
    this.character.setAnimation("DE_Boredom", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
    //search for enemy
    var enemy = this.game.characters[this.target];
    if(!enemy) { return; }
    var dist = enemy.mesh.position.x - this.character.mesh.position.x;
    if(Math.abs(dist) < this.viewDistance) {
        this.changeState(this.sawTargetReaction);
        this.changeState(this.attack, this.idleTillAttackTime);
    }
};
AIController.prototype.attack = function(delta) {
    var enemy = this.game.characters[this.target];
    if(!enemy) {
        return;
    }
    var dist = enemy.mesh.position.x - this.character.mesh.position.x;
    if(Math.abs(dist) < this.attackDistance) {
        this.character.movementDirection = new CANNON.Vec3(0,0,0);
        this.changeState(this.finishedAttack);
        this.changeState(this.idle, this.idleAfterAttackTime);
    } else {
        this.character.movementDirection = new CANNON.Vec3(dist,0,0);
        this.character.movementDirection.normalize();
    }
    if(!this.character.playingAnimation) {
        var forceVec = new CANNON.Vec3().copy(this.character.movementDirection);
        forceVec.normalize();
        var vLen = this.character.body.velocity.length();
        var am = this.character.animationMixer;
        if (vLen > this.character.movementSpeed / 2 + 3) {
            var velNorm = new CANNON.Vec3().copy(this.character.body.velocity);
            velNorm.normalize();
            this.character.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, velNorm.x, 0), Math.PI / 2);
            this.character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
        } else {
            this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
        }
        if (vLen < this.character.movementSpeed) {
            this.character.body.applyForce(forceVec.scale(this.character.movementSpeed * 100.0), this.character.body.position);
        }
    }
};
