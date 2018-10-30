import * as RENDERER from './renderer.js';
import * as ENGINE from './engine.js';
import * as INPUT from './input.js';
import * as PHYSICS from './physics.js';
import * as InspectorMiddleware from './InspectorMiddleware.js';

//welcome!

function applyInput(state, id, deps, eventHandler) {
	var newState = {...state, ...INPUT.getControllerState(state.controllerId)};
	if(newState.buttons[0] === true && state.buttons[0] === false) {
		eventHandler.emitEvent("input", id, {animationName: "DE_Dance"});
	}
	return newState;
}

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
function applyAI(state, id, deps, eventHandler) {
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

function applyMotion(state, id, deps, eventHandler) {
	var dep = null;
	if('input' in deps && 'x' in deps.input && 'y' in deps.input) {
		dep = deps['input'];
	}
	if('ai' in deps && 'x' in deps.ai && 'y' in deps.ai) {
		dep = deps['ai'];
	}
	if(dep) {
		var normalized = normalize2D(dep);
		return {
			...state,
			fx: normalized.x, 
			fz: -normalized.y
		};
	}
	return state;
}

const movementSpeed = 0.05;
function applyPhysics(state, id, deps, eventHandler) {
	if('motion' in deps) {
		const newState = {
			...state, 
			x: state.x + (deps.motion.fx * movementSpeed),
			z: state.z + (deps.motion.fz * movementSpeed),
		}
		eventHandler.emitEvent("physics", id, {newPosition: newState});
		return newState;
	}
	return state;
}

function normalize2D(point) {
	var norm = Math.sqrt(point.x * point.x + point.y * point.y);
	if (norm != 0) { // as3 return 0,0 for a point of zero length
		return {x: point.x / norm, y: point.y / norm};
	}
	return {x: 0, y: 0};
}

function applyEntity(state, id, deps, eventHandler) {
	if('physics' in deps) {
		if('randomMotion' in deps) {
			return {
				...pointCharacter(state, id, deps),
				x: deps['physics'].x + deps['randomMotion'].x,
				y: deps['physics'].y + deps['randomMotion'].y,
				z: deps['physics'].z + deps['randomMotion'].z
			};
		}
		if(deps.physics.x != state.x || deps.physics.y != state.y || deps.physics.z != state.z) {
			return {
				...pointCharacter(state, id, deps),
				x: deps['physics'].x,
				y: deps['physics'].y,
				z: deps['physics'].z
			};
		}
	}
	if('followEntity' in deps) {
		var event = true;
		var e = null;
		while(event) {
			event = eventHandler.getEvent("physics", deps.followEntity.entityName);
			if(event) e = event;
		}
		if(e)
			return {
				...pointCharacter(state, id, deps), 
				x: e.newPosition.x, 
				y: 4.0, 
				z: e.newPosition.z + 2
			};
	}
	return state;
}
function pointCharacter(state, id, deps) {
	if('motion' in deps) {
	//point character
		if(Math.abs(deps.motion.fx)+Math.abs(deps.motion.fz) > 0) {
			var rotation = Math.atan2(deps.motion.fx,deps.motion.fz);
			return {
				...state,
				rotation: {
					x: 0, 
					y: rotation,
					z: 0
				}
			};
		}
	}
	return state;
}

function applyAnimation(state, id, deps, eventHandler) {
	var e = eventHandler.getEvent("input", id);
	if(e && 'animationName' in e)
		return {
			...state, playingAnimation: true, 
			animationName: e.animationName
		};

	if('playingAnimation' in state && state.playingAnimation === true) {
		if('motion' in deps && Math.abs(deps['motion'].fx) > 0.0001) {
			return {...state, playingAnimation: false};	
		}
		return state;
	}
	if('render' in deps && deps['render']['filename'] == 'soccer_char1_gltf.glb') {
		return state;
	}
	var totalMotion = Math.abs(deps['motion'].fx) + Math.abs(deps['motion'].fz);
	if(totalMotion > 0.0001 && state.animationName != 'DE_CombatRun') {
		return {...state, animationName: 'DE_CombatRun'};
	}
	if(totalMotion < 0.0001 && state.animationName != 'DE_Combatiddle') {
		return {...state, animationName: 'DE_Combatiddle'};
	}
	
	return state;
}

function applyRender(state, id, deps, eventHandler) {
	return RENDERER.renderObject(state, id, deps);
}

function randomMotion(state, id, deps, eventHandler) {
	return {
		...state,
		x: ((Math.random() * state.speed) - state.speed / 2.0),
		y: ((Math.random() * state.speed) - state.speed / 2.0),
		z: ((Math.random() * state.speed) - state.speed / 2.0),
	};
}

function applyFollowEntity(state, id, deps, eventHandler) {
	return state;
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
			{ name: "followEntity", func: applyFollowEntity },
			{ name: "animation", func: applyAnimation },
			{ name: "render", func: applyRender },
		],
		"events": {
			"physics": {
				"character1": []
			},
			"input": {
				"character1": []
			}
		},
		"state": {
			"camera1": {
				"entity": {x: 0, y: 4, z: 2, rotation: {x: -0.95, y: 0.0, z: 0.0}},
				"randomMotion": { speed: 0.025, x: 0, y: 0, z: 0 },
				"render": {type: "camera"},
				"followEntity": {entityName: "character1"}
			},
			"character1": {
				"entity": {x: 0, y: 0, z: 0},
				"animation": { animationName: 'DE_Dance' },
				"render": { 
					type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.333
				},
				"input": { "controllerId": "0" },
				"motion": {fx: 0, fy: 0, fz: 0},
				"physics": {x: 0, y: 0, z: 0}
			}
		}
	};
	var numTiles = 10;
	for(var x = 0; x < numTiles; x++) {
		for(var y = 0; y < numTiles; y++) {
			initialState['state']["ground"+x+"-"+y] = {
				"entity": {x: (x*10)-(numTiles*10/2), y: 0, z: (y*10)-(numTiles*10/2)},
				"render": { 
					type: "animatedMesh", filename: "grass_tile.glb"
				}
			}	
		}
	}
	for(var i = 0; i < 10; i++) {
		var xPos = (Math.random()-0.5)*2*30;
		var zPos = (Math.random()-0.5)*2*30;
		initialState['state']["character"+(i+999)] = {
			"entity": {x: xPos, y: 0, z: zPos},
			"animation": { animationName: 'DE_Dance' },
			"render": { 
				type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.333
			},
			"ai": { x: 1.0, y: 0.0 },
			"motion": {fx: 0, fy: 0, fz: 0},
			"physics": {x: xPos, y: 0, z: 0}
		}
	}
	var middleware = [
		InspectorMiddleware.middleware
	];
	
	var gameState = ENGINE.loadState(initialState);
	console.log(gameState);
	window.gameState = gameState;
	var renderFunction = RENDERER.init(gameState);
	var nextStateFn = ENGINE.nextState;
	for(var i = 0; i < middleware.length; i++) {
		nextStateFn = middleware[i](nextStateFn);
	}
	//window.emitEvent = ENGINE.emitEvent;
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
