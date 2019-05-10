

const DEFAULT_CONTROLS = {
	x: 0,
	y: 0,
	buttons: [false, false, false, false, false, false, false, false, false, false, false]
};
var controller = {
	...DEFAULT_CONTROLS
};

var controller1 = {
	...DEFAULT_CONTROLS,
	x: -1,
	y: 0,
};

function getControllerState(controllerId) {
	if(controllerId == "0") {
		return controller;
	}
	if(controllerId == "1") {
		return controller1;
	}

	return controller;
}
function setButton(state, buttonIndex, buttonValue) {
	if(buttonIndex == 0) {
		return [buttonValue, ...state.buttons.slice(1)];
	}
	if(buttonIndex == state.buttons.length - 1) {
		return [...state.buttons.slice(0, 5), buttonValue];
	}
	return [...state.buttons.slice(0, buttonIndex), buttonValue, ...state.buttons.slice(buttonIndex+1)];
}
function buttonUp(state, buttonIndex) {
	return setButton(state, buttonIndex, false);
}
function buttonDown(state, buttonIndex) {
	return setButton(state, buttonIndex, true);
}

document.addEventListener('keyup', function (e) {
	const kmap = {
		'KeyW': c=>({...c, y: c.y-1.0}),
		'KeyA': c=>({...c, x: c.x+1.0}),
		'KeyS': c=>({...c, y: c.y+1.0}),
		'KeyD': c=>({...c, x: c.x-1.0}),
		'KeyF': c=>({...c, buttons: buttonUp(c, 0)}),
		'KeyG': c=>({...c, buttons: buttonUp(c, 1)}),
		'KeyV': c=>({...c, buttons: buttonUp(c, 2)}),
		'KeyB': c=>({...c, buttons: buttonUp(c, 3)}),
		'KeyN': c=>({...c, buttons: buttonUp(c, 4)}),
		'KeyM': c=>({...c, buttons: buttonUp(c, 5)})
	}
	controller = kmap[e.code](controller);
}, false);

document.addEventListener('keydown', function (e) {
	const kmap = {
		'KeyW': c=>({...c, y: Math.min(c.y+1.0, 1)}),
		'KeyA': c=>({...c, x: Math.max(c.x-1.0, -1)}),
		'KeyS': c=>({...c, y: Math.max(c.y-1.0, -1)}),
		'KeyD': c=>({...c, x: Math.min(c.x+1.0, 1)}),
		'KeyF': c=>({...c, buttons: buttonDown(c, 0)}),
		'KeyG': c=>({...c, buttons: buttonDown(c, 1)}),
		'KeyV': c=>({...c, buttons: buttonDown(c, 2)}),
		'KeyB': c=>({...c, buttons: buttonDown(c, 3)}),
		'KeyN': c=>({...c, buttons: buttonDown(c, 4)}),
		'KeyM': c=>({...c, buttons: buttonDown(c, 5)})
	}
	controller = kmap[e.code](controller);
}, false);

document.addEventListener("mouseup", function(e) {
	const bmap = {
		0: c=>({...c, buttons: buttonUp(c, 6)}),
		1: c=>({...c, buttons: buttonUp(c, 7)}),
		2: c=>({...c, buttons: buttonUp(c, 8)}),
		3: c=>({...c, buttons: buttonUp(c, 9)})
	}
	controller = bmap[e.button](controller);
}, false);

document.addEventListener("mousedown", function(e) {
	const bmap = {
		0: c=>({...c, buttons: buttonDown(c, 6)}),
		1: c=>({...c, buttons: buttonDown(c, 7)}),
		2: c=>({...c, buttons: buttonDown(c, 8)}),
		3: c=>({...c, buttons: buttonDown(c, 9)})
	}
	controller = bmap[e.button](controller);
}, false);

export { getControllerState, DEFAULT_CONTROLS };
