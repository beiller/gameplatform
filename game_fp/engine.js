
// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key], key)
        return result
    }, {})
}

var events = null;

function emitEvent(fromId, message, toId) {
	var newMessage = {...message, fromId: fromId};
	if(toId) {
		if(!(toId in events)) {
			events = { all: [...events['all']], [toId]: [newMessage] }; 
		} else {
			events = { all: [...events['all']], [toId]: [...events[toId], newMessage] }; 
		}
		return;
	}
	events = { ...events, all: [...events['all'], newMessage] };	
	return;
}
function clearEvents() {
	events = {'all': []};
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
	let newGameState = {"systems": [...gameState.systems]};

	const eventsCopy = events;
	//optimization for less GC
	if(Object.keys(events).length == 1 && events['all'].length == 0) {

	} else {
		console.log('clearing events');
		clearEvents();
	}

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
				id in eventsCopy ? eventsCopy[id].concat(eventsCopy['all']) : eventsCopy['all']
			)})
		))
	));
	
	return newGameState;
}

export { nextState, emitEvent }