define(["lib/state-machine", "controller/Controller"], 
function(StateMachine, Controller) {
	AIController.prototype = new Controller();
	AIController.prototype.constructor = AIController;
	function AIController(character, game) {
		Controller.prototype.constructor.call(this, character, game);
		this.target = 'eve';
		this.viewDistance = 10.0;
		
	}
	
	AIController.prototype.update = function(delta) {
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
    	if(abDist <= this.character.characterStats.range && currentState == 'idling') {
            this.character.stateMachine.attack();
		} else if(abDist < this.viewDistance && abDist > this.character.characterStats.range) {
            if(dist > 0) {
            	this.character.movementDirection.x = 1;
            } else {
            	this.character.movementDirection.x = -1;
            }
            this.character.stateMachine.run();
        } else if(currentState != 'idling') {
            this.character.stateMachine.idle()
        }
	};
		
	return AIController;
});
