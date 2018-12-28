var controller = {
	x: 0,
	y: 0,
	buttons: [false, false, false, false, false, false]
};

var controller1 = {
	x: -1,
	y: 0,
	buttons: [false, false, false, false, false, false]
};

function getControllerState(controllerId) {
	if(controllerId == "0") {
		return controller;
	}
	if(controllerId == "1") {
		return controller1;
	}

	return controller0;
}

window.onkeyup = function(e) {
	const kmap = {
		'KeyW': c=>({...c, y: c.y-1.0}),
		'KeyA': c=>({...c, x: c.x+1.0}),
		'KeyS': c=>({...c, y: c.y+1.0}),
		'KeyD': c=>({...c, x: c.x-1.0}),
		'KeyF': c=>({...c, buttons: [false, ...c.buttons.slice(1)]}),
		'KeyG': c=>({...c, buttons: [...c.buttons.slice(0, 1), false, ...c.buttons.slice(2)]}),
		'KeyZ': c=>({...c, buttons: [...c.buttons.slice(0, 2), false, ...c.buttons.slice(3)]}),
		'KeyX': c=>({...c, buttons: [...c.buttons.slice(0, 3), false, ...c.buttons.slice(4)]}),
		'KeyC': c=>({...c, buttons: [...c.buttons.slice(0, 4), false, ...c.buttons.slice(5)]}),
	}
	controller = kmap[e.code](controller);
	//console.log(controller.buttons);
}

window.onkeydown = function(e) {
	const kmap = {
		'KeyW': c=>({...c, y: Math.min(c.y+1.0, 1)}),
		'KeyA': c=>({...c, x: Math.max(c.x-1.0, -1)}),
		'KeyS': c=>({...c, y: Math.max(c.y-1.0, -1)}),
		'KeyD': c=>({...c, x: Math.min(c.x+1.0, 1)}),
		'KeyF': c=>({...c, buttons: [true, ...c.buttons.slice(1)]}),
		'KeyG': c=>({...c, buttons: [...c.buttons.slice(0, 1), true, ...c.buttons.slice(2)]}),
		'KeyZ': c=>({...c, buttons: [...c.buttons.slice(0, 2), true, ...c.buttons.slice(3)]}),
		'KeyX': c=>({...c, buttons: [...c.buttons.slice(0, 3), true, ...c.buttons.slice(4)]}),
		'KeyC': c=>({...c, buttons: [...c.buttons.slice(0, 4), true, ...c.buttons.slice(5)]}),
	}
	controller = kmap[e.code](controller);
	//console.log(controller.buttons);
}

export { getControllerState };