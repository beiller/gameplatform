define(["lib/three", 'entity/Entity'], function(THREE, Entity) {
	DynamicEntity.prototype = new Entity();
	DynamicEntity.prototype.constructor = DynamicEntity;
		
	function DynamicEntity(mesh, body) {
		Entity.prototype.constructor.call(this, mesh);
	    this.body = body;
	    this.sleep = false;
	    this.meshOffset = [0,0,0];
	    
	  	this.movementForce = 90;
	    this.jumpForce = 16000;
	}
	DynamicEntity.prototype.update = function() {
	    if(!this.sleep) {
	        //update physics components and copy to mesh position
	        this.body.position.z = 0.0;
	        this.mesh.position.copy(this.body.position);
	        //this.mesh.position.x += this.meshOffset[0];
	        //this.mesh.position.y += this.meshOffset[1];
	        this.mesh.position.z += Math.abs(this.meshOffset[2]) / 2.0;
	        this.mesh.quaternion.copy(this.body.quaternion);
	    }
	    if(this.body.debugMesh) {
	    	this.body.debugMesh.position.copy(this.body.position);
	    	this.body.debugMesh.quaternion.copy(this.body.quaternion);
	    }
	};
	DynamicEntity.prototype.findDynamic = function(game, mesh) {
	    for(var i in game.dynamics) {
	        if(game.dynamics[i].mesh === mesh) {
	            return game.dynamics[i];
	        }
	    }
	};
	DynamicEntity.prototype.getDistance = function(dynamic2) {
		var p1 = new THREE.Vector3().copy(this.body.position);
		var p2 = new THREE.Vector3().copy(dynamic2.body.position);
		return p1.sub(p2).length();
	};
	return DynamicEntity;
});