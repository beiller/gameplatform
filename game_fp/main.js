import * as RENDERER from './renderer.js';
import * as ENGINE from './engine.js';
import * as INPUT from './input.js';
import * as PHYSICS from './physics.js';
import * as InspectorMiddleware from './InspectorMiddleware.js';

//welcome!

function applyInput(state, id, eventHandler, gameState) {
	// TODO warning this is called for every entity that has applyInput
	var newState = {...state, ...INPUT.getControllerState(state.controllerId)};	
	if(newState.buttons[4] === true && state.buttons[4] === false) {
		if(id in gameState.physics && id in gameState.motion) {
			console.log("Queing command from entity: ", id);
			let physicsState = gameState.physics[id];
			let motionState = gameState.motion[id]
			ENGINE.queueCommand(function(gameState) {
				var xPos = physicsState.x;
				var yPos = physicsState.y;
				var zPos = physicsState.z - 1.0;
				var fx = motionState.fx * 0.001;
				var fz = motionState.fz * 0.001;
				var state = {
					"entity": {x: xPos, y: yPos, z: zPos},
					"render": { 
						type: "sphere", radius: 0.2
					},
					"motion": {fx: 0, fy: 100.5, fz: -0.5},
					"physics": {x: xPos, y: yPos, z: zPos, 
						shape: {type: "sphere", radius: 0.2 },
						mass: 0.02, damping: 0.9
					},
					"stats": {health: 99999, maxHealth: 99999},
					"particle": {maxAge: 500, damping: 0.5 }
				}
				var id = 'baddy'+(Math.random() * 100);
				ENGINE.createEntity(gameState, id, state);
			});
		}
	}
	try {
		for(var i = 0; i < newState.buttons.length; i++) {
			if(newState.buttons[i] !== state.buttons[i]) {
				return newState;
			}
		}
		if(newState.x !== state.x || newState.y !== state.y) {
			return newState;
		}
	} catch(e) {
		return {...state, ...newState};
	}
	return state;
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
function applyAI(state, id, eventHandler) {
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

const movementSpeed = 15.0;
function applyMotion(state, id, eventHandler, gameState) {
	//TODO this will listen for events and only change data "onChange"
	var dep = null; // will contain an object that contains x, y, and z field
	var damping = 1.0; // 1.0 - no damping. 0.0 - full damping
	if('particle' in gameState && id in gameState.particle) {
		damping = gameState.particle[id].damping;
		return {
			...state,
			fx: state.fx * damping, 
			fz: state.fz * damping
		}
	}

	if(id in gameState.input && 'x' in gameState.input[id] && 'y' in gameState.input[id]) {
		dep = gameState.input[id];
	}
	if(id in gameState.ai && 'x' in gameState.ai[id] && 'y' in gameState.ai[id]) {
		dep = gameState.ai[id];
	}
	if(dep) {
		var normalized = normalize2D(dep);
		if(state.fx !== normalized.x || state.fz !== normalized.y) {
			return {
				...state,
				fx: (normalized.x * movementSpeed) * damping, 
				fz: (-normalized.y * movementSpeed) * damping
			}
		}
	}
	return state;
}

function applyPhysics(state, id, eventHandler, gameState) {
	return PHYSICS.applyPhysics(state, id, eventHandler, gameState);
}

function normalize2D(point) {
	var norm = Math.sqrt(point.x * point.x + point.y * point.y);
	if (norm != 0) { // as3 return 0,0 for a point of zero length
		return {x: point.x / norm, y: point.y / norm};
	}
	return {x: 0, y: 0};
}

function applyEntity(state, id, eventHandler, gameState) {
	if(id in gameState.physics) {
		
		let y = gameState.physics[id].y; // hmm
		if(gameState.physics[id].x !== state.x || y !== state.y || gameState.physics[id].z !== state.z) {
			return {
				...pointCharacter(state, id, gameState),
				x: gameState.physics[id].x,
				y: y,
				z: gameState.physics[id].z
			};
		}
	}
	if(id in gameState.camera && gameState.camera[id].type == 'follow') {
		const physicsState = gameState.physics[gameState.camera[id].entityName];
		if(physicsState.x !== state.x || (physicsState.z + 2) !== state.z) {
			return {
				...state,
				x: physicsState.x, 
				y: 4.0, 
				z: physicsState.z + 2
			};
		}
	}
	return state;
}
function pointCharacter(state, id, gameState) {
	if(id in gameState.motion) {
		const motion = gameState.motion[id];
	//point character
		if(Math.abs(motion.fx)+Math.abs(motion.fz) > 0) {
			var rotation = Math.atan2(motion.fx, motion.fz);
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

function applyAnimation(state, id, eventHandler, gameState) {
	if(id in gameState.input && gameState.input[id].buttons[0] === true && !state.playingAnimation) {
		return {
			...state, playingAnimation: true, 
			animationName: 'DE_Dance'
		};
	}

	if('playingAnimation' in state && state.playingAnimation === true) {
		if(id in gameState.motion && (Math.abs(gameState.motion[id].fx)+Math.abs(gameState.motion[id].fz)) > 0.0001) {
			return {...state, playingAnimation: false};	
		}
		return state;
	}
	if(id in gameState.motion) {
		var totalMotion = Math.abs(gameState.motion[id].fx) + Math.abs(gameState.motion[id].fz);
		if(totalMotion > 0.0001 && state.animationName != 'DE_CombatRun') {
			return {...state, animationName: 'DE_CombatRun'};
		}
		if(totalMotion < 0.0001 && state.animationName != 'DE_Combatiddle') {
			return {...state, animationName: 'DE_Combatiddle'};
		}
	}
	
	return state;
}

function applyRender(state, id, eventHandler, gameState) {
	return RENDERER.renderObject(state, id, eventHandler, gameState);
}

function applyCamera(state, id, eventHandler, gameState) {
	return RENDERER.updateCamera(state, id, eventHandler, gameState);
}

function applyParticle(state, id, eventHandler, gameState) {
	if('age' in state && 'maxAge' in state && state.age > state.maxAge) {
		var myId = id;
		ENGINE.queueCommand(function(gameState) {
			ENGINE.deleteEntity(gameState, myId);
		});
	}
	return { ...state, age: (state.age || 0)+1, maxAge: state.maxAge || 100 };
}

function applyCollision(state, id, eventHandler, gameState) {
	return PHYSICS.applyCollision(state, id, eventHandler, gameState);
}

function applyStats(state, id, eventHandler, gameState) { 
	if('hitCooldown' in state && state.hitCooldown > 0) {
		return {...state, hitCooldown: state.hitCooldown - 1};
	}

	if(id in gameState.collision) { 
		for(var index in gameState.collision[id].colliding) {  // TODO collide multiple objects
			if(gameState.collision[id].colliding[index].id in gameState.stats) {
				console.log("Ouch!");
				return {
					...state,
					health: state.health - 10,
					hitCooldown: 100
				}
			}
		}
	}

	return state; 
}

function level1() {
	var initialState = {
		"systems": [	
			{ name: "input", func: applyInput },
			{ name: "ai", func: applyAI },
			{ name: "particle", func: applyParticle },
			{ name: "motion", func: applyMotion },
			{ name: "physics", func: applyPhysics },
			{ name: "collision", func: applyCollision },
			{ name: "camera", func: applyCamera },
			{ name: "entity", func: applyEntity },
			{ name: "stats", func: applyStats },
			{ name: "animation", func: applyAnimation },
			{ name: "render", func: applyRender },
		],
		"events": {

		},
		"state": {
			"camera1": {
				"input": { "controllerId": "0" },  // needs input to toggle modes
				"entity": {x: 0, y: 4, z: 2, rotation: {x: -0.95, y: 0.0, z: 0.0}},
				"camera": {fov: 60.0, type: 'follow', entityName: 'character1' },
				"render": {type: "camera"},
			},
			"thisisafuckingroom?": {
				"entity": {x: 0, y: 0, z: 0},
				"render": {
					type: "animatedMesh", filename: "/environments/room2.gltf"
				}
			},
			"groundplane1": {
				"entity": {x: 0, y: -10, z: 0},
				"physics": {
					mass: 0, x: 0, y: -10, z: 0, staticObject: true,
					shape: {
						type: "box", x: 250, y: 0.01, z: 250, margin: 0.000001 
					}
				}
			},
			"sphere1": {
				"entity": {x: -5, y: -9, z: -5 },
				"render": { type: "sphere", radius: 10},
				"physics": {x: -5, y: -9, z: -5, 
					shape: {type: "sphere", radius: 10 },
					mass: 0, staticObject: true
				}
			},
			"character1": {
				"entity": {x: 0, y: 0, z: 0, offsetY: -0.85 },
				"animation": { animationName: 'DE_Dance', playingAnimation: true },
				"collision": { type: "ouchie" },
				"render": { 
					type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.31
				},
				"input": { "controllerId": "0" },
				"motion": {fx: 0, fy: 0, fz: 0},
				"physics": {x: 0, y: 2.8, z: 0, 
					//shape: {type: "box", x: 0.4, y: 0.85, z: 0.4, margin: 0.00001},
					shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
					mass: 45.35, damping: 0.9, lockRotation: true
				},
				"stats": {health: 100, maxHealth: 100}
			}
		}
	};
	var numTiles = 4;
	for(var x = 0; x < numTiles; x++) {
		for(var y = 0; y < numTiles; y++) {
			initialState['state']["ground"+x+"-"+y] = {
				"entity": {x: (x*10)-(numTiles*10/2), y: 0, z: (y*10)-(numTiles*10/2)},
				"render": { 
					type: "animatedMesh", filename: "grass_tile.glb"
				},
				"physics": {
					x: (x*10)-(numTiles*10/2), y: 0, z: (y*10)-(numTiles*10/2),
					mass: 0, staticObject: true,
					shape: {
						type: "box", x: 5, y: 0.0001, z: 5, margin: 0.00001 
					}
				}
			}	
		}
	}
	var numCharacters = 10;
	for(var i = 0; i < numCharacters; i++) {
		var xPos = (Math.random()-0.5)*2*20;
		var zPos = (Math.random()-0.5)*2*20;
		initialState['state']["character"+(i+999)] = {
			"entity": {x: xPos, y: 0, z: zPos, offsetY: -0.85 },
			"animation": { animationName: 'DE_Dance', playingAnimation: true },
			"render": { 
				type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.31
			},
			"collision": { type: "ouchie" },
			"ai": { x: 1.0, y: 0.0 },
			"motion": {fx: 0, fy: 0, fz: 0},
			"physics": {x: xPos, y: 0.8, z: zPos, 
				shape: {type: "box", x: 0.4, y: 0.85, z: 0.4, margin: 0.00001},
				mass: 45.35, damping: 0.9, lockRotation: true
			},
			"stats": {health: 100, maxHealth: 100}
		}
	}
	return initialState;
}

function resetWorld() {
	var initialState = level1();
	var gameState = ENGINE.loadState(initialState);
	window.gameState = gameState;
	PHYSICS.resetWorld();
}

function main() {
	var initialState = level1();
	var middleware = [
		InspectorMiddleware.middleware
	];
	var gameState = ENGINE.init(initialState, middleware);
	console.log(gameState);
	window.gameState = gameState;
	//var renderFunction = RENDERER.init(gameState);
	RENDERER.init(gameState);
	Ammo().then(function() {   // why the fuck do I have to do this?
		PHYSICS.init(gameState);
	});
	//start game loop
	function mainLoop() {
		ENGINE.tick();
		PHYSICS.stepWorld();
		RENDERER.renderFunction();
		requestAnimationFrame(mainLoop);
	}
	requestAnimationFrame(mainLoop);
}

main();
console.log('hello world');
