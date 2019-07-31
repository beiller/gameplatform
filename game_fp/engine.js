

class ThreadWorker {
	constructor(system) {
		if(!('workerPath' in system)) 
			throw("ThreadWorker requires workerPath parameter. eg new ThreadWorker({workerPath: './path.js'})");
		this.system = system;
		this.worker = new Worker(system.workerPath);
		this.workerPromises = {};
		this.counter = 0;
		let _self = this;
		this.worker.addEventListener('message', function(e) {
			_self.workerPromises[e.data.responseId](e.data.response);
			delete _self.workerPromises[e.data.responseId];
		}, false);
	}
	processWorkerStates(gameState) {
		this.worker.postMessage({
			responseId: this.counter,
			systemName: this.system.name,
			gameState: gameState.state
		}); // Send data to our worker.
		const promise = new Promise((resolve, reject)=>{this.workerPromises[this.counter] = resolve});
		this.counter += 1;
		return promise;
	}
}

class SyncWorker {
	constructor(system) {
		this.system = system
	}
	processWorkerStates(gameState) {
		return processSystem(gameState.state[this.system.name], this.system, {}, gameState.state);
	}
}

function addSystem(gameState, item) {
	if(!("systems" in gameState)) gameState["systems"] = [];
	gameState["systems"].push(item);
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
function processSystem(systemStates, system, eventHandler, gameState) {
	return new Promise(function(resolve, reject) {
		/* Iterate through systems states and process them in sequence */
		const newStates = {};
		for(let objectId in systemStates) {
			newStates[objectId] = doStateTransition(
				systemStates[objectId], objectId, system["name"], system["func"], eventHandler, gameState
			)
		}
		resolve(newStates);
	});
}

let commandQueue = [];

function queueCommand(command) {
	commandQueue.push(command);
}

function nextState(gameState) {
	return new Promise(function(resolve, reject) {
		/* Iterate through systems and process them system by system */
		const eventHandler = getEventHandler(gameState["events"]);
		let system = null;
		let promises = [];
		for(let i = 0; i < gameState.systems.length; i++) { // system in gameState["systems"]) {
			system = gameState.systems[i];
			if(!('handler' in system)) {
				if('workerPath' in system) {
					system.handler = new ThreadWorker(system);
				} else {
					system.handler = new SyncWorker(system);
				}
			}
			//gameState.state[system.name] = processSystem(gameState.state[system.name], system, eventHandler, gameState);
			//promises[i] = processSystem(gameState.state[system.name], system, eventHandler, gameState);
			promises[i] = system.handler.processWorkerStates(gameState);
		}
		Promise.all(promises).then(function(values) {
			for(let i = 0; i < gameState.systems.length; i++) {
				gameState.state[gameState.systems[i].name] = values[i];
			}
			for(let i = 0; i < commandQueue.length; i++) {
				commandQueue[i](gameState);
			}
			commandQueue.length = 0;
			resolve(gameState);
		});
	});
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
		addSystem(gameState, item)
	});
	for(var objectId in initialState['state']) {
		gameState = createEntity(gameState, objectId, initialState['state'][objectId]);
	}
	gameState.events = initialState.events;
	return gameState;
}

var GAME_STATE = null;
function init(initialState, middleware) {
	GAME_STATE = null;
	setState(initialState);
	return GAME_STATE;
}

let LOCK = false;
function tick() {
	if(LOCK) return;
	LOCK = true;
	nextState(GAME_STATE).then((result) => { 
		GAME_STATE = result;
		LOCK = false;
	});
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
	init, nextState, loadState, 
	addSystem, createEntity, queueCommand, 
	deleteEntity, removeBehaviour, tick, getState, setState, addMiddleware
}
