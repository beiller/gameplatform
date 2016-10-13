define(['state-machine', 'cannon'], function(StateMachine, CANNON) {
	var BaseStateMachine = function(character, game) {
		this.character = character;
		this.game = game;
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
				name: 'attack',
				from: ['IDLE', 'INAIR'],
				to: 'ATTACK'
			},
			{ 
				name: 'block',
				from: ['IDLE', 'INAIR'],
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
			onidle: function(event, from, to, msg) {
		        console.log(event, from, to, msg);
			},
			onjump: function(event, from, to, msg) {
				console.log(event, from, to, msg);
				if(this.checkForGround()) {
					this.character.body.applyForce(new CANNON.Vec3(0, controller.jumpForce * this.character.characterStats.jumpHeight, 0), this.character.body.position);
				} else {
					console.log('we are not on the ground?');
					return false;
				}
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
		    }
		};
		var fsm = StateMachine.create({
			initial: initial,
			events: events,
			callbacks: callbacks
		});
		Object.assign(this, fsm);
		this.startup();
	};
	
	BaseStateMachine.prototype.checkForGround = function(delta) {
	    var r = this.character.mesh.geometry.boundingSphere.radius; //the half-radius to approximate my body not extending to the full sphere
	    var body = this.character.body.position;
	    var ray1 = new CANNON.Ray(new CANNON.Vec3(body.x+r*0.75, body.y, body.z), new CANNON.Vec3(body.x+r*0.75, body.y-10.0, body.z));
	    var ray2 = new CANNON.Ray(new CANNON.Vec3(body.x-r*0.75, body.y, body.z), new CANNON.Vec3(body.x-r*0.75, body.y-10.0, body.z));
	    //var ray3 = new CANNON.Ray(body, new CANNON.Vec3(body.x, body.y-1.0, body.z));
	    var r_Bias = 0.01;
	
	    if(this.character.body.velocity.y < 0.0001) {
	        var options = {
	            collisionFilterGroup: this.game.collisionGroups[1],
	            collisionFilterMask: this.game.collisionGroups[0],
	            mode: CANNON.Ray.CLOSEST
	        };
	        if (ray1.intersectWorld(this.game.world, options)) {
	            if (ray1.result.distance <= r+r_Bias) {
	                return true;
	            }
	        }
	        if (ray2.intersectWorld(this.game.world, options)) {
	            if (ray2.result.distance <= r+r_Bias) {
	                return true;
	            }
	        }
	    }
	    return false;
	};

	return BaseStateMachine;
});
