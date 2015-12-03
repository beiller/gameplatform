

function Controller(character, game) {
    this.character = character;
    this.game = game;
    this.blendAnimationDuration = 0.01;
    this.runBlendAnimationSpeed = 0.01;

    this.movementForce = 2000;
    this.jumpForce = 50000;

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
            var verticalDist = game.characters[c].body.position.y - character.body.position.y;
            if(myQuaternion.y < 0.0) {
                facingDist *= -1.0;
            }
            if(Math.abs(verticalDist) < 2.0 && Math.abs(dist) <= range && facingDist > 0.0 && game.characters[c] !== character) {
                game.characters[c].controllers[0].fsm.hit();
                var unitDist = -1;
                if(dist > 0) {
                    unitDist = 1;
                }
                var cont = game.characters[c].controllers[0];
                game.characters[c].body.applyForce(new CANNON.Vec3(unitDist * cont.movementForce * 20.0, cont.movementForce * 5.0, 0), character.body.position);
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
    var vLen = Math.abs(this.character.body.velocity.x);
    if (vLen < this.character.movementSpeed) {
        this.character.body.applyForce(forceVec.scale(this.character.movementSpeed * this.movementForce), this.character.body.position);
    } else if(vLen > this.character.movementSpeed) {
        var v = this.character.body.velocity;
        if(this.character.body.velocity.x > 0) {
            v.set(this.character.movementSpeed, v.y, v.z);
        } else {
            v.set(-this.character.movementSpeed, v.y, v.z);
        }
    }
};
