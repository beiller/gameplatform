define(["lib/three", 'entity/Entity'], function(THREE, Entity) {
	var dynamicEntitiesByBody = {};

	var position = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    var tmpVec1 = new THREE.Vector3();
    
	function DynamicCollisionEntity(mesh, game, body, options) {
		/*
			The dynamic collision entity is a rigid body that follows the
			position / rotation of another object (EG. a bone)

			mesh: this will be the THREE js objet to follow
			game: game state
			body: the rigid body
		*/
		Entity.call(this, mesh, game);
		
	    this.body = body;
	    this.sleep = false;
	    this.localOffset = options && options.localOffset ? options.localOffset : new THREE.Vector3(0,0,0);

    	dynamicEntitiesByBody[body] = this;
	    var scope = this;
		game.physicsWorld.addCollisionCallback(body.body, function(body1, body2, collisionPoint) { 
			scope.dispatchEvent({
				type: "COLLIDE",
				entity1: dynamicEntitiesByBody[body1],
				entity2: dynamicEntitiesByBody[body2],
				collisionPoint: collisionPoint
			});
		});

	}

	DynamicCollisionEntity.prototype = Object.assign( Object.create( Entity.prototype ), {
		constructor: DynamicCollisionEntity,
		update: function(dt) {
		    if(!this.sleep) {
			    this.mesh.matrixWorld.decompose(position, quaternion, scale);
			    var worldOffset = tmpVec1.copy(this.localOffset).applyQuaternion(quaternion).add(position)
		        this.body.setPosition([worldOffset.x, worldOffset.y, worldOffset.z]);
		        this.body.setQuaternion([quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
			    if(this.debugMesh) {
			    	this.debugMesh.position.copy(worldOffset);
			    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
			    	this.debugMesh.updateMatrixWorld();
			    }
			    //following doent exist yet?
			    //this.body.body.saveKinematicState(dt);
		    }
		},
		getEntityByBody: function(body) {
		    return dynamicEntitiesByBody[body];
		}
	});

	return DynamicCollisionEntity;
});