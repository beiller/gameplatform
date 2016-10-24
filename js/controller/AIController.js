define(["lib/state-machine", "controller/Controller", "lib/three", "lib/cannon"], 
function(StateMachine, Controller, THREE, CANNON) {
	AIController.prototype = new Controller();
	AIController.prototype.constructor = AIController;
	function AIController(character, game) {
		Controller.prototype.constructor.call(this, character, game);
		this.target = 'eve';
		this.viewDistance = 10.0;
		
	}
	
	AIController.prototype.update = function(delta) {
        var enemy = this.game.characters[this.target];
        if(!enemy) {
            return;
        }
        if(enemy) {
            var dist = enemy.mesh.position.x - this.character.mesh.position.x;
            var abDist = Math.abs(dist);
        	if(abDist <= this.character.characterStats.range) {
        		this.character.stateMachine.idle();
				//TODO are we facing me?
				this.character.stateMachine.attack();
			} else if(abDist < this.viewDistance) {
                if(dist > 0) {
                	this.character.movementDirection.x = 1;
                } else {
                	this.character.movementDirection.x = -1;
                }
                this.character.stateMachine.run();
            }
        }
	};
		
	return AIController;
});
