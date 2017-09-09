define(["lib/three", 'entity/Entity'], function(THREE, Entity) {

	// index used to find DynamicEntity by body
	var dynamicEntitiesByBody = new Map();

	// temporary vectors pre-allocated
	var p1 = new THREE.Vector3();
	var p2 = new THREE.Vector3();

	function DynamicEntity(mesh, game, body) {
		Entity.call(this, mesh, game);

	    this.body = body;
	    this.sleep = false;
	    this.meshOffset = [0,0,0];

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

	DynamicEntity.prototype = Object.assign( Object.create( Entity.prototype ), {

		constructor: DynamicEntity,

		/*
			General update function for game-graph

			updateDeep - used to optionally disable updating children
		*/
		update: function(updateDeep) {
		    if(!this.sleep) {
		        //update physics components and copy to mesh position
		        this.mesh.position.fromArray(this.body.getPosition());
		        this.mesh.quaternion.fromArray(this.body.getQuaternion());
		    }
		    if(this.body && this.body.debugMesh) {
		    	this.body.debugMesh.position.fromArray(this.body.getPosition());
		    	this.body.debugMesh.quaternion.fromArray(this.body.getQuaternion());
		    }
		    Entity.prototype.update.call(this, updateDeep);
		},

		/*
			Lookup function getting a dynamic entity by body as an index
		*/
		getEntityByBody: function(body) {
		    return dynamicEntitiesByBody[body];
		},

		/*
			Calculate distance between 2 dynamic entities
		*/
		getDistance: function(dynamic2) {
			p1.fromArray(this.body.getPosition());
			p2.fromArray(dynamic2.body.getPosition());
			return p1.sub(p2).length();
		}
	});

	return DynamicEntity;
});