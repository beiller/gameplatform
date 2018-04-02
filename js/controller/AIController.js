define(["lib/state-machine", "controller/Controller"], 
function(StateMachine, Controller) {
   
	function AIController(character, game) {
        Controller.call(this, character, game);
		this.target = 'eve';
		this.viewDistance = 10.0;
		this.blockPercent = 0.95;
	}
	
    AIController.prototype = Object.assign( Object.create( Controller.prototype ), {
        constructor: AIController,
    	update: function(delta) {
            var enemy = this.game.characters[this.target];
            var currentState = this.character.stateMachine.current;
            if(!enemy) {
                return;
            }
            if(currentState == 'stunned' || currentState == 'playinganimation') {
                return;
            }
            var dist = enemy.mesh.position.x - this.character.mesh.position.x;
            var abDist = Math.abs(dist);
        	if(abDist <= this.character.characterStats.range) {
                if(currentState == 'blocking') {
                    this.character.stateMachine.unblock();
                }
                if(currentState == 'running') {
                    this.character.stateMachine.idle();
                }
                if(Math.random() > this.blockPercent) {
                    this.character.stateMachine.attack();
                } else {
                    this.character.stateMachine.block();
                }
    		} else if(abDist < this.viewDistance && abDist > this.character.characterStats.range) {
                if(dist > 0) {
                	this.character.movementDirection.x = 1;
                } else {
                	this.character.movementDirection.x = -1;
                }
                this.character.stateMachine.run();
            } else if(currentState != 'idling' && currentState != 'attacking' && currentState != 'blocking') {
                this.character.stateMachine.idle()
            }
    	}
    });
		
	return AIController;
});
