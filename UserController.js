UserController.prototype = new Controller();
UserController.prototype.constructor = UserController;
function UserController(character, game) {
    Controller.prototype.constructor.call(this, character, game);
    this.onGround = false;
    this.timeout = null;
    this.attackCooldown = false;

    var mv = this.character.movementDirection;
    var c = this.character;
    var ao = { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false };
    var keymodifier = {};
    var scope = this;
    var keymap = {
        'keydown': {
            '87': function() { mv.y += 1.0; }, //W KEY
            '83': function() { mv.y -= 1.0; }, //S KEY
            '68': function() { mv.x += 1.0; }, //A KEY
            '65': function() { mv.x -= 1.0; },  //D KEY
            '32': function() { scope.changeState(scope.searchForVictim); }
        },
        'keyup':{
            '87': function() { mv.y -= 1.0; },
            '83': function() { mv.y += 1.0; },
            '68': function() { mv.x -= 1.0; },
            '65': function() { mv.x += 1.0; },
            '32': function() {  }
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
    var clickFunction = function( event ) {
        scope.changeState(scope.meleeAttackStart);
    };
    window.addEventListener( 'click', clickFunction, false );
    window.addEventListener( 'keydown', onDocumentKeyDown, false );
    window.addEventListener( 'keyup', onDocumentKeyUp, false );
    var mobileControlData = {
        left: {
            type: 'joystick',
            joystick: {
                radius: 100,
                touchMove: function(e) {
                    if(e.normalizedX > 0.01) {
                        mv.x = 1.0;
                    } else if(e.normalizedX < -0.01) {
                        mv.x = -1.0;
                    } else {
                        mv.x = 0.0;
                    }
                },
                touchEnd: function() {
                    this.currentX = this.x;
                    this.currentY = this.y;
                    mv.x = 0.0;
                }
            }
        },
        right: {
            type: 'buttons',
            buttons: [
                {
                    label: 'jump',
                    fontSize: 12,
                    touchStart: function() {
                        mv.y = 1.0;
                    },
                    touchEnd: function() {
                        mv.y = 0.0;
                    }
                },
                {
                    label: 'xxx',
                    fontSize: 12,
                    touchStart: function() {
                        scope.changeState(scope.searchForVictim);
                    }
                },
                false,
                false
            ]
        }
    };
    //GameController.init( mobileControlData );

    this.changeState(this.walk);
}
UserController.prototype.__setOnGround = function() {
    var FLOOR = -4;
    if(this.character.body.position.y <= FLOOR + this.character.mesh.geometry.boundingSphere.radius + 0.01) {
        this.onGround = true;
        return true;
    }
    return false;
};
UserController.prototype.searchForVictim = function(delta) {
    for(var c in game.characters) {
        var dist = game.characters[c].body.position.x - this.character.body.position.x;
        var controller = game.characters[c].controllers[0];
        if(controller instanceof AIController && Math.abs(dist) <= 3.0) {
            for(var child in controller.character.mesh.children) {
                controller.character.mesh.children[child].visible = false;
            }
            for(var child in this.character.mesh.children) {
                this.character.mesh.children[child].visible = false;
            }
            controller.animation = "fuck_self_monster1";
            controller.changeState(controller.playAnimation);
            this.animation = "fuck_self_eve1";
            this.changeState(this.playAnimation);
            game.characters[c].body.position.copy(this.character.body.position);
            game.characters[c].mesh.quaternion.copy(this.character.mesh.quaternion);
            game.characters[c].body.velocity.set(0,0,0);
            this.character.body.velocity.set(0,0,0);
            (function(scope, controller) {
                setTimeout(function() {
                    controller.animation = "fuck_self_monster2";
                    scope.animation = "fuck_self_eve2";
                    setTimeout(function() {
                        controller.animation = "fuck_self_monster3";
                        scope.animation = "fuck_self_eve3";
                        setTimeout(function() {
                            controller.character.playingAnimation = false;
                            scope.character.playingAnimation = false;
                            controller.changeState(controller.idle);
                            scope.changeState(scope.walk);
                            scope.character.invincible = true;
                            for(var child in controller.character.mesh.children) {
                                controller.character.mesh.children[child].visible = true;
                            }
                            for(var child in scope.character.mesh.children) {
                                scope.character.mesh.children[child].visible = true;
                            }
                            setTimeout(function() { scope.character.invincible = false}, INVINCIBILITY_TIME);
                        }, 9000);
                    }, 9000);
                }, 9000);
            }(this, controller));
            return;
        }
    }
    this.changeState(this.walk);
};
UserController.prototype.meleeAttackStart = function(delta) {
    if(this.attackCooldown) {
        this.changeState(this.walk);
        return;
    }
    this.character.setAnimation("DE_Combatattack", {timeScale: 2.0, loop: THREE.LoopOnce});
    var range = 3.5;
    for(var c in game.characters) {
        var dist = game.characters[c].body.position.x - this.character.body.position.x;
        var controller = game.characters[c].controllers[0];
        //var distanceModifier = this.character.animationMixer.actions[0].clipTime / this.character.animationMixer.actions[0].clip.duration + 1.0;
        if(controller instanceof AIController && Math.abs(dist) <= range) {
            controller.changeState(controller.meleeDefending);
            game.characters[c].body.applyForce(new CANNON.Vec3(dist * 400.0, 150.0, 0), this.character.body.position);
        }
    }
    this.attackCooldown = true;
    var scope = this;
    setTimeout(function() {scope.attackCooldown = false;}, this.character.characterStats.attackCooldown);
    this.changeState(this.meleeAttacking);
    this.changeState(this.walk, 400);
};
UserController.prototype.meleeAttacking = function(delta) {

};
UserController.prototype.hit = function(delta) {
    this.character.setAnimation("DE_Hit", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false, loop:THREE.LoopPingPong, timeScale: 1 });
};
UserController.prototype.walk = function(delta) {
    if(!this.character.playingAnimation) {
        this.character.invincible = false;
        this.__setOnGround();
        if(this.onGround && this.character.movementDirection.y > 0.9) {
            this.changeState(this.jump);
        }
        if(!this.onGround) {
            this.changeState(this.inAir);
        }
        if(this.onGround) {
            var forceVec = new CANNON.Vec3().set(this.character.movementDirection.x, 0, 0);
            forceVec.normalize();
            var vLen = this.character.body.velocity.length();
            var am = this.character.animationMixer;
            if (vLen < this.character.movementSpeed) {
                this.character.body.applyForce(forceVec.scale(this.character.movementSpeed * 100.0), this.character.body.position);
            }
        }
        if(this.character.movementDirection.x > 0.1) {
            this.character.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
            this.character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false });
        } else if(this.character.movementDirection.x < -0.01) {
            this.character.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
            this.character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false });
        } else {
            this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false });
        }
    }
};
UserController.prototype.inAir = function(delta) {
    if(this.character.body.velocity.x > 0) {
        this.character.body.velocity.x = Math.min(this.character.body.velocity.x, 4.0);
    } else {
        this.character.body.velocity.x = Math.max(this.character.body.velocity.x, -4.0);
    }
    if(this.character.body.velocity.y > 0.01) {
        this.character.setAnimation("DE_CombatJumpUp", { loop:THREE.LoopOnce });
    } else if(this.character.body.velocity.y < -0.1) {
        this.character.setAnimation("DE_CombatJumpDown", { loop:THREE.LoopOnce });
    } else {
        //this.character.setAnimation("DE_CombatJumpDown", { crossFade: true, crossFadeDuration: 0.1, crossFadeWarp: false, loop:THREE.LoopOnce });
    }
    if(this.__setOnGround()) {
        this.changeState(this.walk);
        this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false, loop:THREE.LoopOnce });
    }
};
UserController.prototype.jump = function(delta) {
    var jumpForce = new CANNON.Vec3(0, this.character.characterStats.jumpForce, 0);
    this.character.body.applyForce(jumpForce, this.character.body.position);
    this.onGround = false;
    this.changeState(this.inAir);
};
