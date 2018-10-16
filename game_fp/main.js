import * as RENDERER from './renderer.js';
import * as ENGINE from './engine.js';
import * as INPUT from './input.js';

//welcome!

function applyInput(state, id) {
	if(state !== INPUT.getControllerState(state.controllerId)) {
		return {...state, ...INPUT.getControllerState(state.controllerId)};
	}
	return state;
}

function applyMotion(state, id, deps) {
	if('input' in deps && 'x' in deps.input && 'y' in deps.input) {
		return {
			...state,
			fx: deps['input'].x * 0.1,
			fy: deps['input'].y * 0.1
		}
	}
	return state;
}

function applyPhysics(state, id, deps) {
	if('motion' in deps) {
		return {
			x: state.x + deps["motion"].fx,
			y: state.y + deps["motion"].fy,
			z: state.z + deps["motion"].fz,
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

function applyAnimation(state, id, deps) {
	if(Math.abs(deps['input'].x) > 0.0 && state.animationName != 'DE_NormalRun') {
		return {...state, animationName: 'DE_NormalRun'};
	}
	if(Math.abs(deps['input'].x) < 0.1 && state.animationName != 'DE_Shy') {
		return {...state, animationName: 'DE_Shy'};
	}
	return state;
}

function applyRender(state, id, deps, prevState) {
	return RENDERER.render(state, id, deps, prevState);
}

function randomMotion(state, id, deps) {
	return {
		...state,
		x: ((Math.random() * state.speed) - state.speed / 2.0),
		y: ((Math.random() * state.speed) - state.speed / 2.0),
		z: ((Math.random() * state.speed) - state.speed / 2.0),
	};
}

function main() {
	var initialState = {
		"systems": [	
			{ name: "input", func: applyInput },
			{ name: "motion", func: applyMotion },
			{ name: "physics", func: applyPhysics },
			{ name: "randomMotion", func: randomMotion },
			{ name: "entity", func: applyEntity },
			{ name: "animation", func: applyAnimation },
			{ name: "render", func: applyRender },
		],
		"state": {
			"camera1": {
				"entity": {x: 0, y: 3, z: 7},
				"randomMotion": { speed: 0.025, x: 0, y: 0, z: 0 },
				"render": {type: "camera"}
			},
			"character1": {
				"entity": {x: 0, y: 0, z: 0},
				"animation": { animationName: 'DE_Shy' },
				"render": { 
					type: "animatedMesh", 
					filename: "DefenderLingerie00.glb",
					//objectName: "DE_Lingerie00_Body"
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
				type: "animatedMesh", filename: "DefenderLingerie00.glb", 
				//objectName: "DE_Lingerie00_Body"
			},
			"input": { "controllerId": "1" },
			"motion": {fx: 0, fy: 0, fz: 0},
			"physics": {x: xPos, y: 0, z: 0}
		}
	}
	console.log(initialState);
	RENDERER.init(initialState);
}

main();
console.log('hello world');
