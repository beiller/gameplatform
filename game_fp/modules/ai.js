function changeDirections(state, fieldName) {
	if(Math.random() > 0.95) { // 5% chance to change behavioud
		if(Math.random() > 0.5) {
			return {...state, [fieldName]: 0}; //50% chance to stop
		} else {
			if(Math.random() > 0.5) { //50% chance to move
				return {...state, [fieldName]: 1.0};
			} else {
				return {...state, [fieldName]: -1.0};
			}
		}
	}
	return state;
}
function applyAI(state, id, eventHandler, gameState) {
	if(!('mode' in state)) {
		return {...state, mode: 1} //wander mode
	}
	if(state.mode === 1) { //wander mode
		var newState = changeDirections(state, "x");
		if(newState !== state) {
			return newState;
		}
		var newState = changeDirections(state, "y");
		if(newState !== state) {
			return newState;
		}
		return state;
	}
	if(state.mode === 2) { //attack mode
		const distx = gameState["entity"]["character1"].x - gameState.entity[id].x;
		const distz = gameState["entity"]["character1"].z - gameState.entity[id].z;
		if(( Math.abs(distx) + Math.abs(distz) ) > 5.0) {
			return {...state, x: distx, y: -distz};
		}
		return {...state, x: 0, y: 0};
	}
	
}
export {applyAI}