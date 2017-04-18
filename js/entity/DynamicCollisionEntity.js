define(["lib/three", 'entity/Entity'], function(THREE, Entity) {
	var dynamicEntitiesByBody = {};

	DynamicCollisionEntity.prototype = new Entity();
	DynamicCollisionEntity.prototype.constructor = DynamicCollisionEntity;
		
	function DynamicCollisionEntity(mesh, game, body) {
		/*
			The dynamic collision entity is a rigid body that follows the
			position / rotation of another object (EG. a bone)

			mesh: this will be the THREE js objet to follow
			game: game state
			body: the rigid body
		*/
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
	DynamicCollisionEntity.prototype.update = function() {
	    if(!this.sleep) {
		    var position = new THREE.Vector3();
		    var quaternion = new THREE.Quaternion();
		    var scale = new THREE.Vector3();
		    this.mesh.matrixWorld.decompose(position, quaternion, scale);
	        this.body.setPosition([position.x, position.y, position.z]);
	        this.body.setQuaternion([quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
	    }
	    if(this.debugMesh) {
	    	var pos = this.body.getPosition();
	    	var pos2 = this.body.body.getMotionState().getWorldTransform();
	    	this.debugMesh.position.fromArray(this.body.getPosition());
	    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
	    }
	};
	DynamicCollisionEntity.prototype.getEntityByBody = function(body) {
	    return dynamicEntitiesByBody[body];
	};
	return DynamicCollisionEntity;
});