import * as RENDERER from './renderer.js';
import * as ENGINE from './engine.js';
import * as INPUT from './input.js';

//welcome!

function applyInput(state, id) {
	var newState = {...state, ...INPUT.getControllerState(state.controllerId)};
	if(newState.buttons[0] === true && state.buttons[0] === false) {
		emitEvent(id, {animationName: "DE_Dance"}, id);
	}
	return newState;
}

function applyAI(state, id, deps) {
	if(Math.random() > 0.95) {
		if(Math.random() > 0.5) {
			return {...state, x: 0};
		} else {
			if(Math.random() > 0.5) {
				return {...state, x: 1.0};
			} else {
				return {...state, x: -1.0};
			}
		}
	}
	if(Math.random() > 0.95) {
		if(Math.random() > 0.5) {
			return {...state, y: 0};
		} else {
			if(Math.random() > 0.5) {
				return {...state, y: 1.0};
			} else {
				return {...state, y: -1.0};
			}
		}
	}
	return state;
}

function applyMotion(state, id, deps) {
	if('input' in deps && 'x' in deps.input && 'y' in deps.input) {
		return {
			...state,
			fx: deps['input'].x * 0.1,
			fz: deps['input'].y * -0.1
		}
	}
	if('ai' in deps && 'x' in deps.ai && 'y' in deps.ai) {
		return { ...state, fx: deps['ai'].x * 0.1, fz: deps['ai'].y * -0.1 }
	}
	return state;
}

function applyPhysics(state, id, deps) {
	if('motion' in deps) {
		return {
			...state,
			x: state.x + deps["motion"].fx,
			z: state.z + deps["motion"].fz
		};
	}
	return state;
}

function applyEntity(state, id, deps) {
	var newState = {...state};
	var returnNewState = false;
	if('physics' in deps) {
		newState.x = deps['physics'].x;
		newState.y = deps['physics'].y;
		newState.z = deps['physics'].z;		
		returnNewState = true;
	}
	if('randomMotion' in deps) {
		newState.x += deps['randomMotion'].x;
		newState.y += deps['randomMotion'].y;
		newState.z += deps['randomMotion'].z;
		returnNewState = true;
	}
	if(returnNewState) {
		return newState;
	}
	return state;
}

function applyAnimation(state, id, deps, inbox) {
	if(inbox.length > 0) {
		for(var i = inbox.length-1; i >= 0; i--) {
			if('animationName' in inbox[i]) {
				console.log("Triggering animation", inbox[i]['animationName']);
				return {...state, playingAnimation: true, animationName: inbox[i]['animationName']};
			}
		}
	}
	if('playingAnimation' in state && state.playingAnimation === true) {
		if('motion' in deps && Math.abs(deps['motion'].fx) > 0.0001) {
			return {...state, playingAnimation: false};	
		}
		return state;
	}
	var totalMotion = Math.abs(deps['motion'].fx) + Math.abs(deps['motion'].fz);
	if(totalMotion > 0.0001 && state.animationName != 'DE_NormalRun') {
		return {...state, animationName: 'DE_NormalRun'};
	}
	if(totalMotion < 0.0001 && state.animationName != 'DE_NormalIddle') {
		return {...state, animationName: 'DE_NormalIddle'};
	}
	
	return state;
}

function applyRender(state, id, deps) {
	return RENDERER.renderObject(state, id, deps);
}

function randomMotion(state, id, deps) {
	return {
		...state,
		x: ((Math.random() * state.speed) - state.speed / 2.0),
		y: ((Math.random() * state.speed) - state.speed / 2.0),
		z: ((Math.random() * state.speed) - state.speed / 2.0),
	};
}

function testMiddleware(nextStateFn) {
	function newMiddleware(state) {
		if(Math.random() > 0.99) {
			console.log(state);
		}
		var nextState = nextStateFn(state);
		//console.log(nextState);
		return nextState;
	}
	return newMiddleware;
}

function main() {
	var initialState = {
		"systems": [	
			{ name: "input", func: applyInput },
			{ name: "ai", func: applyAI },
			{ name: "motion", func: applyMotion },
			{ name: "physics", func: applyPhysics },
			{ name: "randomMotion", func: randomMotion },
			{ name: "entity", func: applyEntity },
			{ name: "animation", func: applyAnimation },
			{ name: "render", func: applyRender },
		],
		"state": {
			"camera1": {
				"entity": {x: 0, y: 8, z: 3, rotation: {x: -0.95, y: 0.0, z: 0.0}},
				"randomMotion": { speed: 0.025, x: 0, y: 0, z: 0 },
				"render": {type: "camera"}
			},
			"character1": {
				"entity": {x: 0, y: 0, z: 0},
				"animation": { animationName: 'DE_Shy' },
				"render": { 
					type: "animatedMesh", 
					filename: "DefenderLingerie00.glb"
				},
				"input": { "controllerId": "0" },
				"motion": {fx: 0, fy: 0, fz: 0},
				"physics": {x: 0, y: 0, z: 0}
			}
		}
	};
	for(var i = 0; i < 5; i++) {
		var xPos = (Math.random()-0.5)*2*30;
		initialState['state']["character"+(i+999)] = {
			"entity": {x: xPos, y: 0, z: 0},
			"animation": { animationName: 'DE_Dance' },
			"render": { 
				type: "animatedMesh", filename: "DefenderLingerie00.glb"
			},
			"ai": { x: 1.0, y: 0.0 },
			"motion": {fx: 0, fy: 0, fz: 0},
			"physics": {x: xPos, y: 0, z: 0}
		}
	}
	var middleware = [testMiddleware];
	console.log(initialState);
	window.gameState = initialState;
	var renderFunction = RENDERER.init(initialState);
	var nextStateFn = ENGINE.nextState;
	for(var i = 0; i < middleware.length; i++) {
		nextStateFn = middleware[i](nextStateFn);
	}
	window.emitEvent = ENGINE.emitEvent;
	function tick() {
		//window.gameState = ENGINE.nextState(window.gameState);
		window.gameState = nextStateFn(window.gameState);
		renderFunction();
		requestAnimationFrame(tick);
	}
	requestAnimationFrame(tick);
}

main();
console.log('hello world');
