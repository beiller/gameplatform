

function deepFreeze(object) {
	return object;/*
	if(Object.isFrozen(object)) return object;
	// Retrieve the property names defined on object
	var propNames = Object.getOwnPropertyNames(object);
	// Freeze properties before freezing self
	for (let name of propNames) {
		let value = object[name];
		object[name] = value && typeof value === "object" ? deepFreeze(value) : value;
	}
	return Object.freeze(object);*/
}

function addSystem(gameState, systemName, func) {
	if(!("systems" in gameState)) gameState["systems"] = [];
	gameState["systems"].push({"name": systemName, "func": func});
}

function addBehaviour(gameState, behaviourName, objectId, initialState) {
	if(!("state" in gameState)) gameState["state"] = {};
	if(!(behaviourName in gameState["state"])) gameState["state"][behaviourName] = {};
	gameState["state"][behaviourName][objectId] = initialState
}

function removeBehaviour(gameState, behaviourName, objectId) {
	if("state" in gameState && behaviourName in gameState.state && objectId in gameState.state[behaviourName]) {
		//gameState.state[behaviourName][objectId] = undefined;
		delete gameState.state[behaviourName][objectId];
	}
}

/*
	Events
*/
function addEventListener(events, systemName, objectId) {
	objectId = objectId || "all";
	if(!(systemName in events)) events[systemName] = {};
	events[systemName][objectId] = [];
}

function emitEvent(events, systemName, objectId, state) {
	objectId = objectId || "all";
	if(systemName in events && objectId in events[systemName]) {
		events[systemName][objectId].push(state);
	}
}
function getEvent(events, systemName, objectId) {
	objectId = objectId || "all";
	if(!(systemName in events)) {
		events[systemName] = {};
	}
	try {
		const e = events[systemName][objectId].pop();
		events[systemName][objectId].length = 0; // RESET THIS ARRAY avoid GC?
		return e;
	} catch(e) {
		if(e instanceof TypeError) {
			events[systemName][objectId] = [];
			return undefined;
		}
		throw e;
	}
}

function getEventHandler(events) {
	const eventSystem = {
		addEventListener: (s,o)=>addEventListener(events,s,o),
		emitEvent: (s,o,e)=>emitEvent(events,s,o,e),
		getEvent: (s,o)=>getEvent(events,s,o)
	};
	return eventSystem;
}

/*
	Core functions
*/
function doStateTransition(state, objectId, systemName, systemFunc, eventHandler, gameState) {
	try {
		//const oldState = state;
		const newState = deepFreeze(	
			systemFunc(
				state,
				objectId, 
				eventHandler,
				gameState.state
			)
		);
		/*if(oldState !== newState) {
			console.log("State changed", systemName, oldState, newState)
		}*/
		return newState;
	} catch(e) {
		console.log(e);
		return state;
	}
}
function processSystem(systemStates, system, eventHandler, gameState) {
	/* Iterate through systems states and process them in sequence */
	//mutate systemStates
	for(let objectId in systemStates) {
		systemStates[objectId] = doStateTransition(
			systemStates[objectId], objectId, system["name"], system["func"], eventHandler, gameState
		)
	}
	return systemStates;
}

let commandQueue = [];

function queueCommand(command) {
	commandQueue.push(command);
}

function nextState(gameState) {
	/* Iterate through systems and process them system by system */
	const eventHandler = getEventHandler(gameState["events"]);
	let system = null;
	for(let i = 0; i < gameState.systems.length; i++) { // system in gameState["systems"]) {
		system = gameState.systems[i];
		processSystem(gameState["state"][system["name"]], system, eventHandler, gameState); //mutate 1st arg
	}
	for(let i = 0; i < commandQueue.length; i++) {
		commandQueue[i](gameState);
	}
	commandQueue.length = 0;
	return gameState;
}

function createEntity(gameState, objectId, state) {
	for(var systemName in state) {
		addBehaviour(gameState, systemName, objectId, state[systemName]);
	}
	return gameState;
}

function deleteEntity(gameState, objectId) {
	if(!("state" in gameState)) return;
	for(var systemName in gameState.state) {
		removeBehaviour(gameState, systemName, objectId);
	}
	return gameState;
}

function loadState(initialState) {
	//parse initialState
	var gameState = {};
	initialState.systems.forEach(item=>{
		addSystem(gameState, item.name, item.func)
	});
	for(var objectId in initialState['state']) {
		gameState = createEntity(gameState, objectId, initialState['state'][objectId]);
	}
	gameState.events = initialState.events;
	return gameState;
}

var nextStateFn = null;
var GAME_STATE = null;

function init(initialState, middleware) {
	nextStateFn = null;
	GAME_STATE = null;
	nextStateFn = nextState;
	for(var i = 0; i < middleware.length; i++) {
		addMiddleware(middleware[i])
	}
	setState(initialState);
	return GAME_STATE;
}

function tick() {
	GAME_STATE = nextStateFn(GAME_STATE);
}

function setState(newInitialState) {
	GAME_STATE = loadState(newInitialState);
}

function getState() {
	return GAME_STATE;
}

function addMiddleware(newMiddleware) {
	nextStateFn = newMiddleware(nextStateFn);
}

export { 
	init, nextState, loadState, deepFreeze, 
	addSystem, createEntity, queueCommand, 
	deleteEntity, removeBehaviour, tick, getState, setState, addMiddleware
}
