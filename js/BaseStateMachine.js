define(['lib/state-machine', 'lib/three'], function(StateMachine, THREE) {
	/*var animationMap = {
		'attack': 'DE_Combatattack',
		'idle': 'DE_Combatiddle',
		'walk': 'DE_CombatRun',
		'block': 'DE_Combatblock',
		'hit': 'DE_Hit'
	}*/

	/*var animationMap = {
		'attack': 'kick.001',
		'idle': 'idle',
		'walk': 'walk',
		'block': 'DE_Combatblock',
		'hit': 'DE_Hit'
	}*/

	var animationMap = {
		'attack': 'attack',
		'idle': 'idle',
		'walk': 'walk',
		'block': 'block',
		'hit': 'hit'
	}

	var BaseStateMachine = function(character, game) {
		this.character = character;
		this.game = game;
		this.blendAnimationDuration = 0.05;
	    this.runBlendAnimationSpeed = 0.05;
	    this.movementForce = 10.0;
	    this.jumpForce = 100.0;
	    
	    this.attackCoolDown = 0;
		
		var error = function(eventName, from, to, args, errorCode, errorMessage) {
		    //console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
		};
		var initial = 'initialized';
		var events = [
			{
				name: 'playAnimation',
				from: '*',
				to: 'playinganimation'
			},
			{ 
				name: 'startup',
				from: ['initialized'],
				to: 'idling'
			},
			{ 
				name: 'endattack',
				from: ['attacking'],
				to: 'idling'
			},
			{ 
				name: 'idle',
				from: ['running', 'playinganimation', 'stunned'],
				to: 'idling'
			},
			{ 
				name: 'run',
				from: ['idling', 'running'],
				to: 'running'
			},
			{ 
				name: 'jump',
				from: ['idling', 'running'],
				to: 'inair'
			},
			{ 
				name: 'land',
				from: 'inair',
				to: 'idling'
			},
			{ 
				name: 'fall',
				from: ['idling', 'attacking', 'blocking', 'stunned', 'running'],
				to: 'inair'
			},
			{ 
				name: 'attack',
				from: ['idling'],
				to: 'attacking'
			},
			{ 
				name: 'block',
				from: ['idling'],
				to: 'blocking'
			},
			{ 
				name: 'unblock',
				from: ['blocking'],
				to: 'idling'
			},
			{ 
				name: 'hit',
				from: ['idling', 'inair', 'attacking', 'stunned'],
				to: 'stunned'
			},
			{ 
				name: 'stun',
				from: ['idling', 'inair', 'attacking', 'stunned', 'blocking'],
				to: 'stunned'
			},
			{ 
				name: 'die',
				from: '*',
				to: 'dead'
			}
		];
		var callbacks = {
			onplayAnimation: function(event, from, to, msg) {
				console.log("Playing animation " + msg);
				this.character.setAnimation(msg);
				//var scope = this;
				/*if(this.animationTimeout) {
					cancelTimeout(this.animationTimeout);
				}
				this.animationTimeout = setTimeout(function() { scope.idle(); }, 20000);*/
				//var game = this.game;
				//var character = this.character;
		        /*game.cameraUpdateFunction = function () {
		        	
	                //game.camera.position.x = scope.characters['eve'].body.getPositionX();
	                //game.camera.position.y = scope.characters['eve'].body.getPositionY();
	                //bulbLight.position.x = scope.characters['eve'].body.getPositionX() + 2.5;
	                //bulbLight.target.position.x = scope.characters['eve'].body.getPositionX();
	                //bulbLight.target.updateMatrixWorld();
	                //bulbLight.updateMatrixWorld();
	                var bone = character.findBone('camera');
	                var position = new THREE.Vector3();
	                var rotation = new THREE.Quaternion();
	                var rotation2 = new THREE.Quaternion();
	                var scale = new THREE.Vector3();
	                bone.matrixWorld.decompose(position, rotation, scale);
	                game.camera.position.copy(position);

	                //character.mesh.matrixWorld.decompose(position, rotation2, scale);
	                game.camera.quaternion.copy(rotation);
	                if(game.camera.targetQuaternion) {
	                	game.camera.quaternion.slerp(game.camera.targetQuaternion, 0.25);
	                };
	                game.bulbLight.position.x = game.characters['eve'].body.getPositionX() + 2.5;
	                game.bulbLight.target.position.x = game.characters['eve'].body.getPositionX();
	                game.bulbLight.target.updateMatrixWorld();
	                game.bulbLight.updateMatrixWorld();
		            if(game.camera.offset) {
		            	game.camera.position.y += game.camera.offset;
		            }
	                
		        };*/
			},
			onenterstunned: function() {
				this.character.setAnimation(animationMap['hit']);
				var scope = this;
				this.hitTimeout = setTimeout(function(){
				    scope.idle();
				}, this.character.characterStats.hitStunDuration);
			},
			onexitstunned: function() {
				clearTimeout(this.hitTimeout);
			},
			onenterrunning: function() {
				this.character.setAnimation(animationMap['walk']);
			},
			onexitrunning: function() {
				this.character.setAnimation(animationMap['idle']);
			},
			onland: function() {
				console.log('landing');
				if(Math.abs(this.character.movementDirection.x) > 0.1) {
					this.run();
					return false;
				}
				this.character.setAnimation(animationMap['idle']);
			},
			onenterattacking: function() {
				this.character.setAnimation(animationMap['idle']);
			},
			onendattack: function() {
				this.character.setAnimation(animationMap['idle']);
			},
			onfall: function() {
				console.log('falling');
			},
			onidle: function(event, from, to, msg) {
				console.log('idle');
		        this.character.setAnimation(animationMap['idle']);
			},
			onjump: function(event, from, to, msg) {
				console.log('Applying Impulse!', event, from, to, msg);
				this.character.body.applyImpulse([0, this.jumpForce * this.character.characterStats.jumpHeight, 0], this.character.body.getPosition());
			},
		    onblock: function(event, from, to, msg) {
		        this.character.setAnimation(animationMap['block']);
		    },
		    onattack: function(event, from, to, msg) {
		    	/*if(this.attackCoolDown > 0.0) {
		    		console.log("Can't attack, cooldown in effect", this.attackCoolDown);
		    		return false;
		    	}*/
		    	console.log("ATTACKING!", event, from, to, msg);
		    	var attackCoolDown = this.character.characterStats.attackCooldown;
		    	this.character.setAnimation(animationMap['attack'], { loop: THREE.LoopOnce });
		    	var scope = this;
			    setTimeout(function() {
			        var range = scope.character.characterStats.range;
					var me = scope.character;
					for (var char_id in game.characters) {
						var character = game.characters[char_id];
						if (character != me) {
							var dist = character.getDistance(me);
							console.log("Enemy distance", dist);
							if (dist < range) {
								character.stateMachine.hit();
								character.hit(me);
							}
						}
					}
			    }, 100);
		        setTimeout(function() {
		        	scope.endattack();
		        }, attackCoolDown - 100);
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
		//physics runs before this function. Read onGround attribute set by physics
		var onGround = this.character.onGround;
		if(onGround && this.current == 'inair') {
			this.land();
		} 
		if(!onGround && this.current != 'running' && this.current != 'idling' && this.current != 'inair') {
			this.fall();
		}
		if(this.current == 'running') {
			this.applyForces(delta);
		}
		this.attackCoolDown -= (delta * 1000.0);
		//physics runs pre-update. Reset onGround attribute
		this.character.onGround = false;
	};	
	var forceVec = new THREE.Vector3();
	BaseStateMachine.prototype.applyForces = function(delta) {
	    if(Math.abs(this.character.body.getVelocityX()) < this.character.characterStats.movementSpeed) {
		    forceVec.copy(this.character.movementDirection);
		    forceVec = forceVec.normalize();
		    var f = forceVec.multiplyScalar(this.movementForce);
		    this.character.body.applyImpulse([f.x, f.y, f.z], this.character.body.getPosition());
	    }
	};

	return BaseStateMachine;
});
