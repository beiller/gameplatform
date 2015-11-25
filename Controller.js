

function Controller(character, game) {
    this.character = character;
    this.game = game;
    this.blendAnimationDuration = 0.15;

}
Controller.prototype.attack = function() {
    var scope = this;
    var character = this.character;
    var game = this.game;
    scope.fsm.attackTimeout = setTimeout(function() {
        var range = character.characterStats.range;
        for(var c in game.characters) {
            var myQuaternion = scope.character.mesh.quaternion;
            var dist = game.characters[c].body.position.x - character.body.position.x;
            var facingDist = dist;
            if(myQuaternion.y < 0.0) {
                facingDist *= -1.0;
            }
            if(Math.abs(dist) <= range && facingDist > 0.0 && game.characters[c] !== character) {
                game.characters[c].controllers[0].fsm.hit();
                var unitDist = -1;
                if(dist > 0) {
                    unitDist = 1;
                }
                game.characters[c].body.applyForce(new CANNON.Vec3(unitDist * 1000.0, 500.0, 0), character.body.position);
                game.characters[c].hit(character.characterStats);
            }

        }
        scope.fsm.attackTimeout = setTimeout(function() {
            scope.fsm.cooldown();
        }, 100);
    }, 100);
};
Controller.prototype.update = function(delta) {
    this.updateFunction();
    if(this.character.movementDirection.x > 0.01) {
        this.character.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    } else if(this.character.movementDirection.x < -0.01) {
        this.character.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
    }
};
Controller.prototype.idle = function(delta) {

};
Controller.prototype.applyForces = function(delta) {
    var forceVec = new CANNON.Vec3().copy(this.character.movementDirection);
    forceVec.normalize();
    var vLen = this.character.body.velocity.length();
    if (vLen < this.character.movementSpeed) {
        this.character.body.applyForce(forceVec.scale(this.character.movementSpeed * 100.0), this.character.body.position);
    }
};