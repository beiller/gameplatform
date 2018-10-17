
// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key], key)
        return result
    }, {})
}

var events = null;

function emitEvent(fromId, message, toId) {
	//events = [...events, {...message, from: fromId, to: toId || 'all'}];  /// TOO MUCH GC
	events.push({...message, from: fromId, to: toId || 'all'});
}
function clearEvents() {
	events = [];
}
clearEvents();

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
		return rest[0];
	}
}


function nextState(gameState) {
	const eventsCopy = events;
	//optimization for less GC
	if(events.length > 0) {
		clearEvents();
	}
	const stateCopy = copyObject(gameState.state);
	return {
		systems: [...gameState.systems], 
		state: objectMap(gameState.state, (value, id)=>(
			Object.assign.apply({}, gameState.systems
				.filter(
					s => s.name in gameState.state[id]
				)
				.map(sys => 
				({[sys.name]: handleErrors(sys.func,
					gameState.state[id][sys.name], 
					id, 
					stateCopy[id],
					eventsCopy
				)})
			))
		))
	};

}

export { nextState, emitEvent }
