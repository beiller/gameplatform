
define(["lib/three"], function(THREE) {
	var entitiesByMesh = {};

	function Entity(mesh, game) {
        THREE.EventDispatcher.call(this);
		this.mesh = mesh;
		this.game = game;
		entitiesByMesh[mesh] = this;
	}

    Entity.prototype = Object.assign( Object.create( THREE.EventDispatcher.prototype ), {
        constructor: Entity,

        getEntityByMesh: function(mesh) {
            return entitiesByMesh[mesh];
        }

    } );

	return Entity;
});
