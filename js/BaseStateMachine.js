define(['lib/state-machine', 'lib/cannon'], function(StateMachine, CANNON) {
	var BaseStateMachine = function(character, game) {
		this.character = character;
		this.game = game;
		this.blendAnimationDuration = 0.05;
	    this.runBlendAnimationSpeed = 0.05;
	    this.movementForce = 90;
	    this.jumpForce = 16000;
		
		var error = function(eventName, from, to, args, errorCode, errorMessage) {
		    console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
		};
		var initial = 'NONE';
		var events = [
			{ 
				name: 'startup',
				from: ['NONE'],
				to: 'IDLE'
			},
			{ 
				name: 'idle',
				from: ['ATTACK', 'BLOCK', 'HIT', 'RUN'],
				to: 'IDLE'
			},
{ 
				name: 'run',
				from: ['IDLE'],
				to: 'RUN'
			},
			{ 
				name: 'jump',
				from: ['IDLE', 'RUN'],
				to: 'INAIR'
			},
			{ 
				name: 'land',
				from: 'INAIR',
				to: 'IDLE'
			},
			{ 
				name: 'fall',
				from: ['IDLE', 'ATTACK', 'BLOCK', 'HIT', 'AIRATTACK', 'RUN'],
				to: 'INAIR'
			},
			{ 
				name: 'attack',
				from: ['IDLE'],
				to: 'ATTACK'
			},
			{ 
				name: 'attack',
				from: ['INAIR'],
				to: 'AIRATTACK'
			},
			{ 
				name: 'block',
				from: ['IDLE'],
				to: 'BLOCK'
			},
			{ 
				name: 'hit',
				from: ['IDLE', 'INAIR', 'ATTACK', 'BLOCK', 'HIT'],
				to: 'HIT'
			},
			{ 
				name: 'dead',
				from: '*',
				to: 'DEAD'
			}
		];
		var callbacks = {
			onland: function() {
				console.log('landing');
				if(Math.abs(this.character.movementDirection.x) > 0.1) {
					this.run();
					return false;
				}
				this.character.setAnimation("DE_Combatiddle");
			},
			onfall: function() {
				console.log('falling');
			},
			onidle: function(event, from, to, msg) {
				console.log('idle');
		        this.character.setAnimation("DE_Combatiddle");
			},
			onrun: function(event, from, to, msg) {
				console.log('run');
				this.character.setAnimation("DE_CombatRun");
			},
			onjump: function(event, from, to, msg) {
				console.log(event, from, to, msg);
				this.character.body.applyForce(new CANNON.Vec3(0, this.jumpForce * this.character.characterStats.jumpHeight, 0), this.character.body.position);
			},
			onhit: function(event, from, to, msg) {
		        /*this.character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
		        this.hitTimeout = setTimeout(function(){
		            controller.fsm.wake();
		        }, this.character.characterStats.hitStunDuration);*/
		       console.log(event, from, to, msg);
			},
		    onblock: function(event, from, to, msg) {
		        /*this.character.blocking = true;
		        this.character.playAnimation("DE_Combatblock", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false });
		        */
		       console.log(event, from, to, msg);
		    },
		    onattack: function(event, from, to, msg) {
		    	console.log("ATTACKING!");
		    	this.character.setAnimation("DE_Combatattack");
		    	var scope = this;
			    this.attackTimeout = setTimeout(function() {
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
			        scope.attackTimeout = setTimeout(function() {
			        	scope.idle();
			        }, scope.character.characterStats.attackCooldown);
			    }, 100);
		    }
		};
		var fsm = StateMachine.create({
			initial: initial,
			error: error,
			events: events,
			callbacks: callbacks
		});
		Object.assign(this, fsm);
		this.startup();
	};
	
	BaseStateMachine.prototype.update = function(delta) {
		var onGround = this.checkForGround();
		if(onGround && this.current == 'INAIR') {
			this.land();
		} 
		if(!onGround && this.current != 'RUN' && this.current != 'IDLE') {
			this.fall();
		}
		if(onGround) {
			this.applyForces(delta);
		}
	};
	
	BaseStateMachine.prototype.applyForces = function(delta) {
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
	
	BaseStateMachine.prototype.checkForGround = function() {
	    var r = this.character.mesh.geometry.boundingSphere.radius; //the half-radius to approximate my body not extending to the full sphere
	    var body = this.character.body.position;
	    var testList = [
	    	[new CANNON.Vec3(body.x+r*0.75, body.y, body.z), new CANNON.Vec3(body.x+r*0.75, body.y-10.0, body.z)],
	    	[new CANNON.Vec3(body.x-r*0.75, body.y, body.z), new CANNON.Vec3(body.x-r*0.75, body.y-10.0, body.z)],
	    ];
	    var ray3 = new CANNON.Ray(from, to);
	    var r_Bias = 0.5;
	
	    if(Math.abs(this.character.body.velocity.y) < 0.5) {
	        var options = {
	            collisionFilterGroup: this.game.collisionGroups[1],
	            collisionFilterMask: this.game.collisionGroups[0],
	            skipBackfaces: false,
	            mode: CANNON.Ray.CLOSEST
	        };
	      	var raycastResult = new CANNON.RaycastResult();
	      	for(var testRayIndex in testList) {
	      		var from = testList[testRayIndex][0];
	      		var to = testList[testRayIndex][1];
				if(this.game.world.raycastClosest(from, to, options, raycastResult) === true) {
					if (raycastResult.distance <= r+r_Bias) {
						return true;
					}
				}
			}
	    }
	    return false;
	};

	return BaseStateMachine;
});
