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

	var BaseStateMachine = function(character, game) {
		this.character = character;
		this.game = game;
		this.blendAnimationDuration = 0.05;
	    this.runBlendAnimationSpeed = 0.05;
	    this.movementForce = 25.0;
	    this.jumpForce = 450.0;

	    this.jumpTimer = new THREE.Clock();
	    
	    this.attackCoolDown = 0;

	    this.animationMap = {
			'attack': 'XP32_CombatAttack',
			'idle': 'XP32_NormalIddle',
			'walk': 'XP32_NormalRun',
			'block': 'XP32_CombatBlock',
			'hit': 'XP32_CombatHit',
			'jump_up': 'XP32_CombatJumpUp',
			'jump_down': 'XP32_CombatJumpDown',
			'fall_backwards': 'XP32_NormalIddle'
		}
		
		var error = function(eventName, from, to, args, errorCode, errorMessage) {
		    console.error('event ' + eventName + ' was naughty :- ' + errorMessage);
		};
		var initial = 'initialized';
		var events = [
			{
				name: 'playAnimation',
				from: '*',
				to: 'playinganimation'
			},
			{
				name: 'playPose',
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
				from: ['running', 'playinganimation', 'damaged'],
				to: 'idling'
			},
			{ 
				name: 'endstun',
				from: ['stunned'],
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
				from: 'blocking',
				to: 'idling'
			},
			{ 
				name: 'hit',
				from: ['idling', 'inair', 'attacking', 'stunned'],
				to: 'damaged'
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
			onplayPose: function(event, from, to, msg) {
				console.log("Playing animation " + msg);
				this.character.playPose(msg);
			},
			onplayAnimation: function(event, from, to, msg) {
				if(msg.split('_')[0] == 'face') {
					this.character.setAnimation(msg);
				} else {
					if(this.customAnimation) {
						this.character.stopAnimation(this.customAnimation);
					}
					console.log("Playing animation ", msg);
					this.customAnimation = msg;
					this.character.playAnimation(this.customAnimation);
				}
			},
			onleaveplayinganimation: function(event, from, to, msg) {
				this.character.stopAnimation(this.customAnimation);
			},
			onenterstunned: function() {
				this.character.playAnimation(this.animationMap['hit']);
				var scope = this;
				this.hitTimeout = setTimeout(function(){
				    scope.endstun();
				}, this.character.characterStats.hitStunDuration);
			},
			onleavestunned: function() {
				this.character.stopAnimation(this.animationMap['hit']);
				clearTimeout(this.hitTimeout);
			},
			onenterdamaged: function() {
				this.character.playAnimation(this.animationMap['hit']);
				var scope = this;
				this.hitTimeout = setTimeout(function(){
				    scope.idle();
				}, this.character.characterStats.damagedPauseLength);
			},
			onleavedamaged: function() {
				clearTimeout(this.hitTimeout);
				this.character.stopAnimation(this.animationMap['hit']);
			},
			onenterrunning: function() {
				this.character.playAnimation(this.animationMap['walk']);
			},
			onleaverunning: function() {
				this.character.stopAnimation(this.animationMap['walk']);
			},
			onland: function() {
				if(Math.abs(this.character.movementDirection.x) > 0.1) {
					this.run();
					return false;
				}
				this.idle();
			},
			onenterinair: function() {
				this.character.playAnimation(this.animationMap['jump_up'], {loop: THREE.LoopOnce, clampWhenFinished: true});
				this.jumpAnimation = this.animationMap['jump_up'];
				let scope = this.character;
				let stateMachine = this;
				this.jumpAnimationTimeout = setTimeout(function() {
					scope.stopAnimation(stateMachine.jumpAnimation);
					scope.playAnimation(stateMachine.animationMap['jump_down'], {loop: THREE.LoopOnce, clampWhenFinished: true});
					stateMachine.jumpAnimation = stateMachine.animationMap['jump_down'];
				}, 700);
			},
			onleaveinair: function() {
				this.character.stopAnimation(this.jumpAnimation);
				clearTimeout(this.jumpAnimationTimeout);
			},
			onjump: function(event, from, to, msg) {
				if(this.character.movementDirection.x > 0.1 || this.character.movementDirection.x < -0.1) {
					var halfJump = (this.jumpForce * 0.25);
					this.character.body.applyImpulse([halfJump * this.character.movementDirection.x, this.jumpForce * this.character.characterStats.jumpHeight, 0], this.character.body.getPosition());
				} else {
					this.character.body.applyImpulse([0, this.jumpForce * this.character.characterStats.jumpHeight, 0], this.character.body.getPosition());
				}
				this.character.onGround = false;
			},
		    onenteridling: function() {
		    	this.character.playAnimation(this.animationMap['idle']);
		    	this.idleAnimation = this.animationMap['idle'];
		    },
		    onleaveidling: function() {
		    	this.character.stopAnimation(this.idleAnimation);
		    },
		    onenterblocking: function() {
		    	this.character.playAnimation(this.animationMap['block']);
		    },
		    onleaveblocking: function() {
		    	this.character.stopAnimation(this.animationMap['block']);
		    },
		    onenterdead: function() {
		    	this.character.setAnimation(this.animationMap['fall_backwards']);
		    },
		    onenterattacking: function() {
				this.character.playAnimation(this.animationMap['attack'], { loop: THREE.LoopOnce, clampWhenFinished: true });
				this.attackingAnimation = this.animationMap['attack'];
			},
			onleaveattacking: function() {
				this.character.stopAnimation(this.attackingAnimation);
			},
		    onattack: function(event, from, to, msg) {
				for (let char_id in game.characters) {
					if (game.characters[char_id] != this.character) {
						if (game.characters[char_id].getDistance(this.character) < this.character.characterStats.range) {
							game.characters[char_id].hit(this.character);
						}
					}
				}
				let scope = this;
		        setTimeout(function() {
		        	scope.endattack();
		        }, this.character.characterStats.attackCooldown);
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
		if(this.current == 'dead') {
			return;
		}
		if(this.character.onGround && this.current == 'inair') {
			this.land();
		} 
		if(!this.character.onGround && this.current != 'running' && this.current != 'inair') {
			this.fall();
		}
		if(this.current == 'running') {
			this.applyForces(delta);
		}
		this.attackCoolDown -= (delta * 1000.0);
		//physics runs pre-update. Reset onGround attribute
		this.character.onGround = false;
	};	

	let forceVec = new THREE.Vector3();
	BaseStateMachine.prototype.applyForces = function(delta) {
		if(this.current != 'running') {
			return;
		}
	    if(Math.abs(this.character.body.getVelocityX()) < this.character.characterStats.movementSpeed) {
		    forceVec.copy(this.character.movementDirection);
		    forceVec.normalize();
		    forceVec.multiplyScalar(this.movementForce);
		    this.character.body.applyImpulse([forceVec.x, forceVec.y, forceVec.z], this.character.body.getPosition());
	    }
	};

	return BaseStateMachine;
});
