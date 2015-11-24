
var INVINCIBILITY_TIME = 2000;
var BLEND_ANIMATION_TIME = 0.33;

function Controllerv2(character, game) {
    this.character = character;
    this.game = game;
    this.target = 'eve';
    this.attackMovementSpeed = this.character.movementSpeed * 1.25;
    this.nomalMovementSpeed = this.character.movementSpeed;
    this.idleTillAttackTime = 1200;
    this.idleAfterAttackTime = 3000;
    this.viewDistance = 6.0;
    this.attackDistance = 0.1;
    this.damageDistance = this.character.mesh.geometry.boundingSphere.radius * 0.75;
    this.stunDuration = 1000;
    this.searchFrequency = 200; //look around every 200ms

    this.update = function() {}

    var controller = this;
    var fsm = StateMachine.create({
      initial: 'idle',
      events: [
        { name: 'activate',      from: 'idle',       to: 'search' },
        { name: 'foundEnemy',    from: 'search',     to: 'approach'    },
        { name: 'attack',        from: 'approach',   to: 'attacking' },
        { name: 'cooldown',      from: 'attacking',     to: 'search'  }
      ],
      callbacks: {
        onenteridle:  function(event, from, to, msg) {
            console.log('enter idle state');
            this.activate();
        },
        onentersearch:  function(event, from, to, msg) {
            console.log('enter searching for player state');
            character.setAnimation("DE_Boredom", { crossFade: true, crossFadeDuration: character.runBlendAnimationSpeed, crossFadeWarp: false });
            //search for enemy
            var fsm = this;
            var interval = setInterval(function() {
                console.log('searching for enemy');
                var enemy = game.characters[controller.target];
                if(enemy) {
                    var dist = enemy.mesh.position.x - character.mesh.position.x;
                    if(Math.abs(dist) < controller.viewDistance) {
                        clearInterval(interval);
                        fsm.foundEnemy();
                    }
                }
            }, controller.searchFrequency);
        },
        onenterapproach:  function(event, from, to, msg) {
            console.log('enter approaching player state');
            character.setAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: character.runBlendAnimationSpeed, crossFadeWarp: false });
            var fsm = this;
            character.movementSpeed = character.attackMovementSpeed;
            var intervalController = controller;
            var interval = setInterval(function() {
                console.log('pointing at enemy');
                var dist = game.characters[intervalController.target].mesh.position.x - character.mesh.position.x;
                if(Math.abs(dist) <= intervalController.attackDistance) {
                    clearInterval(interval);
                    fsm.attack();
                }
                character.movementDirection = new CANNON.Vec3(dist, 0, 0);
                character.movementDirection.normalize();
            }, 1000 / 60);
            contoller.update = function() {
                var forceVec = new CANNON.Vec3().copy(character.movementDirection);
                forceVec.normalize();
                var vLen = character.body.velocity.length();
                if (vLen < character.movementSpeed) {
                    character.body.applyForce(forceVec.scale(character.movementSpeed * 100.0), character.body.position);
                }
            }
        },
        onleaveapproach: function(event, from, to, msg) {
            character.movementSpeed = normalMovementSpeed;
        },
        onenterattack:  function(event, from, to, msg) {
            console.log('enter attacking state');
            controller.update = function() {};
            character.setAnimation("DE_Combatattack", {timeScale: 2.0});
        },
        onentercooldown:  function(event, from, to, msg) {
            console.log('enter cooldown state');
        }
      }
    });
}
//var cv2 = new Controllerv2();


function Controller(character, game) {
    this.character = character;
    this.game = game;

    this.animation = null;
    this.updateFunction = this.playAnimation;

    this.blendAnimationSpeed = 15.0;
    this.runBlendAnimationSpeed = 0.33;
}
/*
TODO general purpose controller items
 */
Controller.prototype.meleeDefending = function(delta) {
    var blockChance = Math.random();
    if(blockChance < this.character.characterStats.blockRatio) {
        //var randomCounterDelay = Math.floor(Math.random() * 800) + 400;
        console.log(this.character.name + " has blocked");
        this.character.setAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false, timeScale: 2 });
        this.changeState(this.blockedAttack);
    } else {
        console.log("Monster has taken damage");
        this.character.hit(this.game.characters[this.target].characterStats);
        this.character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: this.runBlendAnimationSpeed, crossFadeWarp: false, loop:THREE.LoopOnce, timeScale: 1 });
        this.changeState(this.stunned);
        this.changeState(this.idle, 1000);
    }
};

Controller.prototype.playAnimation = function(delta) {
    if(this.animation) {
        this.character.setAnimation(this.animation, { crossFade: true, crossFadeDuration: this.blendAnimationSpeed, crossFadeWarp: false });
        this.character.playingAnimation = true;
    }
};
Controller.prototype.changeState = function(updateFunction, delayTime) {
    if(this.timeout) {
        clearTimeout(this.timeout);
    }
    if(delayTime !== undefined) {
        var scope = this;
        this.timeout = setTimeout(function() {scope.updateFunction = updateFunction;}, delayTime);
    } else {
        this.updateFunction = updateFunction;
    }
};
Controller.prototype.update = function(delta) {
    this.updateFunction(delta);
};
