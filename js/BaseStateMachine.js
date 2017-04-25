define(['lib/state-machine', 'lib/three'], function(StateMachine, THREE) {
	var BaseStateMachine = function(character, game) {
		this.character = character;
		this.game = game;
		this.blendAnimationDuration = 0.05;
	    this.runBlendAnimationSpeed = 0.05;
	    this.movementForce = 20.0;
	    this.jumpForce = 100.0;
	    
	    this.attackCoolDown = 0;
		
		var error = function(eventName, from, to, args, errorCode, errorMessage) {
		    //console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
		};
		var initial = 'NONE';
		var events = [
			{
				name: 'playAnimation',
				from: '*',
				to: 'PLAYANIMATION'
			},
			{ 
				name: 'startup',
				from: ['NONE'],
				to: 'IDLE'
			},
			{ 
				name: 'endattack',
				from: ['ATTACK'],
				to: 'IDLE'
			},
			{ 
				name: 'idle',
				from: ['RUN', 'PLAYANIMATION'],
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
				from: ['IDLE', 'ATTACK', 'BLOCK', 'HIT', 'RUN'],
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
				name: 'unblock',
				from: ['BLOCK'],
				to: 'IDLE'
			},
			{ 
				name: 'hit',
				from: ['IDLE', 'INAIR', 'ATTACK', 'HIT'],
				to: 'HIT'
			},
			{ 
				name: 'stun',
				from: ['IDLE', 'INAIR', 'ATTACK', 'HIT', 'BLOCK'],
				to: 'HIT'
			},
			{ 
				name: 'dead',
				from: '*',
				to: 'DEAD'
			}
		];
		var callbacks = {
			onplayAnimation: function(event, from, to, msg) {
				console.log("Playing animation " + msg);
				this.character.setAnimation(msg);
				var scope = this;
				if(this.animationTimeout) {
					cancelTimeout(this.animationTimeout);
				}
				this.animationTimeout = setTimeout(function() { scope.idle(); }, 20000);
				var game = this.game;
				var character = this.character;
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
			onland: function() {
				console.log('landing');
				if(Math.abs(this.character.movementDirection.x) > 0.1) {
					this.run();
					return false;
				}
				this.character.setAnimation("DE_Combatiddle");
			},
			onendattack: function() {
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
				console.log('Applying Impulse!', event, from, to, msg);
				this.character.body.applyImpulse([0, this.jumpForce * this.character.characterStats.jumpHeight, 0], this.character.body.getPosition());
			},
			onhit: function(event, from, to, msg) {
				console.log(event, from, to, msg);
				this.character.setAnimation("DE_Hit");
				var scope = this;
				this.hitTimeout = setTimeout(function(){
				    scope.idle();
				}, this.character.characterStats.hitStunDuration);
			},
		    onblock: function(event, from, to, msg) {
		        this.character.setAnimation("DE_Combatblock");
		    },
		    onattack: function(event, from, to, msg) {
		    	/*if(this.attackCoolDown > 0.0) {
		    		console.log("Can't attack, cooldown in effect", this.attackCoolDown);
		    		return false;
		    	}*/
		    	console.log("ATTACKING!", event, from, to, msg);
		    	this.attackCoolDown = this.character.characterStats.attackCooldown;
		    	this.character.setAnimation("DE_Combatattack");
		    	var scope = this;
			    setTimeout(function() {
			        var range = scope.character.characterStats.range;
			        for(var c in scope.game.characters) {
			            var myQuaternion = scope.character.mesh.quaternion;
			            var dist = scope.game.characters[c].body.getPositionX() - character.body.getPositionX();
			            var facingDist = dist;
			            var verticalDist = scope.game.characters[c].body.getPositionY() - character.body.getPositionY();
			            if(myQuaternion.y < 0.0) {
			                facingDist *= -1.0;
			            }
			            if(Math.abs(verticalDist) < 2.0 && Math.abs(dist) <= range && facingDist > 0.0 && scope.game.characters[c] !== character) {
			                scope.game.characters[c].stateMachine.hit();
			                var unitDist = -1;
			                if(dist > 0) {
			                    unitDist = 1;
			                }
			                scope.game.characters[c].body.applyImpulse([unitDist * scope.movementForce * 0.5, scope.movementForce * 0.5, 0], character.body.getPosition());
			                scope.game.characters[c].hit(character);
			            }
			
			        }
			    }, 100);
		        setTimeout(function() {
		        	scope.endattack();
		        }, 500);
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
		if(onGround && this.current == 'INAIR') {
			this.land();
		} 
		if(!onGround && this.current != 'RUN' && this.current != 'IDLE') {
			this.fall();
		}
		if(this.current == 'RUN') {
			this.applyForces(delta);
		}
		this.attackCoolDown -= (delta * 1000.0);
		//physics runs pre-update. Reset onGround attribute
		this.character.onGround = false;
	};	
	BaseStateMachine.prototype.applyForces = function(delta) {
	    if(Math.abs(this.character.body.getVelocityX()) < this.character.characterStats.movementSpeed) {
		    var forceVec = new THREE.Vector3().copy(this.character.movementDirection);
		    forceVec = forceVec.normalize();
		    var f = forceVec.multiplyScalar(this.movementForce);
		    this.character.body.applyImpulse([f.x, f.y, f.z], this.character.body.getPosition());
	    }
	};

	return BaseStateMachine;
});
