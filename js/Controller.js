define(["lib/three", "lib/cannon"], function(THREE, CANNON) {
	function Controller(character, game) {
	    this.character = character;
	    this.game = game;
	    this.blendAnimationDuration = 0.05;
	    this.runBlendAnimationSpeed = 0.05;
	
	    this.movementForce = 90;
	    this.jumpForce = 16000;
	
	    this.updateFunction = this.idle;
	
	}
	Controller.prototype.attack = function() {
	    var scope = this;
	    var character = this.character;
	    var game = this.game;
	    scope.fsm.attackTimeout = setTimeout(function() {
	        var range = scope.character.characterStats.range;
	        for(var c in scope.game.characters) {
	            var myQuaternion = scope.character.mesh.quaternion;
	            var dist = scope.game.characters[c].body.position.x - character.body.position.x;
	            var facingDist = dist;
	            var verticalDist = scope.game.characters[c].body.position.y - character.body.position.y;
	            if(myQuaternion.y < 0.0) {
	                facingDist *= -1.0;
	            }
	            if(Math.abs(verticalDist) < 2.0 && Math.abs(dist) <= range && facingDist > 0.0 && scope.game.characters[c] !== character) {
	                scope.game.characters[c].controllers[0].fsm.hit();
	                var unitDist = -1;
	                if(dist > 0) {
	                    unitDist = 1;
	                }
	                var cont = scope.game.characters[c].controllers[0];
	                scope.game.characters[c].body.applyImpulse(new CANNON.Vec3(unitDist * cont.movementForce * 0.5, cont.movementForce * 0.5, 0), character.body.position);
	                scope.game.characters[c].hit(character);
	            }
	
	        }
	        scope.fsm.attackTimeout = setTimeout(function() {
	            scope.fsm.cooldown();
	        }, 100);
	    }, 100);
	};
	Controller.prototype.update = function(delta) {
	    this.updateFunction();
	    var quaternion = new THREE.Quaternion();
	    if(this.character.movementDirection.x > 0.01) {
	        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
			this.character.mesh.quaternion.slerp(quaternion, 0.5);
	    } else if(this.character.movementDirection.x < -0.01) {
	        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
	        this.character.mesh.quaternion.slerp(quaternion, 0.5);
	    }
	};
	Controller.prototype.idle = function(delta) {
	};
	Controller.prototype.applyForces = function(delta) {
	    var forceVec = new CANNON.Vec3().copy(this.character.movementDirection);
	    forceVec.normalize();
	    var f = forceVec.scale(this.movementForce);
	    this.character.body.applyImpulse(f, this.character.body.position);
	    if(Math.abs(this.character.body.velocity.x) > this.character.characterStats.movementSpeed) {
	        var v = this.character.body.velocity;
	        if(this.character.body.velocity.x > 0) {
	            v.set(this.character.characterStats.movementSpeed, v.y, v.z);
	        } else {
	            v.set(-this.character.characterStats.movementSpeed, v.y, v.z);
	        }
	    }
	};
	return Controller;
});
