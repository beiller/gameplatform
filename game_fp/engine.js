
// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key], key)
        return result
    }, {})
}

function emitEvent(eventList, fromId, message, toId) {
	//events = [...events, {...message, from: fromId, to: toId || 'all'}];  /// TOO MUCH GC
	// we mutate the events for performance
	eventList.push({...message, from: fromId, to: toId || 'all'});
}

function copyObject(obj) {
	//return objectMap(object, (k, i)=>({...k[i]}));
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = {...obj[attr]};
    }
    return copy;
}

function handleErrors(fn, ...rest) {
	try {
		return fn(...rest);
	} catch(e) {
		console.log(e)
		return rest[0]; // returns the initial state on error
	}
}

const Map = Immutable.Map;
const List = Immutable.List;
const Stack = Immutable.Stack;

function addBehaviour(gameState, behaviourName, objectId, initialState) {
	return gameState.set("state", 
		gameState.get("state").set(behaviourName,
			gameState.get("state").get(behaviourName, Map()).set(objectId, Map(initialState))
		)
	);
}

function addSystem(gameState, systemName, func) {
	return gameState.set("systems",
		gameState.get("systems").push(Map({"name": systemName, "func": func}))
	);
}

function addEventListener(gameState, objectId, systemId) {
	return gameState.set("events", gameState.get("events").set(
		objectId, 
		gameState.get("events").get(objectId, Map()).set(
			systemId, Stack()
		)
	));
}

function myNextState(gameState) {
	return gameState.set("state", 
		gameState.get("systems").map(system=>
			([
				system.get("name"),
				gameState.get("state").get(system.get("name")).map((state, objectId)=>
					system.get("func")(
						objectId, 
						state,
						gameState.get("state").map((states, systemName)=>states.get(objectId))
					)
				)
			])
		).reduce((acc, item)=>acc.set(item[0], item[1]), Map())
	);
}
function emitEvents(gameState) {
	return gameState.set("events", 
		gameState.get("events").map((systems, objectId)=>
			systems.map((data, systemName)=>
				gameState.get("state").get(systemName).get(objectId)
			)
		)
	);
}

function myStateProcess(objectId, state, deps) {
	return state.set('a', state.get('a')+1);
}

var gameState = Map({
	systems: List(),
	events: Map(),
	state: Map()
});
gameState = addSystem(gameState, "dummy", myStateProcess);
gameState = addBehaviour(gameState, "dummy", "myobject1", {a: 1, b: 2});
gameState = addBehaviour(gameState, "dummy", "myobject2", {a: 1, b: 2});
gameState = addEventListener(gameState, "myobject1", "dummy");
console.log(JSON.stringify(gameState, null, " "));
gameState = emitEvents(myNextState(gameState));
console.log(JSON.stringify(gameState, null, " "));


function nextState(gameState) {
	const eventsCopy = gameState.events;
	const stateCopy = gameState.state;
	var newEvents = [];

	const eventHandler = {
		events: gameState.events,
		emitEvent: function(fromId, message, toId) {
			return emitEvent(newEvents, fromId, message, toId);
		}
	};

	return {
		systems: [...gameState.systems], 
		events: newEvents,
		state: objectMap(gameState.state, (value, id)=>(
			Object.assign.apply({}, gameState.systems
				.filter(
					s => s.name in gameState.state[id]
				)
				.map(sys => 
				({[sys.name]: handleErrors(sys.func,
					gameState.state[id][sys.name], 
					id, 
					gameState.state[id],  // is mutable so danger
					eventHandler
				)})
			))
		))
	};

}

export { nextState }
