
// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key], key)
        return result
    }, {})
}

var events = {
	'all': []
};

function emitEvent(fromId, message, toId) {
	//events.push({system: systemName, state: state, id: id});
	if(toId) {
		if(!(toId in events)) { events[toId] = []; }
		events[toId].push(message);
		return;
	}
	events['all'].push(message);
	return;
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
		return rest[0];
	}
}

function nextState(gameState) {
	let newGameState = {"systems": [...gameState.systems]};

	//calculate new state
	newGameState["state"] = objectMap(gameState.state, (value, id)=>(
		Object.assign.apply({}, gameState.systems
			.filter(
				s => s.name in gameState.state[id]
			)
			.map(sys => 
			({[sys.name]: handleErrors(sys.func,
				gameState.state[id][sys.name], 
				id, 
				copyObject(gameState.state[id]),
				id in events ? events[id].concat(events['all']) : events['all']
			)})
		))
	));
	events = {'all': []};
	return newGameState;
}

export { nextState, emitEvent }