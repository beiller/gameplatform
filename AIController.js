AIController.prototype = new Controller();
AIController.prototype.constructor = AIController;
function AIController(character, game) {
    Controller.prototype.constructor.call(this, character, game);

    this.target = 'eve';
    this.attackMovementSpeed = this.character.movementSpeed * 1.25;
    this.nomalMovementSpeed = this.character.movementSpeed;
    this.idleTillAttackTime = 1200;
    this.idleAfterAttackTime = 1500;
    this.viewDistance = 10.0;
    this.damageDistance = this.character.mesh.geometry.boundingSphere.radius * 0.75;
    this.stunDuration = 1000;
    this.searchFrequency = 200; //look around every 200ms

    this.updateFunction = this.idle;

    var controller = this;
    this.fsm = StateMachine.create({
        initial: 'idle',
        error: function(eventName, from, to, args, errorCode, errorMessage) {
            console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
        },
        events: [
            { name: 'activate',      from: ['idle', 'approach', 'HIT', 'DEAD'],       to: 'search' },
            { name: 'foundEnemy',    from: ['search', 'attackcooldown'],     to: 'approach'    },
            { name: 'attack',        from: 'approach',   to: 'attacking' },
            { name: 'cooldown',      from: 'attacking',     to: 'attackcooldown'  },
            { name: 'hit',      from: ['idle', 'approach', 'search', 'attackcooldown', 'attacking'],     to: 'HIT'  },
            { name: 'dead',          from: '*',                                  to: 'DEAD'}
        ],
        callbacks: {
            onenterHIT: function(event, from, to, msg) {
                controller.updateFunction = controller.idle;
                character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: character.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
                this.hitTimeout = setTimeout(function(){
                    controller.fsm.activate();
                }, character.characterStats.hitStunDuration);
            },
            onleaveHIT: function() {
                clearTimeout(this.hitTimeout);
            },
            onenteridle:  function(event, from, to, msg) {
                this.activate();
            },
            onentersearch:  function(event, from, to, msg) {
                character.playAnimation("DE_Boredom", { crossFade: true, crossFadeDuration: character.runBlendAnimationSpeed, crossFadeWarp: false });
                //search for enemy
                controller.updateFunction = function() {
                    var enemy = game.characters[controller.target];
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
                character.playAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: character.runBlendAnimationSpeed, crossFadeWarp: false });
                var fsm = this;
                character.movementSpeed = controller.attackMovementSpeed;
                controller.updateFunction = function() {
                    var dist = game.characters[controller.target].mesh.position.x - character.mesh.position.x;
                    if(Math.abs(dist) <= character.characterStats.range) {
                        fsm.attack();
                    }
                    if(Math.abs(dist) >= controller.viewDistance) {
                        fsm.activate();
                    }
                    if(dist > 0) {
                        dist = 1.0;
                    } else {
                        dist = -1.0;
                    }
                    character.movementDirection = new CANNON.Vec3(dist, 0, 0);
                    controller.applyForces();
                };
            },
            onleaveapproach: function(event, from, to, msg) {
                character.movementSpeed = controller.normalMovementSpeed;
                controller.updateFunction = controller.idle;
            },
            onenterattacking:  function(event, from, to, msg) {
                character.playAnimation("DE_Combatattack", {timeScale: 2.0});
                controller.attack();
            },
            onenterattackcooldown:  function(event, from, to, msg) {
                character.playAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false });
                var fsm = this;
                this.cooldownTimeout = setTimeout(function() { fsm.foundEnemy();}, controller.idleAfterAttackTime);
            },
            onleaveattackcooldown:  function(event, from, to, msg) {
                clearTimeout(this.cooldownTimeout);
            },
            onenterDEAD: function() {
                try {
                    var fsm = this;
                    this.deadTimeout = setTimeout(function () {
                        fsm.activate();
                        character.characterStats.health = 20;
                    }, 30000);
                    var bone = character.findBone("Bip01 weapon");
                    var mesh = bone.children[0];
                    mesh.scale.set(0.3333, 0.3333, 0.3333);
                    bone.remove(mesh);
                    var dynamic = new Dynamic().findDynamic(controller.game, mesh);
                    bone.localToWorld(mesh.position);
                    dynamic.body.position.copy(mesh.position);//.y = 10.0;
                    dynamic.sleep = false;
                    controller.game.scene.add(mesh);
                } catch(e) {
                    console.log(e);
                }
            },
            onleaveDEAD: function() { clearTimeout(this.deadTimeout); }
        }
    });
}
