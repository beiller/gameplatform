
const eventHandler = {
	events: [],
	removeBehaviour: function(arg1, arg2) {this.events.push(['removeBehaviour', arg1, arg2])},
	addBehaviour: function(arg1, arg2, arg3) {this.events.push(['addBehaviour', arg1, arg2, arg3])},
	createEntity: function(arg1, arg2) {this.events.push(['createEntity', arg1, arg2])},
	deleteEntity: function(arg1) {this.events.push(['deleteEntity', arg1])},
	popEvents: function() { const e = this.events; this.events = []; return e; }
}
function doStateTransition(state, objectId, systemName, systemFunc, eventHandler, gameState) {
	try {
		return systemFunc(
			state,
			objectId, 
			eventHandler,
			gameState
		);
	} catch(e) {
		console.log(e);
		return state;
	}
}
function processSystemWorker(systemName, systemFunc, gameState) {
    const systemStates = gameState[systemName];
    const newStates = {};
    for(let objectId in systemStates) {
        newStates[objectId] = doStateTransition(
            systemStates[objectId], objectId, systemName, systemFunc, eventHandler, gameState
        )
    }
    return newStates;
}

const functionMap = {};
const listenerMap = {};
function registerSystemFunction(systemName, systemFunction, listeners) {
	if(Object.keys(functionMap).length == 0) { // execute below for first call to this function
		self.addEventListener('message', function(e) {
			const newStates = processSystemWorker(e.data.systemName, functionMap[e.data.systemName], e.data.gameState);
			self.postMessage({
				responseId: e.data.responseId,
				response: newStates,
				events: eventHandler.popEvents()
			});
			if(e.data.systemName in listenerMap && listenerMap[e.data.systemName].onEnd) {
				listenerMap[e.data.systemName].onEnd(eventHandler, e.data.gameState)
			}
		}, false);		
	} // execute above for first call to this function
	//register the given function and optional listeners
	functionMap[systemName] = systemFunction;
	if(listeners) listenerMap[systemName] = listeners;
}
