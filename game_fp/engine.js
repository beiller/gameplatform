

//function v2() {	
function addSystem(gameState, systemName, func) {
	if(!("systems" in gameState)) gameState["systems"] = [];
	gameState["systems"].push({"name": systemName, "func": func});
}

function addBehaviour(gameState, behaviourName, objectId, initialState) {
	if(!("state" in gameState)) gameState["state"] = {};
	if(!(behaviourName in gameState["state"])) gameState["state"][behaviourName] = {};
	gameState["state"][behaviourName][objectId] = initialState
}

function addEventListener(gameState, systemName, objectId) {
	if(!("events" in gameState)) gameState["events"] = {};
	if(!(systemName in gameState["events"])) gameState["events"][systemName] = {};
	gameState["events"][systemName][objectId] = null;
}

function emitEvent(events, objectId, systemId, state) {
	if(objectId in events && systemId in events[objectId]) {
		events[objectId][systemId] = state;
	}
}

var deps = {}; 
var events = {};

function gatherEvent(state) {
	/*if(state.has('events')) {
		events = events.merge(state.get("events"));
		return state.delete("events");
	}*/
	return state;
}
function gatherDeps(state, objectId, systemName) {
	if(systemName == "render") return state; //skip passing deps from render its last.
	//deps = deps.set(objectId, deps.get(objectId, Map()).set(systemName, state));
	if(!(objectId in deps))
		deps[objectId] = {}
	deps[objectId][systemName] = state;
	return state;
}

function doStateTransition(state, objectId, systemName, systemFunc) {
	return gatherDeps(
		gatherEvent(
			systemFunc(
				state,
				objectId, 
				//deps.get(objectId, Map()),
				objectId in deps ? deps[objectId] : {},
				events
			)
		), objectId, systemName
	)
}
function processSystem(systemStates, system) {
	for(var objectId in systemStates) {
		systemStates[objectId] = doStateTransition(
			systemStates[objectId], objectId, system["name"], system["func"]
		)
	}
}

function nextState(gameState) {
	
	gameState["systems"].forEach(system=>{
		processSystem(gameState["state"][system["name"]], system);
	});
	return gameState;

}

function loadState(initialState) {
	//parse initialState
	var gameState = {};
	initialState.systems.forEach(item=>{
		addSystem(gameState, item.name, item.func)
	});
	for(var objectId in initialState['state']) {
		for(var systemName in initialState['state'][objectId]) {
			addBehaviour(
				gameState, systemName, objectId, initialState['state'][objectId][systemName]
			);
		}
	}
	return gameState;
}

export { nextState, addSystem, addBehaviour, addEventListener, loadState }
