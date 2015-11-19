/**
 * Created by bill on 19/11/15.
 */
function AIController(character, game) {
    this.character = character;
    this.game = game;
    this.target = 'eve';

    this.attackMovementSpeed = this.character.movementSpeed * 2.0;
    this.nomalMovementSpeed = this.character.movementSpeed;
    this.idleTillAttackTime = 3000;
    this.idleAfterAttackTime = 4000;
    this.viewDistance = 25.0;
    this.attackDistance = 5.0;

    this.updateFunction = this.idle;
}
AIController.prototype = {
    sawTargetReaction: function(delta) {
        this.character.movementSpeed = this.attackMovementSpeed;
        var am = this.character.animationMixer;
        this.character.setAnimation("DE_Provoke", { crossFade: true, crossFadeDuration: 1, crossFadeWarp: false });
    },
    finishedAttack: function(delta) {
        this.character.movementSpeed = this.normalMovementSpeed;
        var am = this.character.animationMixer;
        this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: 1, crossFadeWarp: false });
    },
    idle: function(delta) {
        var am = this.character.animationMixer;
        this.character.setAnimation("DE_Boredom", { crossFade: true, crossFadeDuration: 1, crossFadeWarp: false });
        //search for enemy
        var enemy = this.game.characters[this.target];
        if(!enemy) { return; }
        var dist = enemy.mesh.position.x - this.character.mesh.position.x;
        if(Math.abs(dist) < this.viewDistance) {
            this.updateFunction = this.sawTargetReaction;
            var scope = this;
            setTimeout(function(){scope.updateFunction = scope.attack;}, this.idleTillAttackTime);
        }
    },
    attack: function(delta) {
        var enemy = this.game.characters[this.target];
        if(!enemy) {
            return;
        }
        var dist = enemy.mesh.position.x - this.character.mesh.position.x;
        if(Math.abs(dist) < this.attackDistance) {
            this.character.movementDirection = new CANNON.Vec3(0,0,0);
            this.updateFunction = this.finishedAttack;
            var scope = this;
            setTimeout(function(){scope.updateFunction = scope.idle;}, this.idleAfterAttackTime);
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
                this.character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: 0.1, crossFadeWarp: false });
            } else {
                this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: 0.1, crossFadeWarp: false });
            }
            if (vLen < this.character.movementSpeed) {
                this.character.body.applyForce(forceVec.scale(this.character.movementSpeed * 10.0), this.character.body.position);
            }
        }
    },
    update: function(delta) {
        this.updateFunction(delta);
    }
};


function KeyboardController(character, game) {
    this.character = character;
    this.game = game;
    var mv = this.character.movementDirection;
    var c = this.character;
    var ao = { crossFade: true, crossFadeDuration: 0.1, crossFadeWarp: false };
    var keymodifier = {};
    var setAnimations = function() {
        if(Math.abs(mv.x + mv.z) <= 0.01) {
            c.setAnimation("DE_Combatiddle", ao);
        } else {
            c.setAnimation("DE_CombatRun", ao);
        }
    }
    var keymap = {
        'keydown': {
            '87': function() { mv.z += 1.0; setAnimations(); }, //W KEY
            '83': function() { mv.z -= 1.0; setAnimations(); }, //S KEY
            '68': function() { mv.x -= 1.0; setAnimations(); }, //A KEY
            '65': function() { mv.x += 1.0; setAnimations(); }  //D KEY
        },
        'keyup':{
            '87': function() { mv.z -= 1.0; setAnimations(); },
            '83': function() { mv.z += 1.0; setAnimations(); },
            '68': function() { mv.x += 1.0; setAnimations(); },
            '65': function() { mv.x -= 1.0; setAnimations(); }
        }
    };
    var onDocumentKeyDown = function( event ) {
        if((event.keyCode in keymodifier && keymodifier[event.keyCode] == false) || !(event.keyCode in keymodifier)) {
            if (event.keyCode in keymap['keydown']) {
                keymap['keydown'][event.keyCode]();
                keymodifier[event.keyCode] = true;
            }
        }
    };
    var onDocumentKeyUp = function( event ) {
        if ((event.keyCode in keymodifier && keymodifier[event.keyCode] == true) || !(event.keyCode in keymodifier)) {
            if (event.keyCode in keymap['keyup']) {
                keymap['keyup'][event.keyCode]();
                keymodifier[event.keyCode] = false;
            }
        }
    };
    window.addEventListener( 'keydown', onDocumentKeyDown, false );
    window.addEventListener( 'keyup', onDocumentKeyUp, false );
}
KeyboardController.prototype.update = function(delta) {
    if(!this.character.playingAnimation) {
        var forceVec = new CANNON.Vec3().copy(this.character.movementDirection);
        forceVec.normalize();
        var vLen = this.character.body.velocity.length();
        var am = this.character.animationMixer;
        if (vLen > this.character.movementSpeed / 2 + 3) {
            var velNorm = new CANNON.Vec3().copy(this.character.body.velocity);
            velNorm.normalize();
            this.character.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, velNorm.x, 0), Math.PI / 2);
        }
        if (vLen < this.character.movementSpeed) {
            this.character.body.applyForce(forceVec.scale(this.character.movementSpeed * 10.0), this.character.body.position);
        }
    }
}
