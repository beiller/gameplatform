

function deepFreeze(object) {
	if(Object.isFrozen(object)) return object;
	// Retrieve the property names defined on object
	var propNames = Object.getOwnPropertyNames(object);
	// Freeze properties before freezing self
	for (let name of propNames) {
		let value = object[name];
		object[name] = value && typeof value === "object" ? deepFreeze(value) : value;
	}
	return Object.freeze(object);
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
		const oldState = state;
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

export { nextState, loadState, deepFreeze, addSystem, createEntity, queueCommand }
