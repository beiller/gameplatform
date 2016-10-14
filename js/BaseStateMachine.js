define(['lib/state-machine', 'lib/cannon'], function(StateMachine, CANNON) {
	var BaseStateMachine = function(character, game) {
		this.character = character;
		this.game = game;
		this.blendAnimationDuration = 0.05;
	    this.runBlendAnimationSpeed = 0.05;
	    this.movementForce = 90;
	    this.jumpForce = 16000;
		
		var error = function(eventName, from, to, args, errorCode, errorMessage) {
		    //console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
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
				from: ['ATTACK', 'BLOCK', 'HIT'],
				to: 'IDLE'
			},
			{ 
				name: 'jump',
				from: 'IDLE',
				to: 'INAIR'
			},
			{ 
				name: 'land',
				from: 'INAIR',
				to: 'IDLE'
			},
			{ 
				name: 'fall',
				from: ['IDLE', 'ATTACK', 'BLOCK', 'HIT'],
				to: 'INAIR'
			},
			{ 
				name: 'attack',
				from: ['IDLE'],
				to: 'ATTACK'
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
				//console.log('landed');
			},
			onfall: function() {
				//console.log('falling');
			},
			onidle: function(event, from, to, msg) {
		        console.log(event, from, to, msg);
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
			        }, 100);
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
	
	BaseStateMachine.prototype.update = function() {
		var onGround = this.checkForGround();
		if(onGround) {
			this.land();
		} else {
			this.fall();
		}
		
	};
	
	BaseStateMachine.prototype.checkForGround = function() {
	    var r = this.character.mesh.geometry.boundingSphere.radius; //the half-radius to approximate my body not extending to the full sphere
	    var body = this.character.body.position;
	    //var ray1 = new CANNON.Ray(new CANNON.Vec3(body.x+r*0.75, body.y, body.z), new CANNON.Vec3(body.x+r*0.75, body.y-10.0, body.z));
	    //var ray2 = new CANNON.Ray(new CANNON.Vec3(body.x-r*0.75, body.y, body.z), new CANNON.Vec3(body.x-r*0.75, body.y-10.0, body.z));
	    var ray3 = new CANNON.Ray(new CANNON.Vec3(body.x, body.y+10, body.z), new CANNON.Vec3(body.x, body.y-10.0, body.z));
	    var r_Bias = 10.1;
	
	    if(this.character.body.velocity.y < 0.0001) {
	        var options = {
	            collisionFilterGroup: this.game.collisionGroups[1],
	            collisionFilterMask: this.game.collisionGroups[0],
	            mode: CANNON.Ray.CLOSEST
	        };
	        /*if (ray1.intersectWorld(this.game.world, options)) {
	            if (ray1.result.distance-0.01 <= r+r_Bias) {
	            	console.log('onground ', ray1.result.distance, r+r_Bias);
	                return true;
	            }
	        }
	        if (ray2.intersectWorld(this.game.world, options)) {
	            if (ray2.result.distance-0.01 <= r+r_Bias) {
	            	console.log('onground ', ray2.result.distance, r+r_Bias);
	                return true;
	            }
	        }*/
	        if (ray3.intersectWorld(this.game.world, options)) {
	            if (ray3.result.distance <= r+r_Bias) {
	            	console.log('onground ', ray3.result.distance, r+r_Bias);
	                return true;
	            }
	        }
	    }
	    console.log('falling ', ray3.result.distance, r+r_Bias);
	    return false;
	};

	return BaseStateMachine;
});
