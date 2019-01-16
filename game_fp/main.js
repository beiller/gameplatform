import * as RENDERER from './renderer.js';
import * as ENGINE from './engine.js';
import * as INPUT from './input.js';
import * as PHYSICS from './physics.js';
import * as LEVEL from './level.js';
import * as InspectorMiddleware from './InspectorMiddleware.js';

//welcome!

function getSpell(radius, xPos, yPos, zPos, fx, fy, fz, fDamping, mass, noContact, maxAge, damping, stats) {
	return {
		"entity": {x: xPos, y: yPos, z: zPos},
		"render": { 
			type: "sphere", radius: radius
		},
		"motion": {fx: fx, fy: fy, fz: fz},
		"physics": {x: xPos, y: yPos, z: zPos, 
			shape: {type: "sphere", radius: radius },
			mass: mass, damping: damping, noContact: noContact
		},
		"stats": stats ? stats : defaultStats,
		"particle": {maxAge: maxAge, damping: fDamping }
	};
}
function getProjectileSpell(radius, xPos, yPos, zPos, fx, fy, fz, stats) {
	const fDamping = 0.8;
	const mass = 0.02;
	const noContact = true;
	const maxAge = 10;
	const damping = 0.9;
	return getSpell(radius, xPos, yPos, zPos, fx, fy, fz, fDamping, mass, noContact, maxAge, damping, stats);
}

function getProjectileCollidingSpell(radius, xPos, yPos, zPos, fx, fy, fz, stats) {
	const fDamping = 0.9;
	const mass = 100.0;
	const noContact = false;
	const maxAge = 50;
	const damping = 0.5;
	return getSpell(radius, xPos, yPos, zPos, fx, fy, fz, fDamping, mass, noContact, maxAge, damping, stats);
}

const defaultStats = { 
	effect: {
		fire: 50
	}
};
function getFireSpell(x, y, z, facingX, facingZ) {
	const stats = defaultStats;
	const fireballForce = 0.15;
	const nVec = normalize2D({x: facingX, y: facingZ});
	const fx = nVec.x * fireballForce;
	const fz = nVec.y * fireballForce;
	const fy = 0.01;
	const rAmt = 0.3333 * fireballForce; //random direction scale
	const r1 = (Math.random() * rAmt) - (rAmt*0.5);
	const r2 = (Math.random() * rAmt) - (rAmt*0.5);
	const radius = 0.5;
	//offset xyz by radius + character radius
	const cRadius = 0.8 // hard coded temp radius for character
	x += nVec.x * (radius+cRadius); 
	z += nVec.y * (radius+cRadius); 
	return getProjectileSpell(radius, x, y, z, fx+r1, fy, fz+r2, stats);
}
function getMeteorSpell(x, y, z, facingX, facingZ) {
	const stats = defaultStats;
	
	const fireballForce = 0.025;
	const rAmt = 0.3333 * fireballForce; //random direction scale
	const r1 = (Math.random() * rAmt) - (rAmt*0.5);
	const r2 = (Math.random() * rAmt) - (rAmt*0.5);
	const meteorFieldRadius = 1.0 // nxn meters
	const meteorRandomHeight = 1.0 // nxn meters
	const r3 = (Math.random() * meteorFieldRadius) - (meteorFieldRadius*0.5);
	const r4 = (Math.random() * meteorFieldRadius) - (meteorFieldRadius*0.5);
	const r5 = Math.random() * meteorRandomHeight
	const radius = 0.5;
	const nVec = normalize2D({x: facingX, y: facingZ});
	const cRadius = 0.8 // hard coded temp radius for character
	x += nVec.x * (radius+cRadius); 
	z += nVec.y * (radius+cRadius); 
	
	const fx = 0.5 * (fireballForce * nVec.x);
	const fy = -500.0;
	const fz = 0.5 * (fireballForce * nVec.y);
	return getProjectileCollidingSpell(radius, x+r3, y+10+r5, z+r4, fx+r1, fy, fz+r2, stats);
}

function queueSpell(spellFunction, physicsState, motionState) {
	const temp_id = 'baddy'+(Math.random() * 100);
	ENGINE.queueCommand(function(gameState) {
		const fstate = spellFunction(
			physicsState.x, physicsState.y, physicsState.z, motionState.facingX, motionState.facingZ
		);
		ENGINE.createEntity(gameState, temp_id, fstate);
	});
}
const spellMap = {
	"fireball": getFireSpell,
	"meteorstorm": getMeteorSpell
}
function applyMagic(state, id, eventHandler, gameState) {
	if(!state) {
		return {
			spells: ["fireball", "meteorstorm"],
			cooldowns: [100, 100]
		}
	}
	if(id in gameState.input) {
		const physicsState = gameState.physics[id];
		const motionState = gameState.motion[id];
		const inputState = gameState.input[id];
		
		//todo calculate proper xyz emission position
		if(inputState.buttons[4] || inputState.buttons[5]) {
			const spellIndex = inputState.buttons[4] ? 0 : 1;
			if(state.cooldowns[spellIndex] <= 0) {
				queueSpell(spellMap[state.spells[spellIndex]], physicsState, motionState);
				const newCooldown = [...state.cooldowns]
				newCooldown[spellIndex] = 25;
				return { ...state, cooldowns: newCooldown };
			}
		}
	}
	return {...state, cooldowns: state.cooldowns.map(x => Math.max(0, x-1))}
}
function applyInput(state, id, eventHandler, gameState) {
	return {...state, ...INPUT.getControllerState(state.controllerId)};	
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
	var dep = null; // will contain an object that contains x, y, and z field
	var damping = 1.0; // 1.0 - no damping. 0.0 - full damping
	if('particle' in gameState && id in gameState.particle) {
		damping = gameState.particle[id].damping;
		return {
			...state,
			fx: state.fx * damping, 
			fy: state.fy * damping, 
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
				fx: (normalized.x * movementSpeed), 
				fz: (-normalized.y * movementSpeed),
				facingX: state.fx || 0,
				facingY: state.fy || 0,
				facingZ: state.fz || 1
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
function normalize3D(point) {
	var norm = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
	if (norm != 0) { // as3 return 0,0 for a point of zero length
		return {x: point.x / norm, y: point.y / norm, z: point.z / norm};
	}
	return {x: 0, y: 0, z: 0};
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

//state.specialAnimation
const animations = {
	special: 'DE_Dance',
	run: 'DE_CombatRun',
	idle: 'DE_Combatiddle'
}
function applyAnimation(state, id, eventHandler, gameState) {
	if(!state.animations) {
		return {...state, animations: animations};
	}
	if(id in gameState.input && gameState.input[id].buttons[0] === true && !state.playingAnimation) {
		return {
			...state, playingAnimation: true, 
			animationName: state.animations.special
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
		if(totalMotion > 0.0001 && state.animationName != state.animations.run) {
			return {...state, animationName: state.animations.run};
		}
		if(totalMotion < 0.0001 && state.animationName != state.animations.idle) {
			return {...state, animationName: state.animations.idle};
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

function applyStatsEffect(stats1, stats2) {
	if('effect' in stats2 && 'health' in stats1) {
		let totalDamage = 0;
		for(let effectType in stats2.effect) {
			totalDamage += Math.max(stats2.effect[effectType] - (stats1[effectType] || 0), 0);
		}
		console.log('Inflicted', totalDamage, 'hp damage');
		return {
			...stats1, health: stats1.health - totalDamage
		};
	}
	return stats1;
}

function applyStats(state, id, eventHandler, gameState) { 
	if('hitCooldown' in state && state.hitCooldown > 0) {
		return {...state, hitCooldown: state.hitCooldown - 1};
	}

	if(id in gameState.collision) { 
		let newState = {...state};
		for(var index in gameState.collision[id].colliding) {
			if(gameState.collision[id].colliding[index].id in gameState.stats) {
				const otherStats = gameState.stats[gameState.collision[id].colliding[index].id];
				newState = applyStatsEffect(newState, otherStats);
				newState['hitCooldown'] = 100;
			}
		}
		return newState;
	}
	return state; 
}

const systems = [	
	{ name: "input", func: applyInput },
	{ name: "ai", func: applyAI },
	{ name: "particle", func: applyParticle },
	{ name: "motion", func: applyMotion },
	{ name: "physics", func: applyPhysics },
	{ name: "magic", func: applyMagic },
	{ name: "collision", func: applyCollision },
	{ name: "camera", func: applyCamera },
	{ name: "entity", func: applyEntity },
	{ name: "stats", func: applyStats },
	{ name: "animation", func: applyAnimation },
	{ name: "render", func: applyRender },
];

function resetWorld() {
	var initialState = LEVEL.level1(systems);
	var gameState = ENGINE.loadState(initialState);
	window.gameState = gameState;
	PHYSICS.resetWorld();
}

function main() {
	var initialState = LEVEL.level1(systems);
	var middleware = [
		InspectorMiddleware.middleware
	];
	var gameState = ENGINE.init(initialState, middleware);
	console.log(gameState);
	window.gameState = gameState;

	RENDERER.init(gameState);
	Ammo().then(function() {  // must initialize ammo
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
