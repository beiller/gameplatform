import * as INPUT from '../input.js';

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
	//defaults
	if(!('buttons' in state)) {
		state = {...state, ...INPUT.DEFAULT_CONTROLS}
	}
	if(!('mode' in state)) {
		state = {...state, mode: 2} //wander mode
	}

	const distx = gameState["entity"]["character1"].x - gameState.entity[id].x;
	const distz = gameState["entity"]["character1"].z - gameState.entity[id].z;

	//logic
	if(state.mode === 1) { //wander mode
		let mode = 1;
		if(( Math.abs(distx) + Math.abs(distz) ) <= 15.0) {
			mode = 2;
		}
		state = {...state, ...INPUT.DEFAULT_CONTROLS, mode: mode};
		state = changeDirections(state, "x");
		state = changeDirections(state, "y");
	}
	if(state.mode === 2) { //run towards character1!
		let mode = 2;
		if(( Math.abs(distx) + Math.abs(distz) ) <= 5.0) {
			mode = 3;
		}
		if(( Math.abs(distx) + Math.abs(distz) ) > 25.0) {
			mode = 1;
		}
		state = {...state, ...INPUT.DEFAULT_CONTROLS, x: distx, y: -distz, mode: mode};
	}
	if(state.mode === 3) { //attack towards FIREBALL!
		let newButtons = [...state.buttons];
		newButtons[4] = true;
		newButtons[6] = false;
		let mode = 2;
		if(( Math.abs(distx) + Math.abs(distz) ) <= 2.0) {
			mode = 4;
		}
		state = {...state, buttons: newButtons, mode: mode, x: 0, y: 0}	
	}
	if(state.mode === 4) { //attack physical
		let newButtons = [...state.buttons];
		newButtons[4] = false;
		newButtons[6] = true;
		let mode = 4;
		if(( Math.abs(distx) + Math.abs(distz) ) > 2.0) {
			mode = 3;
		}
		state = {...state, buttons: newButtons, mode: mode, x: 0, y: 0}
	}
	return state;
}
export {applyAI}
