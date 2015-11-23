
var INVINCIBILITY_TIME = 2000;
var BLEND_ANIMATION_TIME = 0.33;

function AIController(character, game) {
    this.character = character;
    this.game = game;
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
AIController.prototype = {
    changeState: function(updateFunction) {
        if(this.timeout) {
            clearTimeout(this.timeout);
        }
        if(!this.character.playingAnimation) {
            this.updateFunction = updateFunction;
        }
    },
    checkForPlayerHit: function() {
        var enemy = this.game.characters[this.target];
        if(!enemy) {
            return;
        }
        var dist = new THREE.Vector3().copy(enemy.mesh.position);
        dist.sub(this.character.mesh.position);
        if(dist.length() <= this.damageDistance && !enemy.invincible) {
            console.log("Eve just took a hit from Monster!");
            enemy.invincible = true;
            enemy.controllers[0].changeState(enemy.controllers[0].hit);
            var scope = enemy.controllers[0];
            setTimeout(function() { scope.changeState(scope.walk); }, this.stunDuration);
            setTimeout(function() { enemy.invincible = false}, INVINCIBILITY_TIME);
            var force = new CANNON.Vec3(4000 * (dist.normalize()).x, 2000, 0);
            enemy.body.applyForce(force, enemy.body.position);
        }
    },
    sawTargetReaction: function(delta) {
        this.character.movementSpeed = this.attackMovementSpeed;
        var am = this.character.animationMixer;
        this.character.setAnimation("DE_Provoke", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false, timeScale: 2 });
    },
    finishedAttack: function(delta) {
        this.character.movementSpeed = this.normalMovementSpeed;
        var am = this.character.animationMixer;
        this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
    },
    idle: function(delta) {
        var am = this.character.animationMixer;
        this.character.setAnimation("DE_Boredom", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
        //search for enemy
        var enemy = this.game.characters[this.target];
        if(!enemy) { return; }
        var dist = enemy.mesh.position.x - this.character.mesh.position.x;
        if(Math.abs(dist) < this.viewDistance) {
            this.changeState(this.sawTargetReaction);
            var scope = this;
            this.timeout = setTimeout(function(){scope.changeState(scope.attack);}, this.idleTillAttackTime);
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
            this.changeState(this.finishedAttack);
            var scope = this;
            this.timeout = setTimeout(function(){scope.changeState(scope.idle);}, this.idleAfterAttackTime);
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
    },
    update: function(delta) {
        this.updateFunction(delta);
        if(!this.character.playingAnimation) {
            this.checkForPlayerHit();
        }
    },
    playAnimation: function(delta) {
        if(this.animation) {
            this.character.setAnimation(this.animation, { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
            this.character.playingAnimation = true;
        }
    }
};


function KeyboardController(character, game) {
    this.character = character;
    this.game = game;
    this.onGround = false;
    this.jumpForce = 6000;

    var mv = this.character.movementDirection;
    var c = this.character;
    var ao = { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false };
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
KeyboardController.prototype = {
    __setOnGround: function() {
        var FLOOR = -4;
        if(this.character.body.position.y <= FLOOR + this.character.mesh.geometry.boundingSphere.radius + 0.01) {
            this.onGround = true;
            return true;
        }
        return false;
    },
    searchForVictim: function(delta) {
        for(var c in game.characters) {
            var dist = game.characters[c].body.position.x - this.character.body.position.x;
            var controller = game.characters[c].controllers[0];
            if(controller instanceof AIController && Math.abs(dist) <= 3.0) {
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
                                setTimeout(function() { scope.character.invincible = false}, INVINCIBILITY_TIME);
                            }, 5000);
                        }, 5000);
                    }, 5000);
                }(this, controller));
                return;
            }
        }
        this.changeState(this.walk);
    },
    hit: function(delta) {
        this.character.setAnimation("DE_Hit", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false, loop:THREE.LoopPingPong, timeScale: 1 });

    },
    walk: function(delta) {
        if(!this.character.playingAnimation) {
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
                this.character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
            } else if(this.character.movementDirection.x < -0.01) {
                this.character.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
                this.character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
            } else {
                this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
            }
        }
    },
    inAir: function(delta) {
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
            this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false, loop:THREE.LoopOnce });
        }
    },
    jump: function(delta) {
        var jumpForce = new CANNON.Vec3(0, this.jumpForce, 0);
        this.character.body.applyForce(jumpForce, this.character.body.position);
        this.onGround = false;
        this.changeState(this.inAir);
    },
    update: function(delta) {
        this.updateFunction(delta);
    },
    playAnimation: function(delta) {
        if(this.animation) {
            this.character.setAnimation(this.animation, { crossFade: true, crossFadeDuration: BLEND_ANIMATION_TIME, crossFadeWarp: false });
            this.character.playingAnimation = true;
        }
    },
    changeState: function(updateFunction) {
        if(this.timeout) {
            clearTimeout(this.timeout);
        }
        if(!this.character.playingAnimation) {
            this.updateFunction = updateFunction;
        }
    }

};