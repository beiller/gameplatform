
// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key], key)
        return result
    }, {})
}

var events = [];

function emitEvent(systemName, id, state) {
	events.push({system: systemName, state: state, id: id});
}

function copyObject(obj) {
	//return objectMap(object, (k, i)=>({...k[i]}));
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = {...obj[attr]};
    }
    return copy;
}

function nextState(gameState) {
	let newGameState = {"systems": [...gameState.systems]};
	/*for(var i in events) {
		var event = events[i];
		newGameState["state"][event.id] = {...newGameState["state"][event.id], ...event.state};
	}
	events = [];*/
	
	//calculate new state
	newGameState["state"] = objectMap(gameState.state, (value, id)=>(
		Object.assign.apply({}, gameState.systems
			.filter(
				s => s.name in gameState.state[id]
			)
			.map(sys => 
			({[sys.name]: sys.func(
				gameState.state[id][sys.name], 
				id, 
				copyObject(gameState.state[id])
			)})
		))
	));
	return newGameState;
}

export { nextState }