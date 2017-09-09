
define(["lib/three"], function(THREE) {
	var entitiesByMesh = new Map();

	function Entity(mesh, game) {
        THREE.EventDispatcher.call(this);
		this.mesh = mesh;
		this.game = game;
		this.children = new Array();
		entitiesByMesh[mesh] = this;
	}

    Entity.prototype = Object.assign( Object.create( THREE.EventDispatcher.prototype ), {
        constructor: Entity,

        /*
			Cached entities indexed by mesh object
        */
        getEntityByMesh: function(mesh) {
            return entitiesByMesh[mesh];
        },

        /*
        	Performance sensitive update function. I hear this is a fast way :) 
        */
        update: function(updateDeep) {
			var length = this.children.length;
			if(length == 0 || updateDeep === false) {
				return;
			}
			while( length-- ) { //or length--
				this.children[length].update();
			}
        },

        /*
			Add a child element to this entity (game scenegraph)
        */
        add: function(childEntity) {
        	if(!("update" in childEntity)) {
        		throw ["Add method is not a member of child entity", childEntity];
        	}
        	this.children.push(childEntity);
        },

        /*
			Remove a child element
        */
        remove: function(childEntity) {
        	this.children = this.children.filter(function(item) { 
			    return item !== childEntity;
			});
        }

    } );

	return Entity;
});
