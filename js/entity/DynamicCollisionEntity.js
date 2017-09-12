define(["lib/three", 'entity/DynamicEntity'], function(THREE, DynamicEntity) {

	var position = new THREE.Vector3();
    var quaternion = new THREE.Quaternion();
    var scale = new THREE.Vector3();
    var tmpVec1 = new THREE.Vector3();
    
	function DynamicCollisionEntity(mesh, body, unused1, unused2, game, options) {
		/*
			The dynamic collision entity is a rigid body that follows the
			position / rotation of another object (EG. a bone)

			mesh: this will be the THREE js objet to follow
			game: game state
			body: the rigid body
		*/
		DynamicEntity.call(this, mesh, game, body);
		
	    this.sleep = false;
	    this.localOffset = options && options.localOffset ? options.localOffset : new THREE.Vector3(0,0,0);
	}

	DynamicCollisionEntity.prototype = Object.assign( Object.create( DynamicEntity.prototype ), {

		constructor: DynamicCollisionEntity,
		
		update: function(updateDeep) {

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
		    //DyamicEntity.prototype.update.call(this, updateDeep);
		    //Entity.prototype.update.call(this, updateDeep);
		}
	});

	return DynamicCollisionEntity;
});