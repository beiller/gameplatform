import * as RENDERER from './renderer.js';

const collisionLayers = {
	PLAYER:   1,
	WORLD:    2,
	OTHER:    4,
	NOTHING:  8,
	LAYER_5:  16,
	LAYER_6:  32,
	LAYER_7:  64,
	LAYER_8:  128,
	LAYER_9:  256,
	LAYER_10: 512,
};
const collisionFlags = { 
	CF_STATIC_OBJECT: 1, 
	CF_KINEMATIC_OBJECT: 2, 
	CF_NO_CONTACT_RESPONSE: 4, 
	CF_CUSTOM_MATERIAL_CALLBACK: 8, 
	CF_CHARACTER_OBJECT: 16, 
	CF_DISABLE_VISUALIZE_OBJECT: 32, 
	CF_DISABLE_SPU_COLLISION_PROCESSING: 64 
};

const stepHz = 30;
const stepDt = 1000/stepHz;
const constraintSolverIterations = 10;
const globalCollisionMap = {};
const bodyIdMap = {};
const bodies = {};

function step(m_dynamicsWorld, dispatcher) {
	const dt = stepDt;
	//var numIterations = stepHz / 30;
	const numIterations = 1;
	for(var i = 0; i < numIterations; i++) {
		m_dynamicsWorld.stepSimulation(dt/numIterations, 1, 1/stepHz/numIterations);
	}
};

function buildBodyIdMap() {
	// clean bodyIdMap object
	for(let oid in bodies) {
		if(!(oid in window.gameState.state.physics)) {
			delete bodyIdMap[bodies[oid].a];
		} else {
			bodyIdMap[bodies[oid].a] = oid;
		}
	}
}

function readCollisionData(objectId) {
	buildBodyIdMap();
	var data = [];
	var i,
	    dp = world.dispatcher,
	    num = dp.getNumManifolds(),
	    manifold, num_contacts, j, pt;

	// clean globalCollisionMap object
	for(let oid in globalCollisionMap) {
		if(!(oid in window.gameState.state.physics)) {
			delete globalCollisionMap[oid];
		} else {
			globalCollisionMap[oid] = []; // does this avoid GC?
		}
	}

	for (i = 0; i < num; i++) {
	    manifold = dp.getManifoldByIndexInternal(i);

	    num_contacts = manifold.getNumContacts();
	    if (num_contacts === 0) {
	        continue;
	    }

	    for (j = 0; j < num_contacts; j++) {
	        pt = manifold.getContactPoint(j);
	        var b1 = manifold.getBody0();
	        var b2 = manifold.getBody1();
	        let hp = pt.getPositionWorldOnB();
	        if(!(bodyIdMap[b1.a] in globalCollisionMap)) {
	        	globalCollisionMap[bodyIdMap[b1.a]] = [];
	        }
	        if(!(bodyIdMap[b2.a] in globalCollisionMap)) {
	        	globalCollisionMap[bodyIdMap[b2.a]] = [];
	        }
	        globalCollisionMap[bodyIdMap[b1.a]].push({id: bodyIdMap[b2.a], hp: [hp.x(), hp.y(), hp.z()]});
	        hp = pt.getPositionWorldOnA();
	        globalCollisionMap[bodyIdMap[b2.a]].push({id: bodyIdMap[b1.a], hp: [hp.x(), hp.y(), hp.z()]});
	    }
	}
}

function initPhysics() {
	// Bullet-interfacing code
	var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
	var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
	var overlappingPairCache = new Ammo.btDbvtBroadphase();

	var solver = new Ammo.btSequentialImpulseConstraintSolver();
	var m_dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
	
	var s = m_dynamicsWorld.getSolverInfo();
	s.set_m_splitImpulse(true);
	s.set_m_numIterations(constraintSolverIterations);

	temp_vec3_1.setValue(0, -9.82, 0);
	m_dynamicsWorld.setGravity(temp_vec3_1);
	return {
		m_dynamicsWorld, dispatcher
	};
};

function addBody(m_dynamicsWorld, body, layer, collisionLayer) {
	if(!layer) layer = collisionLayers.WORLD;
	if(!collisionLayer) collisionLayer = collisionLayers.WORLD | collisionLayers.PLAYER;
	m_dynamicsWorld.addRigidBody(body, layer, collisionLayer);
};

function setBodyFlags(body, flags) {
	var flagToSet = 0;
	flags.forEach(function(e) { flagToSet |= e; });
	body.setCollisionFlags(flagToSet);
}

function localCreateRigidBody(mass, startTransform, shape) {
	// rigidbody is dynamic if and only if mass is non zero, otherwise static
	var isDynamic = (mass != 0.0);

	var localInertia = new Ammo.btVector3(0, 0, 0);
	var myMotionState = new Ammo.btDefaultMotionState(startTransform);

	if (isDynamic) {
		shape.calculateLocalInertia(mass, localInertia);	
	} 
	var cInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, shape, localInertia);
	cInfo.friction = 5.0;
	var btBody = new Ammo.btRigidBody(cInfo);
	btBody.setActivationState(4); //disables sleep
	btBody.setFriction(1.2);
	//btBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
	//btBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
	//btBody.setContactProcessingThreshold(this.m_defaultContactProcessingThreshold);
	
	return btBody;
};
function createBody(shape, state) {	
	var bodyInfo = { ...state };
	var body = localCreateRigidBody(bodyInfo.mass, getMat3({x:bodyInfo.x,y:bodyInfo.y,z:bodyInfo.z}), shape);
	var flags = [];

	if(bodyInfo.noContact) flags.push(collisionFlags.CF_NO_CONTACT_RESPONSE);
	if(bodyInfo.staticObject) flags.push(collisionFlags.CF_STATIC_OBJECT);
	if(bodyInfo.kinematic) flags.push(collisionFlags.CF_KINEMATIC_OBJECT);
	body.setDamping(bodyInfo.damping || 0.2, bodyInfo.damping || 0.2);
	
	setBodyFlags(body, flags);
	return body;
}

function createTerrainShape(
	terrainDepth, terrainWidth, heightData, terrainWidthExtents, terrainDepthExtents
) {
    // This parameter is not really used, since we are using PHY_FLOAT height data type and hence it is ignored
    var heightScale = 1.0;
    // Up axis = 0 for X, 1 for Y, 2 for Z. Normally 1 = Y is used.
    var upAxis = 1;
    // hdt, height data type. "PHY_FLOAT" is used. Possible values are "PHY_FLOAT", "PHY_UCHAR", "PHY_SHORT"
    var hdt = "PHY_FLOAT";
    // Set this to your needs (inverts the triangles)
    var flipQuadEdges = false;
    // Creates height data buffer in Ammo heap
    var ammoHeightData = Ammo._malloc(4 * terrainWidth * terrainDepth);

    const terrainMinHeight = Math.min(...heightData); //assume heightdata is 1d array
    const terrainMaxHeight = Math.max(...heightData); //assume heightdata is 1d array

    // Copy the javascript height data array to the Ammo one.
    var p = 0;
    var p2 = 0;
    for ( var j = 0; j < terrainDepth; j++ ) {
        for ( var i = 0; i < terrainWidth; i++ ) {
            // write 32-bit float data to memory
            Ammo.HEAPF32[ ammoHeightData + p2 >> 2 ] = heightData[ p ];
            p++;
            // 4 bytes/float
            p2 += 4;
        }
    }
    
    // Creates the heightfield physics shape
    var heightFieldShape = new Ammo.btHeightfieldTerrainShape(
            terrainWidth,
            terrainDepth,
            ammoHeightData,
            heightScale,
            terrainMinHeight,
            terrainMaxHeight,
            upAxis,
            hdt,
            flipQuadEdges
    );
    
    // Set horizontal scale
	var scaleX = terrainWidthExtents / ( terrainWidth - 1 );
	var scaleZ = terrainDepthExtents / ( terrainDepth - 1 );
    heightFieldShape.setLocalScaling( new Ammo.btVector3( scaleX, 1, scaleZ ) );
    
    /*// Shifts the terrain, since bullet re-centers it on its bounding box.
    temp_trans_1.setIdentity();
    temp_vec3_1.setValue(0, ( terrainMaxHeight + terrainMinHeight ) / 2, 0);
    temp_trans_1.setOrigin( temp_vec3_1 );
    var groundMotionState = new Ammo.btDefaultMotionState( groundTransform );*/

    return heightFieldShape;
}

function createShape(shapeInfo) {
	var shape = null;
	switch(shapeInfo.type) {
		case "sphere":
			if(! 'radius' in shapeInfo) throw("Must specify radius in shape info");
			shape = new Ammo.btSphereShape(shapeInfo.radius);
			break;
		case "cone":
			if(! 'radius' in shapeInfo || ! 'height' in shapeInfo) throw("Must specify radius and height in shape info");
			shape = new Ammo.btConeShape(shapeInfo.radius, shapeInfo.height);
			break;
		case "box":
			if(! 'x' in shapeInfo) throw("Must specify x, y, z in shape info");
			temp_vec3_1.setValue(shapeInfo.x, shapeInfo.y, shapeInfo.z);
		    shape = new Ammo.btBoxShape(temp_vec3_1);
		    break;
		case "capsule":
			if(! 'height' in shapeInfo) throw("Must specify height and radius in shape info");
		    shape = new Ammo.btCapsuleShape(shapeInfo.radius, shapeInfo.height);
		    break;
		case "heightField":
			/*if(! 'x' in shapeInfo) throw("Must specify x, y, z in shape info");
			temp_vec3_1.setValue(shapeInfo.x, shapeInfo.y, shapeInfo.z);
		    shape = new Ammo.btBoxShape(temp_vec3_1);
		    shape.setMargin(shapeInfo.margin || 0.0001);
		    break;*/
			/*if(!['x', 'z', 'heightData', 'minHeight', 'maxHeight'].every(e=>e in shapeInfo)) {
				throw("Missing shapeInfo parameters. Required: x, z, ...");
			}*/
			shape = createTerrainShape(
				shapeInfo.x, shapeInfo.z, shapeInfo.heightMapData,
				shapeInfo.terrainWidthExtents, shapeInfo.terrainDepthExtents
			);
			break;
		default:
			throw("Invalid shape type", shapeInfo.type, shapeInfo);
	};
	shape.setMargin(shapeInfo.margin || 0.0001);
	return shape;
}

function getMat3(pos, rot) {
	temp_trans_1.setIdentity();
	temp_vec3_1.setValue(pos.x, pos.y, pos.z);
	temp_trans_1.setOrigin(temp_vec3_1);
	return temp_trans_1;
}

var world = null;
var temp_trans_1 = null
var temp_trans_2 = null
var temp_vec3_1 = null
var temp_vec3_2 = null
var temp_quat_1 = null
var temp_quat_2 = null

function init(gameState) {
	temp_trans_1 = new Ammo.btTransform();
	temp_trans_2 = new Ammo.btTransform();
	temp_vec3_1 = new Ammo.btVector3(0,0,0);
	temp_vec3_2 = new Ammo.btVector3(0,0,0);
	temp_quat_1 = new Ammo.btQuaternion(0,0,0,1);
	temp_quat_2 = new Ammo.btQuaternion(0,0,0,1);
	world = initPhysics();
	console.log('Iterations', world.m_dynamicsWorld.getSolverInfo().m_numIterations);
	world.m_dynamicsWorld.getSolverInfo().m_numIterations = 1;
}

function readPhysicsState(state, id) {
	const t = bodies[id].getWorldTransform();
	const p = t.getOrigin();
	const x = p.x();
	const y = p.y();
	const z = p.z();
	const q = t.getRotation();
	//			return [q.x(), q.y(), q.z(), q.w()];
	//if(x !== state.x || y !== state.y || z !== state.z) {  //detect changes
	return { ...state, x: x, y: y, z: z, rotation: {x: q.x(), y: q.y(), z: q.z(), w: q.w()} }
	//}
}

function applyMotionPhysics(state, id, eventHandler, gameState) {
	temp_vec3_1.setValue(
		gameState.motion[id].fx*stepDt, 
		gameState.motion[id].fy*stepDt, 
		gameState.motion[id].fz*stepDt
	);
	bodies[id].applyImpulse(temp_vec3_1);
}

function resetWorld() {
	for(var bodyId in bodies) {
		world.m_dynamicsWorld.removeRigidBody(bodies[bodyId]);
		bodies[bodyId] = undefined;
	}
}

function applyPhysics(state, id, eventHandler, gameState) {
	if(!world) return state;

	var character = gameState.physics['character1']; //hack
	temp_vec3_1.setValue(character.x - state.x, character.y - state.y, character.z - state.z);
	const len = Math.abs(temp_vec3_1.length());
	if(state.staticObject && id !== 'character1' && len > 15.0) {
		//console.log("Far away");
		if(!state.neverSleep && id in bodies) {
			world.m_dynamicsWorld.removeRigidBody(bodies[id]);
			delete bodies[id];
		}
		return state;
	}

	if(!(id in bodies) || !bodies[id]) {
		var shapeInfo = { ...state.shape };
		const getShapeFromLoadedGeometry = gameState.render[id].type === 'animatedMesh' || gameState.render[id].type === 'heightField'
		if(id in gameState.render && getShapeFromLoadedGeometry) { // 
			if(!('loading' in gameState.render[id]) || gameState.render[id].loading === true) {
				return state;
			}
			if(shapeInfo.type == 'box' && gameState.render[id].boundsY) {
				shapeInfo = {
					...shapeInfo,
					x: state.shape.x || gameState.render[id].boundsX, 
					y: state.shape.y || gameState.render[id].boundsY, 
					z: state.shape.z || gameState.render[id].boundsZ, 
				}
			} 
			if(shapeInfo.type == 'capsule' && gameState.render[id].boundsY) {
				var r = (gameState.render[id].boundsX + gameState.render[id].boundsZ) / 2.0
				shapeInfo = {
					...shapeInfo,
					height: (2*gameState.render[id].boundsY) - (2*r), 
					radius: r
				}
			} 
			/*if(shapeInfo.type == 'heightField' && gameState.render[id].heightData) {
				//var r = (gameState.render[id].boundsX + gameState.render[id].boundsZ) / 2.0
				shapeInfo = {
					...shapeInfo,
					heightData: gameState.render[id].heightData,
				}
			} */
			if(shapeInfo.type == 'sphere' && gameState.render[id].boundsY) {
				var r = Math.max(
					gameState.render[id].boundsX, gameState.render[id].boundsY, gameState.render[id].boundsZ
				);
				shapeInfo = {
					...shapeInfo,
					radius: r
				}
			} 
			//create bodies
			var shape = createShape(shapeInfo);
			bodies[id] = createBody(shape, state);
			addBody(world.m_dynamicsWorld, bodies[id]);
			//"rest" the object necessary?
			if('lockRotation' in state && state.lockRotation === true) {
				temp_vec3_1.setValue(0, 1, 0);
				bodies[id].setAngularFactor(temp_vec3_1);
			}
			if(shapeInfo.type == "heightField") {
				const terrainMinHeight = Math.min(...shapeInfo.heightMapData); //assume heightdata is 1d array
    			const terrainMaxHeight = Math.max(...shapeInfo.heightMapData); //assume heightdata is 1d array
				let t = bodies[id].getWorldTransform();
				temp_vec3_1.setValue(0, (( terrainMaxHeight + terrainMinHeight ) / 2) - (shapeInfo.margin || 0), 0);
				t.setOrigin(temp_vec3_1);
				bodies[id].getMotionState().setWorldTransform(t);
			}
			return {
				...state, shape: shapeInfo
			};
		} else {
			//create bodies
			var shape = createShape(shapeInfo);
			bodies[id] = createBody(shape, state);
			addBody(world.m_dynamicsWorld, bodies[id]);
			//set the rotation if specified
			if('rotation' in state) {
				let t = bodies[id].getWorldTransform();
				temp_quat_1.setValue(state.rotation.x, state.rotation.y, state.rotation.z, state.rotation.w);
				t.setRotation(temp_quat_1);
				bodies[id].getMotionState().setWorldTransform(t);
			}

			//"rest" the object necessary?
			if('lockRotation' in state && state.lockRotation === true) {
				temp_vec3_1.setValue(0, 1, 0);
				bodies[id].setAngularFactor(temp_vec3_1);
			}
			return state;
		}
	}

	if(id in gameState.motion) {
		applyMotionPhysics(state, id, eventHandler, gameState);
	}
	state = readPhysicsState(state, id);

	return state;
}

function applyCollision(state, id, eventHandler, gameState) {
	return { ...state, colliding: id in globalCollisionMap? globalCollisionMap[id] : [] };
}

function stepWorld() {
	step(world.m_dynamicsWorld, world.dispatcher);
	/*
		Clean up aka garbage collect unused game objects from physics simulation
	*/
	for(var objectId in bodies) {
		if(!(objectId in window.gameState.state.physics)) {
			world.m_dynamicsWorld.removeRigidBody(bodies[objectId]);
			delete bodies[objectId];
		}
	}
	readCollisionData();
}


export { init, applyPhysics, resetWorld, applyCollision, stepWorld }
