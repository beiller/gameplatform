define(["lib/three", 'entity/Entity'], function(THREE, Entity) {
	var dynamicEntitiesByBody = {};

	DynamicEntity.prototype = new Entity();
	DynamicEntity.prototype.constructor = DynamicEntity;
		
	function DynamicEntity(mesh, game, body) {
		Entity.prototype.constructor.call(this, mesh, game);
	    this.body = body;
	    this.sleep = false;
	    this.meshOffset = [0,0,0];
	    if(body) {
	    	/*
	    	interesting javascript gotcha... have to call constructor for inheritance above? This will fail.
	    	*/
	    	dynamicEntitiesByBody[body] = this;
		    var scope = this;
			game.physicsWorld.addCollisionCallback(body.body, function(body1, body2, collisionPoint) { 
				e1 = scope.getEntityByBody(body1);
				e2 = scope.getEntityByBody(body2);
				scope.dispatchEvent({
					type: "COLLIDE",
					entity1: e1,
					entity2: e2,
					collisionPoint: collisionPoint
				});
			});
		}
	}
	DynamicEntity.prototype.update = function() {
	    if(!this.sleep) {
	        //update physics components and copy to mesh position
	        this.mesh.position.fromArray(this.body.getPosition());
	        this.mesh.quaternion.fromArray(this.body.getQuaternion());
	    }
	    if(this.body && this.body.debugMesh) {
	    	this.body.debugMesh.position.fromArray(this.body.getPosition());
	    	this.body.debugMesh.quaternion.fromArray(this.body.getQuaternion());
	    }
	};
	DynamicEntity.prototype.getEntityByBody = function(body) {
	    return dynamicEntitiesByBody[body];
	};

	var p1 = new THREE.Vector3();
	var p2 = new THREE.Vector3();
	DynamicEntity.prototype.getDistance = function(dynamic2) {
		p1.fromArray(this.body.getPosition());
		p2.fromArray(dynamic2.body.getPosition());
		return p1.sub(p2).length();
	};
	return DynamicEntity;
});