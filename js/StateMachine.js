var BaseStateMachine = function(character) {
	this.startup();
	this.character = character;
};

BaseStateMachine.prototype.error = function(eventName, from, to, args, errorCode, errorMessage) {
    console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
};
BaseStateMachine.prototype.initial = 'IDLE';
BaseStateMachine.prototype.events = [
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
		from: ['IDLE', 'INAIR', 'ATTACK', 'BLOCK'],
		to: 'HIT'
	},
	{ 
		name: 'die',
		from: '*',
		to: 'DEAD'
	}
];
BaseStateMachine.prototype.callbacks = {
	onjump: function() {
        this.character.body.applyForce(new CANNON.Vec3(0, controller.jumpForce * this.character.characterStats.jumpHeight, 0), this.character.body.position);
	},
	onhit: function() {
        this.character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
        this.hitTimeout = setTimeout(function(){
            controller.fsm.wake();
        }, this.character.characterStats.hitStunDuration);
	},
    onblock: function(event, from, to, msg) {
        this.character.blocking = true;
        this.character.playAnimation("DE_Combatblock", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false });
    },
    onleaveBLOCK: function(event, from, to, msg) {
        this.character.blocking = false;
    }
};

StateMachine.create({
	target: BaseStateMachine.prototype,
	initial: BaseStateMachine.prototype.initial,
	events: BaseStateMachine.prototype.events
});
