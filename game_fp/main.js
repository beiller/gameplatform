import * as RENDERER from './renderer/renderer.js';
import * as ENGINE from './engine.js';
import * as INPUT from './input.js';
import * as PHYSICS from './physics.js';
import * as LEVEL from './level.js';
import * as THREE from './lib/three.module.js';
import * as AI from './modules/ai.js';

import './lib/RectAreaLightUniformsLib.js';

import * as InspectorMiddleware from './InspectorMiddleware.js';

//welcome!

//
function loadRenderableEntity() {
	return {
		"animation": { animationName: 'idle', playingAnimation: true,
			animations: {
				special: 'mbate',
				run: 'walk',
				idle: 'idle',
				dead: 'dead',
				attack: 'attack'
			}
		},
		"render": { type: "animatedMesh", filename: "jessica.glb" },
		"entity": {x: 0, y: 0, z: 0 },
		"collision": { type: "ouchie" },
		"magic": null,
		"input": { "controllerId": "0" },
		"motion": {fx: 0, fy: 0, fz: 0},
		"physics": {x: 0, y: 2.8, z: 0, 
			//shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
			shape: {type: "capsule", radius: 0.3, margin: 0.001},
			mass: 45.35, damping: 0.9, lockRotation: true
		},
		"stats": {health: 100, maxHealth: 100}
	}
}
//

function getShapeFunction(shape) {
	return function(radius, xPos, yPos, zPos, fx, fy, fz, fDamping, mass, noContact, maxAge, damping, stats) {
		return {
			"entity": {x: xPos, y: yPos, z: zPos},
			"render": { 
				type: shape, radius: radius, height: 1.0
			},
			"motion": {fx: fx, fy: fy, fz: fz},
			"physics": {x: xPos, y: yPos, z: zPos, 
				shape: {type: shape, radius: radius, height: 1.0 },
				mass: mass, damping: damping, noContact: noContact
			},
			"stats": stats ? stats : defaultStats,
			"particle": {maxAge: maxAge, damping: fDamping }
		};
	};
}

const getSpell = getShapeFunction("sphere");

// TODO remove THREE dependency
let q1 = new THREE.Quaternion();
let q2 = new THREE.Quaternion();

function getAttackVolume(id, radius, xPos, yPos, zPos, fx, fy, fz, stats) {
	q2.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), Math.PI / 2 );
	q1.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.atan2(-fx, -fz) );
	q1.multiply(q2);
	const height = 1.5;
	const nVec = normalizeXY({x: fx, y: fz});
	const cRadius = 0 // hard coded temp radius for character
	xPos += nVec.x * (cRadius + (height / 2)); 
	zPos += nVec.y * (cRadius + (height / 2)); 
	return {
		"entity": {x: xPos, y: yPos, z: zPos, rotation: {x: q1.x, y: q1.y, z: q1.z, w: q1.w}},
		/*"render": { 
			type: "box", x: radius, y: radius, z: radius
		},*/
		"motion": {fx: 0, fy: 0, fz: 0},
		"physics": {x: xPos, y: yPos, z: zPos, 
			rotation: {x: q1.x, y: q1.y, z: q1.z, w: q1.w},
			shape: {type: "box", x: radius, y: radius, z: radius },
			mass: 0.1, damping: 0.9999, noContact: true, margin: 0.5
		},
		"stats": stats,
		"particle": {maxAge: 3, damping: 0.5 }
	};
}

function getProjectileSpell(radius, xPos, yPos, zPos, fx, fy, fz, stats) {
	const fDamping = 0.8;
	const mass = 0.05;
	const noContact = false;
	const maxAge = 30;
	const damping = 0.09;
	return getSpell(radius, xPos, yPos, zPos, fx, fy, fz, fDamping, mass, noContact, maxAge, damping, stats);
}

function getProjectileCollidingSpell(radius, xPos, yPos, zPos, fx, fy, fz, stats) {
	const fDamping = 0.9;
	const mass = 10.0;
	const noContact = false;
	const maxAge = 40;
	const damping = 0.5;
	return getSpell(radius, xPos, yPos, zPos, fx, fy, fz, fDamping, mass, noContact, maxAge, damping, stats);
}

const defaultStats = { 
	effect: {
		fire: 5
	}
};
function getSwordAttack(id, x, y, z, facingX, facingZ) {
	const stats = {effect: {physical: 3}, origin: id};
	return getAttackVolume(id, 1.0, x, y, z, facingX, 0, facingZ, stats);
}
function getFireSpell(id, x, y, z, facingX, facingZ) {
	const stats = {effect: {fire: 2}, origin: id};
	const fireballForce = 0.01;
	const nVec = normalizeXY({x: facingX, y: facingZ});
	const fx = nVec.x * fireballForce;
	const fz = nVec.y * fireballForce;
	const fy = 0.001;
	const rAmt = 0.001 * fireballForce; //random direction scale
	const r1 = 0;//(Math.random() * rAmt) - (rAmt*0.5);
	const r2 = 0;//(Math.random() * rAmt) - (rAmt*0.5);
	const radius = 0.5;
	//offset xyz by radius + character radius
	const cRadius = 0.8 // hard coded temp radius for character
	x += nVec.x * (radius+cRadius); 
	z += nVec.y * (radius+cRadius); 
	return getProjectileSpell(radius, x, y, z, fx+r1, fy, fz+r2, stats);
}
function getMeteorSpell(id, x, y, z, facingX, facingZ) {
	const stats = {effect: {fire: 25}, origin: id};
	
	const fireballForce = 0.0025;
	const rAmt = 0.3333 * fireballForce; //random direction scale
	const r1 = (Math.random() * rAmt) - (rAmt*0.5);
	const r2 = (Math.random() * rAmt) - (rAmt*0.5);
	const meteorFieldRadius = 1.0 // nxn meters
	const meteorRandomHeight = 1.0 // nxn meters
	const r3 = (Math.random() * meteorFieldRadius) - (meteorFieldRadius*0.5);
	const r4 = (Math.random() * meteorFieldRadius) - (meteorFieldRadius*0.5);
	const r5 = Math.random() * meteorRandomHeight
	const radius = 0.5;
	const nVec = normalizeXY({x: facingX, y: facingZ});
	const cRadius = 0.8 // hard coded temp radius for character
	x += nVec.x * (radius+cRadius); 
	z += nVec.y * (radius+cRadius); 
	
	const fx = 0.5 * (fireballForce * nVec.x);
	const fy = -1;
	const fz = 0.5 * (fireballForce * nVec.y);
	return getProjectileCollidingSpell(radius, x+r3, y+10+r5, z+r4, fx+r1, fy, fz+r2, stats);
}

function createEntity(entity) {
	const temp_id = 'baddy'+(Math.random() * 100);
	ENGINE.queueCommand(function(gameState) {
		ENGINE.createEntity(gameState, temp_id, entity);
	});
}
function queueEntity(createStateFunction, id, physicsState, motionState) {
	const fstate = createStateFunction(
		id, physicsState.x, physicsState.y, physicsState.z, motionState.facingX, motionState.facingZ
	);
	createEntity(fstate);
}
const spellMap = {
	"fireball": getFireSpell,
	"meteorstorm": getMeteorSpell,
	"attack": getSwordAttack
}
function applyMagic(state, id, eventHandler, gameState) {
	if(!state) {
		return {
			spells: ["fireball", "meteorstorm", "attack"],
			cooldowns: [100, 100, 100]
		}
	}
	if(id in gameState.input) {
		const physicsState = gameState.physics[id];
		const motionState = gameState.motion[id];
		const inputState = gameState.input[id];
		
		//todo calculate proper xyz emission position
		if(inputState.buttons[4] || inputState.buttons[5] || inputState.buttons[6]) {
			//const spellIndex = inputState.buttons[5] ? 1 : 0;
			const spellIndex = [inputState.buttons[4], inputState.buttons[5], inputState.buttons[6]].findIndex(x=>x===true);
			if(state.cooldowns[spellIndex] <= 0) {
				queueEntity(spellMap[state.spells[spellIndex]], id, physicsState, motionState);
				const newCooldown = [...state.cooldowns]
				newCooldown[spellIndex] = 25;
				return { ...state, cooldowns: newCooldown };
			}
		}
	}
	return {...state, cooldowns: state.cooldowns.map(x => Math.max(0, x-1))}
}
function applyInput(state, id, eventHandler, gameState) {
	if('ai' in gameState && id in gameState.ai) {
		return {...state, ...gameState.ai[id]};	
	} else {
		return {...state, ...INPUT.getControllerState(state.controllerId)};	
	}
}

//const movementSpeed = 0.58;
const movementSpeed = 0.5;
function applyMotion(state, id, eventHandler, gameState) {
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
	if('input' in gameState && id in gameState.input && 'x' in gameState.input[id] && 'y' in gameState.input[id]) {
		var normalized = normalizeXY(gameState.input[id]);
		if(state.fx !== normalized.x || state.fz !== normalized.y) {
			const fx = (normalized.x * movementSpeed);
			const fz = (-normalized.y * movementSpeed);
			const useFacing = Math.abs(fx) + Math.abs(fz) > 0;
			const facingX = useFacing ? fx : state.facingX;
			const facingZ = useFacing ? fz : state.facingZ;
			return {
				...state,
				fx: fx,
				fy: 0, //apply small upward force while walking
				fz: fz,
				facingX: facingX,
				facingY: 0,
				facingZ: facingZ
			}
		}
	}
	return state;
}

function normalizeXY(point) {
	var norm = Math.sqrt(point.x * point.x + point.y * point.y);
	if (norm != 0) { // as3 return 0,0 for a point of zero length
		return {x: point.x / norm, y: point.y / norm};
	}
	return {x: 0, y: 0};
}
function normalizeXYZ(point) {
	var norm = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
	if (norm != 0) { // as3 return 0,0 for a point of zero length
		return {x: point.x / norm, y: point.y / norm, z: point.z / norm};
	}
	return {x: 0, y: 0, z: 0};
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

function applyEntity(state, id, eventHandler, gameState) {
	if('physics' in gameState && id in gameState.physics) {
		// Move the entity according to physics simulation
		if(gameState.physics[id].x != state.x || gameState.physics[id].y != state.y || gameState.physics[id].z != state.z) {
			if(id in gameState.input) {
				//fake rotation by pointing the character if its controlled by AI or KB
				return {
					...pointCharacter(state, id, gameState), 
					x: gameState.physics[id].x,
					y: gameState.physics[id].y,
					z: gameState.physics[id].z
				}
			} else {
				//use physics sim rotation
				return {
					rotation: {...gameState.physics[id].rotation},
					x: gameState.physics[id].x,
					y: gameState.physics[id].y,
					z: gameState.physics[id].z
				}
			}
		}
	}
	if(id in gameState.camera && gameState.camera[id].type == 'follow') {
		// Move the camera track a character
		if(!('physics' in gameState) || !(gameState.camera[id].entityName in gameState.physics)) {
			return state;
		}
		const physicsState = gameState.physics[gameState.camera[id].entityName];
		const offsetY = gameState.camera[id].offsetY || 0.2;
		const offsetZ = gameState.camera[id].offsetZ || 0.8;

		return {
			...state,
			x: physicsState.x, 
			y: physicsState.shape.height + physicsState.y + offsetY, 
			z: physicsState.z + offsetZ
		};
	}
	return state;
}

//state.specialAnimation
const animations = {
	special: 'DE_Dance',
	run: 'DE_CombatRun',
	idle: 'DE_Shy',
	dead: 'DE_Working',
	attack: 'DE_Dance'
}
function applyAnimation(state, id, eventHandler, gameState) {
	if(!state.animations) {
		return {...state, animations: animations};
	}
	if(gameState.stats && id in gameState.stats && 'health' in gameState.stats[id] && gameState.stats[id].health <= 0 ) {
		// alas you have died
		return {
			...state, playingAnimation: true, 
			animationName: state.animations.dead, animationLoop: false
		};
	}
	if(gameState.input && id in gameState.input && gameState.input[id].buttons[0] === true && !state.playingAnimation) {
		// play special animation on button
		return {
			...state, playingAnimation: true, 
			animationName: state.animations.special, animationLoop: true
		};
	}

	//end playing an animation if we use movement keys
	if('playingAnimation' in state && state.playingAnimation === true) {
		if('motion' in gameState) {
			if(id in gameState.motion && (Math.abs(gameState.motion[id].fx)+Math.abs(gameState.motion[id].fz)) > 0.0001) {
				return {...state, playingAnimation: false};	
			}
		}
		return state;
	}
	// attacking
	if(gameState.magic && id in gameState.magic && gameState.magic[id].cooldowns[2] > 0.0) {
		if(state.animationName != state.animations.attack) {
			state = {...state, animationName: state.animations.attack, animationLoop: false}
		}
		return state;
	} 
	//walking
	if('motion' in gameState && id in gameState.motion) {
		var totalMotion = Math.abs(gameState.motion[id].fx) + Math.abs(gameState.motion[id].fz);
		if(totalMotion > 0.0001 && state.animationName != state.animations.run) {
			return {...state, animationName: state.animations.run, animationLoop: true};
		}
		if(totalMotion < 0.0001 && state.animationName != state.animations.idle) {
			return {...state, animationName: state.animations.idle, animationLoop: true};
		}
	}
	
	return state;
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

/*
	Read intersections from physics library
*/
function applyCollision(state, id, eventHandler, gameState) {
	return PHYSICS.applyCollision(state, id, eventHandler, gameState);
}

/*
	
*/
function applyStatsEffect(stats1, stats2, id, otherId, gameState) {
	if('effect' in stats2 && 'health' in stats1 && id != otherId) {
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

/*
 	Shoots out a damage text given text from position of gameState.physics[id]
*/
function createDamageText(state, id, eventHandler, gameState, text) {
	const rScale = 0.04;
	const x = gameState.physics[id].x;
	const y = gameState.physics[id].y;
	const z = gameState.physics[id].z;
	const fx = (((Math.random() - 0.5)*2.0)*rScale);
	const fz = (((Math.random() - 0.5)*2.0)*rScale);
	createEntity({
		"entity": {x: x, y: y, z: z },
		"render": { type: "3dText", string: ""+text, size: 1.0, height: 0.5, colorIntHex: 0xFFAAAA },
		"physics": {x: x, y: y, z: z, shape: { type: "sphere", radius: 0.5 }, mass: 0.25 },
		"particle": {maxAge: 70, damping: 0.5 },
		"motion": {fx: fx, fy: 0.1, fz: fz}
	});
}

/*

*/
function applyStats(state, id, eventHandler, gameState) { 
	if('hitCooldown' in state && state.hitCooldown > 0) {
		return {...state, hitCooldown: state.hitCooldown - 1};
	}

	if(id in gameState.collision) { 
		let newState = {...state};
		for(var index in gameState.collision[id].colliding) {
			if(gameState.collision[id].colliding[index].id in gameState.stats) {
				const otherId = gameState.collision[id].colliding[index].id;
				const otherStats = gameState.stats[otherId];
				if (otherStats.origin === id) {
					return state;
				}
				const beforeApplyStats = newState;

				newState = applyStatsEffect(newState, otherStats, id, otherId, gameState);
				if(beforeApplyStats != newState) {
					if(newState.health <= 0 && id in gameState.ai) {
						delete gameState.ai[id];
						delete gameState.motion[id];
						delete gameState.input[id];
						return state;
					}
					const totalDamage = beforeApplyStats.health - newState.health;
					createDamageText(state, id, eventHandler, gameState, totalDamage);

				}
				newState['hitCooldown'] = 5;  // invincibility frames
			}
		}
		return newState;
	}
	return state; 
}

function copyToPhysics(body, positionArray, rotationArray) {
	var t = body.getWorldTransform();
	t.getRotation().setValue(rotationArray[0], rotationArray[1], rotationArray[2], rotationArray[3]);
	t.getOrigin().setValue(positionArray[0], positionArray[1], positionArray[2]);
}
function applyConstraints(state, id, eventHandler, gameState) {
	/*switch(state.type) {
		case 'copytransforms':
		default:
			const skeleton = RENDERER.loadedObjects['character1'].children[1].skeleton;
			const bone = skeleton.getBoneByName('Armature_arm_wristL');
			const body = PHYSICS.bodies[id];
			const vec3 = bone.position.clone();
			const qua4 = bone.quaternion.clone();
			bone.getWorldPosition(vec3);
			bone.getWorldQuaternion(qua4);
			copyToPhysics(body, vec3.toArray(), qua4.toArray());
			break;
	}*/
	state = PHYSICS.applyConstraints(state, id, eventHandler, gameState);
	state = RENDERER.applyConstraints(state, id, eventHandler, gameState);
	return state;
}

const systems = [	
	{ name: "input", func: applyInput },
	{ name: "ai", func: AI.applyAI },
	{ name: "particle", func: applyParticle },
	{ name: "motion", func: applyMotion },
	{ name: "animation", func: applyAnimation },
	{ name: "physics", func: PHYSICS.applyPhysics },
	{ name: "constraint", func: applyConstraints },
	{ name: "magic", func: applyMagic },
	{ name: "collision", func: applyCollision },
	{ name: "camera", func: RENDERER.updateCamera },
	{ name: "entity", func: applyEntity },
	{ name: "stats", func: applyStats },
	{ name: "particles", func: RENDERER.applyParticles },
	{ name: "render", func: RENDERER.renderObject }
];

const middleware = [
	InspectorMiddleware.middleware
];

function loadWorld(worldFunction) {
	ENGINE.init({...worldFunction, systems: systems}, middleware);
	PHYSICS.resetWorld();
}

function main() {
	ENGINE.init({...LEVEL.mainLevel(), systems: systems}, middleware);
	console.log(ENGINE.getState());
	RENDERER.init();
	Ammo().then(function() {  // must initialize ammo
		PHYSICS.init();
	});
	//start game loop
	var fps = 60;
	//var now = Date.now();
	//var then = Date.now();
	var lastFrame = Date.now();
	var interval = 1000/fps;
	var delta;
	function mainLoop() {
		requestAnimationFrame(mainLoop);
	    //delta = Date.now() - lastFrame; 
	    //if (delta > interval) {
		//then = now - (delta % interval);
		const gameState = ENGINE.getState();
		setTimeout(function() { // delay this call?
			ENGINE.tick();
			PHYSICS.stepWorld(gameState);
		}, 0);
		RENDERER.renderFunction(gameState);
		//lastFrame = Date.now();
		//}
	}
	requestAnimationFrame(mainLoop);
}

main();

console.log('hello world');
