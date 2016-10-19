define(["lib/state-machine", "Controller", "BaseStateMachine", "lib/three", "lib/cannon"], 
function(StateMachine, Controller, BaseStateMachine, THREE, CANNON) {
	UserController.prototype = new Controller();
	UserController.prototype.constructor = UserController;
	function UserController(character, game) {
	    Controller.prototype.constructor.call(this, character, game);
	
	    var controller = this;
	
	    var mv = character.movementDirection;
	    var keymodifier = {};
	    var keymap = {
	        'keydown': {
	            '87': function() { try {controller.fsm.jump();} catch(e) {} }, //W KEY
	            '83': function() {  }, //S KEY
	            '68': function() { mv.x += 1.0; controller.fsm.run(); }, //A KEY
	            '65': function() { mv.x -= 1.0; controller.fsm.run(); },  //D KEY
	            '32': function() {  }  //SPACEBAR
	        },
	        'keyup':{
	            '87': function() {  },
	            '83': function() {  },
	            '68': function() { mv.x -= 1.0; controller.fsm.idle(); },
	            '65': function() { mv.x += 1.0; controller.fsm.idle(); },
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
	    var onMouseDownFunction = function( event ) {
	        //console.log(event);
	        event.preventDefault();
	        if(event.button == 0) {
	            controller.fsm.attack();
	        } else if(event.button == 2) {
	            controller.fsm.block();
	        }
	        return false;
	    };
	    var onMouseUpFunction = function( event ) {
	        //console.log(event);
	        event.preventDefault();
	        if(event.button == 2) {
	            //controller.fsm.fall();
	        }
	        return false;
	    };
	    /*window.addEventListener( 'keydown', onDocumentKeyDown, false );
	    window.addEventListener( 'keyup', onDocumentKeyUp, false );
	    window.addEventListener( 'mousedown', onMouseDownFunction, false );
	    window.addEventListener( 'mouseup', onMouseUpFunction, false );*/
	    $(window).on('keydown', onDocumentKeyDown).on('keyup', onDocumentKeyUp);
	    $(game.container).on('mousedown', onMouseDownFunction);
	    $(game.container).on('mouseup', onMouseUpFunction);
	
	    function MobileControl(onTouchStart, onTouchEnd) {
	        //this.container = document.createElement( 'div' );
	        //document.body.appendChild( this.container );
	
	        //this.container.className = "button";
	        //this.container.innerHTML = "HELLO WORLD!";
	        document.body.addEventListener('touchstart', function(e) { alert(e.targetTouches[0].pageX / screen.width); });
	        //this.container.addEventListener('touchend', function(e) { console.log('touchend', e); });
	        //this.container.addEventListener('touchmove', function(e) { console.log('touchmove', e); });
	        //this.container.addEventListener('touchcancel', function(e) { console.log('touchcancel', e); });
	    }
	    //var control = new MobileControl();
	
	
	    var mobileControlData = {
	        left: {
	            type: 'joystick',
	            joystick: {
	                radius: 300,
	                touchMove: function(e) {
	                    if(e.normalizedX > 0.01) {
	                        mv.x = 1.0;
	                    } else if(e.normalizedX < -0.01) {
	                        mv.x = -1.0;
	                    } else {
	                        mv.x = 0.0;
	                    }
	
	                    if(e.normalizedY > 0.5) {
	                        try {controller.fsm.jump();} catch(e) {}
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
	                    label: 'block',
	                    fontSize: 16,
	                    touchStart: function() {
	                        controller.fsm.block();
	                    },
	                    touchEnd: function() {
	                        controller.fsm.fall();
	                    }
	                },
	                {
	                    label: 'attack',
	                    fontSize: 16,
	                    touchStart: function() {
	                        controller.fsm.attack();
	                    }
	                },
	                false,
	                false
	            ]
	        }
	    };
	    //GameController.init( mobileControlData );
	
		var scope = this;
	    this.updateFunction = function(dt) {
	    	scope.fsm.update(dt);
		};

	    this.fsm = new BaseStateMachine(this.character, this.game);
	
	    /*StateMachine.create({
	        initial: 'idle',
	        error: function(eventName, from, to, args, errorCode, errorMessage) {
	            //console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
	        },
	        events: [
	            { name: 'activate',      from: ['attackcooldown', 'idle'],                  to: 'onGround' },
	            { name: 'jump',          from: 'onGround',                                  to: 'inAir' },
	            { name: 'fall',          from: ['inAir', 'BLOCKING', 'waking'],             to: 'freeFall' },
	            { name: 'attack',        from: ['onGround', 'freeFall'],                    to: 'attacking' },
	            { name: 'cooldown',      from: ['onGround', 'freeFall', 'attacking','SEX'],       to: 'attackcooldown'},
	            { name: 'finishAirAttack',      from: 'attackcooldown',                     to: 'freeFall'},
	            { name: 'land',          from: 'freeFall',                                  to: 'onGround'},
	            { name: 'hit',           from: ['attackcooldown', 'idle', 'onGround', 'inAir', 'freeFall', 'attacking', 'attackcooldown', 'STUNNED'], to: 'HIT'},
	            { name: 'dead',          from: '*',                                   to: 'DEAD'},
	            { name: 'block',         from: ['onGround', 'freeFall'],              to: 'BLOCKING'},
	            { name: 'stun',          from: ['BLOCKING'],                          to: 'STUNNED'},
	            { name: 'wake',          from: ['STUNNED', 'HIT'],                    to: 'waking'},
	            { name: 'magic',         from: ['onGround', 'freeFall'],              to: 'attackcooldown'},
	            { name: 'animation',           from: ['onGround', 'freeFall'],              to: 'ANIMATION'}
	        ],
	        callbacks: {
	            onenterANIMATION: function() {
	            	var character = controller.character;
	            	if(character.meshes['chest']) character.meshes['chest'].visible = false;
	            	if(character.meshes['pants']) character.meshes['pants'].visible = false;
	                character.playAnimation("fuckself_1_1", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
	                controller.updateFunction = controller.idle;
	                var fsm = this;
	                this.animationTimeout = setTimeout(function(){
	                    fsm.cooldown();
	                }, 40000);
	            },
	            onleaveANIMATION: function() {
	            	var character = controller.character;
	            	if(character.meshes['chest']) character.meshes['chest'].visible = true;
	            	if(character.meshes['pants']) character.meshes['pants'].visible = true;
	            },
	            onenterDEAD: function() {
	                character.playAnimation("DE_Die", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
	            },
	            onmagic: function() {
	                //alert('here');
	                game.explosion(character, new CANNON.Vec3(40000, 40000, 0));
	                return true;
	            },
	            onanimation: function() {
	                for(var i in controller.game.characters) {
	                    var c = controller.game.characters[i];
	                    if(c === character) {
	                        continue;
	                    }
	                    var dst = new CANNON.Vec3().copy(c.body.position).distanceTo(character.body.position);
	                    if(dst <= 1.0) {
	                        c.controllers[0].fsm.sex();
	                        c.body.position.copy(character.body.position);
	                        c.mesh.quaternion.copy(character.mesh.quaternion);
	                        var oldFunction = game.cameraUpdateFunction;
	                        game.cameraUpdateFunction = function() {
	                            var bone = character.findBone("threecamera");
	                            var t = new THREE.Vector3();
	                            var q = new THREE.Quaternion();
	                            var s = new THREE.Vector3();
	                            bone.matrixWorld.decompose(t, q, s);
	                            game.camera.position.copy(t);
	                            game.camera.quaternion.copy(q);
	                        };
	                        setTimeout(function(){
	                            game.cameraUpdateFunction = oldFunction;
	                            game.camera.quaternion.copy( new THREE.Quaternion() );
	                            game.camera.position.z = 5;
	                            game.camera.position.y = -3;
	                            game.camera.position.x = 0;
	                        }, 40000);
	                        return true;
	                    }
	                }
	                return false;
	            },
	            onenterwaking: function() {
	                this.fall();
	            },
	            onenterSTUNNED: function() {
	                character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
	                controller.updateFunction = controller.idle;
	                var fsm = this;
	                this.hitTimeout = setTimeout(function(){
	                    fsm.wake();
	                }, character.characterStats.hitStunDuration * 4);
	            },
	            onleaveSTUNNED: function() {
	                clearTimeout(this.hitTimeout);
	            },
	            onenterBLOCKING: function(event, from, to, msg) {
	                character.blocking = true;
	                controller.updateFunction = controller.idle;
	                character.playAnimation("DE_Combatblock", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false });
	                character.body.velocity.set(0,0,0);
	            },
	            onleaveBLOCKING: function(event, from, to, msg) {
	                character.blocking = false;
	            },
	            onenterHIT: function(event, from, to, msg) {
	                controller.updateFunction = controller.idle;
	                character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
	                this.hitTimeout = setTimeout(function(){
	                    controller.fsm.wake();
	                }, character.characterStats.hitStunDuration);
	            },
	            onleaveHIT: function() {
	                clearTimeout(this.hitTimeout);
	            },
	            onenteridle:  function(event, from, to, msg) {
	                this.activate();
	            },
	            onenteronGround:  function(event, from, to, msg) {
	                controller.updateFunction = function(delta) {
	                	var quaternion = new THREE.Quaternion();
	                    if(character.movementDirection.x > 0.1) {
	                        character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: controller.blendAnimationDuration, crossFadeWarp: false });
	                        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
	                        character.mesh.quaternion.slerp(quaternion, 0.01);
	                    } else if(character.movementDirection.x < -0.1) {
	                        character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: controller.blendAnimationDuration, crossFadeWarp: false });
	                        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
	                        character.mesh.quaternion.slerp(quaternion, 0.01);
	                    } else {
	                        character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: controller.blendAnimationDuration, crossFadeWarp: false });
	                    }
	                    controller.applyForces(delta);
	                };
	            },
	            onleaveonGround: function(event, from, to, msg) {
	                controller.updateFunction = controller.applyForces;
	            },
	            onenterinAir: function(event, from, to, msg) {
	                character.body.applyForce(new CANNON.Vec3(0, controller.jumpForce * character.characterStats.jumpHeight, 0), character.body.position);
	                controller.fsm.fall();
	            },
	            onenterfreeFall: function(event, from, to, msg) {
	                controller.updateFunction = function() {
	                    if(character.body.velocity.y > 0.01) {
	                        character.setAnimation("DE_CombatJumpUp", { loop:THREE.LoopOnce });
	                    } else if(character.body.velocity.y < -0.1) {
	                        character.setAnimation("DE_CombatJumpDown", { loop:THREE.LoopOnce });
	                    } else {
	                        this.character.setAnimation("DE_CombatJumpDown", { crossFade: true, crossFadeDuration: 0.1, crossFadeWarp: false, loop:THREE.LoopOnce });
	                    }
	                    controller.checkForGround();
	                };
	            },
	            onleavefreeFall: function(event, from, to, msg) {
	                controller.updateFunction = controller.applyForces;
	            },
	            onenterattacking: function(event, from, to, msg) {
	                character.setAnimation(character.attackAnimation, {timeScale: 1.0, loop: THREE.LoopOnce});
	                var weaponAnimationDelay = 300;
	                setTimeout(function() {
		                controller.updateFunction = function(delta) {
		                	var quaternion = new THREE.Quaternion();
		                    if(character.movementDirection.x > 0.1) {
		                        character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: controller.blendAnimationDuration, crossFadeWarp: false });
		                        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
		                        character.mesh.quaternion.slerp(quaternion, 0.01);
		                    } else if(character.movementDirection.x < -0.1) {
		                        character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: controller.blendAnimationDuration, crossFadeWarp: false });
		                        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
		                        character.mesh.quaternion.slerp(quaternion, 0.01);
		                    } else {
		                        character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: controller.blendAnimationDuration, crossFadeWarp: false });
		                    }
		                    controller.applyForces(delta);
		                };
	                }, weaponAnimationDelay);
	                controller.attack();
	            },
	            onenterattackcooldown: function(event, from, to, msg) {
	                character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: controller.blendAnimationDuration, crossFadeWarp: false });
	                //controller.updateFunction = controller.idle;
	                setTimeout(function() {
	                    var FLOOR = -4.0;
	                    if(character.body.position.y >= FLOOR + character.mesh.geometry.boundingSphere.radius + 0.01) {
	                        controller.fsm.finishAirAttack();
	                    } else {
	                        controller.fsm.activate();
	                    }
	                }, character.characterStats.attackCooldown);
	            }
	        }
	    });*/
	}
	
	return UserController;
});