define(["lib/three", 'entity/Entity'], function(THREE, Entity) {
	DynamicEntity.prototype = new Entity();
	DynamicEntity.prototype.constructor = DynamicEntity;
		
	function DynamicEntity(mesh, game, body) {
		Entity.prototype.constructor.call(this, mesh, game);
	    this.body = body;
	    this.sleep = false;
	    this.meshOffset = [0,0,0];
	}
	DynamicEntity.prototype.update = function() {
	    if(!this.sleep) {
	        //update physics components and copy to mesh position
	        this.mesh.position.fromArray(this.body.getPosition());
	        this.mesh.quaternion.fromArray(this.body.getQuaternion());
	    }
	    if(this.body.debugMesh) {
	    	this.body.debugMesh.fromArray(this.body.getPosition());
	    	this.body.debugMesh.fromArray(this.body.getQuaternion());
	    }
	};
	DynamicEntity.prototype.findDynamic = function(mesh) {
	    for(var i in game.dynamics) {
	        if(game.dynamics[i].mesh === mesh) {
	            return game.dynamics[i];
	        }
	    }
	};
	DynamicEntity.prototype.getDistance = function(dynamic2) {
		var p1 = new THREE.Vector3().fromArray(this.body.getPosition());
		var p2 = new THREE.Vector3().fromArray(dynamic2.body.getPosition());
		return p1.sub(p2).length();
	};
	return DynamicEntity;
});