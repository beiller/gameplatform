
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
