define(["lib/state-machine", "Controller", "lib/three", "lib/cannon"], 
function(StateMachine, Controller, THREE, CANNON) {
	AIController.prototype = new Controller();
	AIController.prototype.constructor = AIController;
	function AIController(character, game) {
	    Controller.prototype.constructor.call(this, character, game);
	
	    this.target = 'eve';
	    this.attackMovementSpeed = this.character.characterStats.movementSpeed * 1.25;
	    this.normalMovementSpeed = this.character.characterStats.movementSpeed;
	    this.idleTillAttackTime = 1200;
	    this.idleAfterAttackTime = 1500;
	    this.viewDistance = 10.0;
	    this.damageDistance = this.character.mesh.geometry.boundingSphere.radius * 0.75;
	    this.stunDuration = 1000;
	    this.searchFrequency = 200; //look around every 200ms
	    this.blockChanceRatio = 0.25;
	    this.blockChanceTimer = 1000;
	
	    this.updateFunction = this.idle;
	
	    var controller = this;
	    this.fsm = StateMachine.create({
	        initial: 'idle',
	        error: function(eventName, from, to, args, errorCode, errorMessage) {
	            console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
	        },
	        events: [
	            { name: 'activate',      from: ['idle', 'approach', 'DEAD', 'BLOCKING', 'waking'],       to: 'search' },
	            { name: 'foundEnemy',    from: ['search', 'attackcooldown'],     to: 'approach'    },
	            { name: 'attack',        from: 'approach',   to: 'attacking' },
	            { name: 'cooldown',      from: 'attacking',     to: 'attackcooldown'  },
	            { name: 'hit',      from: ['idle', 'approach', 'search', 'attackcooldown', 'attacking', 'STUNNED'],     to: 'HIT'  },
	            { name: 'dead',          from: '*',                                  to: 'DEAD'},
	            { name: 'block',         from: ['approach', 'search'],               to: 'BLOCKING'},
	            { name: 'stun',          from: ['BLOCKING'],                         to: 'STUNNED'},
	            { name: 'wake',          from: ['STUNNED', 'HIT'],                   to: 'waking'},
	            { name: 'animation',           from: 'DEAD',                             to: 'ANIMATION'}
	        ],
	        callbacks: {
	            onenterANIMATION: function() {
	            	var character = controller.character;
	            	if(character.meshes['chest']) character.meshes['chest'].visible = false;
	            	if(character.meshes['pants']) character.meshes['pants'].visible = false;
	                controller.character.playAnimation("fuckself_2_1", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
	                controller.updateFunction = controller.idle;
	                var fsm = this;
	                this.animationTimeout = setTimeout(function(){
	                    fsm.dead();
	                }, 40000);
	            },
	            onleaveANIMATION: function() {
	            	var character = controller.character;
	            	if(character.meshes['chest']) character.meshes['chest'].visible = true;
	            	if(character.meshes['pants']) character.meshes['pants'].visible = true;
	            },
	            onenterwaking: function() {
	                this.activate();
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
	            onleaveBLOCKING: function(event, from, to, msg) {
	                character.blocking = false;
	                clearTimeout(this.blockingTimeout);
	            },
	            onenterBLOCKING: function(event, from, to, msg) {
	                character.blocking = true;
	                var fsm = this;
	                controller.updateFunction = controller.idle;
	                character.playAnimation("DE_Combatblock", { crossFade: true, crossFadeDuration: 0.2, crossFadeWarp: false, loop: THREE.LoopOnce });
	                var delay = Math.floor(200 + (Math.random() * controller.blockChanceTimer));
	                this.blockingTimeout = setTimeout(function() {
	                    fsm.activate();
	                }, delay);
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
	            onentersearch:  function(event, from, to, msg) {
	                character.playAnimation("DE_Boredom", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false });
	                //search for enemy
	                controller.updateFunction = function() {
	                    var enemy = game.characters[controller.target];
	                    if(!enemy) {
	                        return;
	                    }
	                    if(enemy) {
	                        var dist = enemy.mesh.position.x - character.mesh.position.x;
	                        if(Math.abs(dist) < controller.viewDistance) {
	                            controller.fsm.foundEnemy();
	                        }
	                    }
	                };
	            },
	            onleavesearch: function() {
	                controller.updateFunction = controller.idle;
	            },
	            onenterapproach:  function(event, from, to, msg) {
	                character.playAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false });
	                var fsm = this;
	                character.characterStats.movementSpeed = controller.attackMovementSpeed;
	                controller.updateFunction = function() {
	                    if(game.characters[controller.target]) {
	                        var dist = game.characters[controller.target].mesh.position.x - character.mesh.position.x;
	                        if (Math.abs(dist) <= character.characterStats.range) {
	                            var rand = Math.random();
	                            if (rand >= controller.blockChanceRatio) {
	                                fsm.attack();
	                            } else {
	                                fsm.block();
	                            }
	                        }
	                        if (Math.abs(dist) >= controller.viewDistance) {
	                            fsm.activate();
	                        }
	                        if (dist > 0) {
	                            dist = 1.0;
	                        } else {
	                            dist = -1.0;
	                        }
	                        character.movementDirection = new CANNON.Vec3(dist, 0, 0);
	                    }
	                    controller.applyForces();
	                };
	            },
	            onleaveapproach: function(event, from, to, msg) {
	                character.characterStats.movementSpeed = controller.normalMovementSpeed;
	                controller.updateFunction = controller.idle;
	            },
	            onenterattacking:  function(event, from, to, msg) {
	                character.playAnimation(character.attackAnimation, {timeScale: 1.0});
	                controller.attack();
	            },
	            onenterattackcooldown:  function(event, from, to, msg) {
	                character.playAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false });
	                var fsm = this;
	                this.cooldownTimeout = setTimeout(function() { fsm.foundEnemy();}, character.characterStats.attackCooldown);
	            },
	            onleaveattackcooldown:  function(event, from, to, msg) {
	                clearTimeout(this.cooldownTimeout);
	            },
	            onenterDEAD: function() {
	                character.playAnimation("DE_Die", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
	                setTimeout(function() {
	                	game.removeCharacter(character);
	                }, 10000);
	            },
	            onleaveDEAD: function() { clearTimeout(this.deadTimeout); }
	        }
	    });
	}
	return AIController;
});