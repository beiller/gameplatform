

function deepFreeze(object) {
  if(Object.isFrozen(object)) return object;
  // Retrieve the property names defined on object
  var propNames = Object.getOwnPropertyNames(object);
  // Freeze properties before freezing self
  for (let name of propNames) {
    let value = object[name];
    object[name] = value && typeof value === "object" ? 
      deepFreeze(value) : value;
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

var deps = {}; 
function getEventHandler(events) {
	const eventSystem = {
		addEventListener: (s,o)=>addEventListener(events,s,o),
		emitEvent: (s,o,e)=>emitEvent(events,s,o,e),
		getEvent: (s,o)=>getEvent(events,s,o)
	};
	return eventSystem;
}

function gatherDeps(state, objectId, systemName) {
	if(systemName == "render") return state; //skip passing deps from render its last.
	if(!(objectId in deps))
		deps[objectId] = {}
	deps[objectId][systemName] = state;
	return state;
}

function doStateTransition(state, objectId, systemName, systemFunc, eventHandler, gameState) {
	//try {
	return deepFreeze(
		gatherDeps(			
			systemFunc(
				state,
				objectId, 
				objectId in deps ? deps[objectId] : {},
				eventHandler,
				gameState
			), objectId, systemName
		)
	)
	/*} catch(e) {
		console.log(e);
		return state;
	}*/
}
function processSystem(systemStates, system, eventHandler, gameState) {
	/* Iterate through systems states and process them in sequence */
	//mutate gameState
	for(let objectId in systemStates) {
		systemStates[objectId] = doStateTransition(
			systemStates[objectId], objectId, system["name"], system["func"], eventHandler, gameState
		)
	}
	return systemStates;
}

function nextState(gameState) {
	/* Iterate through systems and process them system by system */
	const eventHandler = getEventHandler(gameState["events"]);
	let system = null;
	for(let i = 0; i < gameState.systems.length; i++) { // system in gameState["systems"]) {
		system = gameState.systems[i];
		processSystem(gameState["state"][system["name"]], system, eventHandler, gameState); //mutate gameState
	}
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

export { nextState, loadState, deepFreeze }
