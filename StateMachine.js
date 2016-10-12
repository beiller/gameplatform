var fsm = {
    initial: 'IDLE',
    error: function(eventName, from, to, args, errorCode, errorMessage) {
        //console.log('event ' + eventName + ' was naughty :- ' + errorMessage);
    },
    events: [
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
    	
    ],
    callbacks: {
    	onjump: function() {
            character.body.applyForce(new CANNON.Vec3(0, controller.jumpForce * character.characterStats.jumpHeight, 0), character.body.position);
    	},
    	onhit: function() {
            character.playAnimation("DE_Hit", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false, loop: THREE.LoopOnce });
            this.hitTimeout = setTimeout(function(){
                controller.fsm.wake();
            }, character.characterStats.hitStunDuration);
    	},
        onblock: function(event, from, to, msg) {
            character.blocking = true;
            character.playAnimation("DE_Combatblock", { crossFade: true, crossFadeDuration: controller.runBlendAnimationSpeed, crossFadeWarp: false });
        },
        onleaveBLOCK: function(event, from, to, msg) {
            character.blocking = false;
        }
    }
};