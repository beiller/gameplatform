
define(function() {
	var entitiesByMesh = {};

	function Entity(mesh, game) {
		this.mesh = mesh;
		this.game = game;
		this.eventListeners = new Array();
		entitiesByMesh[mesh] = this;
	}
    
    Entity.prototype.addEventListener = function(type, eventHandler) {
        var listener = new Object();
        listener.type = type;
        listener.eventHandler = eventHandler;
        this.eventListeners.push(listener);
    };

    Entity.prototype.dispatchEvent = function(event) {
        for (var i = 0; i < this.eventListeners.length; i++)
            if (event.type == this.eventListeners[i].type)
                this.eventListeners[i].eventHandler(event);
    };

    Entity.prototype.getEntityByMesh = function(mesh) {
    	return entitiesByMesh[mesh];
    };

	return Entity;
});
