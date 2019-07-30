
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

const stepHz = 60;
//const constraintSolverIterations = null;  // use null for default
const constraintSolverIterations = 150;  // use null for default
const useSplitImpulse = null;
const globalCollisionMap = {};
const bodyIdMap = {};
const bodies = {};

const BT_CONSTRAINT_ERP = 1;
const BT_CONSTRAINT_STOP_ERP = 2;
const BT_CONSTRAINT_CFM = 3;
const BT_CONSTRAINT_STOP_CFM = 4;

function step(m_dynamicsWorld, dispatcher) {	
	m_dynamicsWorld.stepSimulation(1/stepHz);
	//m_dynamicsWorld.stepSimulation(1/stepHz, 10, 1./240);
};

function buildBodyIdMap(gameState) {
	// clean bodyIdMap object
	for(let oid in bodies) {
		if(!(oid in gameState.state.physics)) {
			delete bodyIdMap[bodies[oid].a];
		} else {
			bodyIdMap[bodies[oid].a] = oid;
		}
	}
}

function readCollisionData(gameState) {
	buildBodyIdMap(gameState);
	var data = [];
	var i,
	    dp = world.dispatcher,
	    num = dp.getNumManifolds(),
	    manifold, num_contacts, j, pt;

	// clean globalCollisionMap object
	for(let oid in globalCollisionMap) {
		if(!(oid in gameState.state.physics)) {
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
	const useSweep = false;
	if(useSweep) {
		temp_vec3_1.setValue(-10000,-10000,-10000);
		temp_vec3_2.setValue(10000,10000,10000);
		var overlappingPairCache = new Ammo.btAxisSweep3 (temp_vec3_1, temp_vec3_2);
	} else {
		var overlappingPairCache = new Ammo.btDbvtBroadphase();
	}

	var solver = new Ammo.btSequentialImpulseConstraintSolver();
	var m_dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
	
	var s = m_dynamicsWorld.getSolverInfo();
	if(useSplitImpulse)
		s.set_m_splitImpulse(useSplitImpulse);
	if(constraintSolverIterations)
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
	//cInfo.friction = 0.9;
	var btBody = new Ammo.btRigidBody(cInfo);
	//btBody.setActivationState(4); //disables sleep
	//btBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
	//btBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
	//btBody.setContactProcessingThreshold(this.m_defaultContactProcessingThreshold);
	
	return btBody;
};
function createBody(shape, state) {	
	var bodyInfo = { ...state };
	if(bodyInfo.staticObject) { bodyInfo.mass = 0;}
	let rotation = null;
	if('rotation' in bodyInfo) {
		rotation = {x:bodyInfo.rotation.x||0,y:bodyInfo.rotation.y||0,z:bodyInfo.rotation.z||0,w:bodyInfo.rotation.w||1};
	}
	var body = localCreateRigidBody(bodyInfo.mass, getMat3(
		{x:bodyInfo.x,y:bodyInfo.y,z:bodyInfo.z}, rotation
	), shape);
	var flags = [];
	body.setFriction(state.friction || 0.9);

	if(bodyInfo.noContact) flags.push(collisionFlags.CF_NO_CONTACT_RESPONSE);
	if(bodyInfo.staticObject) flags.push(collisionFlags.CF_STATIC_OBJECT);
	if(bodyInfo.kinematic) flags.push(collisionFlags.CF_KINEMATIC_OBJECT);
	body.setDamping(bodyInfo.damping || 0.2, bodyInfo.damping || 0.2);
	
	setBodyFlags(body, flags);
	return body;
}
function createConstraint(type, bodyA, bodyB, localA, localB, options) {
	/*
		bodyA: parent body
		bodyB: child body
		localA: local coordinates of connection in A
		lobalB: local coordinates of connection in B
	*/
	switch(type) {
		case "BALL":
			return createConstraintBall(bodyA, bodyB, localA, localB, options);
			break;
		case "6DOF":
			return createConstraint6DOF(bodyA, bodyB, localA, localB, options);
			break;
		case "CONE":
			return createConstraintCone(bodyA, bodyB, localA, localB, options);
			break;
		default:
			throw("Invalid constraint type: " + type);
	}
};
function createConstraintBall(bodyA, bodyB, localA, localB, options) {
	temp_vec3_1.setValue(localA[0], localA[1], localA[2]);
	temp_vec3_2.setValue(localB[0], localB[1], localB[2]);
	var constraint = new Ammo.btPoint2PointConstraint(
		bodyA, 
		bodyB, 
		temp_vec3_1, 
		temp_vec3_2
	);
	let disableConnectedCollisions = false;
	if('disableCollision' in options && options['disableCollision'] === true) {
		disableConnectedCollisions = options['disableCollision'];
	}
	world.m_dynamicsWorld.addConstraint(constraint, disableConnectedCollisions);
	return constraint;
};

function createConstraint6DOF(bodyA, bodyB, localA, localB, options) {
	if(!options) { options = {} };
	if(!options.quaternionA) { options.quaternionA = [0,0,0,1] };
	if(!options.quaternionB) { options.quaternionB = [0,0,0,1] };

	temp_vec3_1.setValue(localA[0], localA[1], localA[2]);
	temp_quat_1.setValue(options.quaternionA[0], options.quaternionA[1], options.quaternionA[2], options.quaternionA[3]);
	temp_trans_1.setIdentity();
	temp_trans_1.setRotation(temp_quat_1);
	temp_trans_1.setOrigin(temp_vec3_1);

	if(localB) {
		temp_vec3_2.setValue(localB[0], localB[1], localB[2]);
		temp_quat_2.setValue(options.quaternionB[0], options.quaternionB[1], options.quaternionB[2], options.quaternionB[3]);
		temp_trans_2.setIdentity();
		temp_trans_2.setRotation(temp_quat_2);
		temp_trans_2.setOrigin(temp_vec3_2);
	}
	const useLinearReferenceFrameB = false;
	if(bodyB) {
		var constraint = new Ammo.btGeneric6DofSpringConstraint(bodyA, bodyB, temp_trans_1, temp_trans_2, useLinearReferenceFrameB);
	} else {
		var constraint = new Ammo.btGeneric6DofSpringConstraint(bodyA, temp_trans_1, useLinearReferenceFrameB);
	}

	var angleLow = options.rotationLimitsLow ? options.rotationLimitsLow : [-Math.PI, -Math.PI/2, -Math.PI];
	var angleHigh = options.rotationLimitsHigh ? options.rotationLimitsHigh : [Math.PI, Math.PI/2, Math.PI];
	temp_vec3_1.setValue(angleLow[0], angleLow[1], angleLow[2]);
	temp_vec3_2.setValue(angleHigh[0], angleHigh[1], angleHigh[2]);
	constraint.setAngularLowerLimit(temp_vec3_1);
	constraint.setAngularUpperLimit(temp_vec3_2);

	if(options.spring) {
		for(let i = 0; i < 7; i++) {
			constraint.enableSpring(i, true);
			constraint.setStiffness(i, options.stiffness || 25.0);
			constraint.setDamping(i, options.damping || 15);
		}
		const dist = options.distance || 0.1;
		temp_vec3_1.setValue(-dist, -dist, -dist);
		constraint.setLinearLowerLimit(temp_vec3_1);
		temp_vec3_2.setValue(dist, dist, dist);
		constraint.setLinearLowerLimit(temp_vec3_2);
		if('equilibriumPoint' in options) {
			constraint.setEquilibriumPoint();
			constraint.setEquilibriumPoint(0, options.equilibriumPoint[0]);
			constraint.setEquilibriumPoint(1, options.equilibriumPoint[1]);
			constraint.setEquilibriumPoint(2, options.equilibriumPoint[2]);
		}
	} else {
		temp_vec3_1.setValue(0,0,0);
		constraint.setLinearLowerLimit(temp_vec3_1);
		constraint.setLinearUpperLimit(temp_vec3_1);	
	}
	let disableConnectedCollisions = false;
	if('disableCollision' in options && options['disableCollision'] === true) {
		disableConnectedCollisions = options['disableCollision'];
	}
	world.m_dynamicsWorld.addConstraint(constraint, disableConnectedCollisions);
	for(let i = 0; i < 6; i++) {
		constraint.setParam( BT_CONSTRAINT_STOP_CFM, 0.1, i );
		constraint.setParam( BT_CONSTRAINT_STOP_ERP, 0.9, i );
	}
	return constraint;
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
			if(!('radius' in shapeInfo)) throw("Must specify radius in shape info");
			shape = new Ammo.btSphereShape(shapeInfo.radius);
			break;
		case "cone":
			if(!('radius' in shapeInfo) || !('height' in shapeInfo)) throw("Must specify radius and height in shape info");
			shape = new Ammo.btConeShape(shapeInfo.radius, shapeInfo.height);
			break;
		case "box":
			if(!('x' in shapeInfo) || !('y' in shapeInfo) || !('z' in shapeInfo)) throw("Must specify x, y, z in shape info");
			temp_vec3_1.setValue(shapeInfo.x, shapeInfo.y, shapeInfo.z);
		    shape = new Ammo.btBoxShape(temp_vec3_1);
		    break;
		case "capsule":
			if(!('height' in shapeInfo) || !('radius' in shapeInfo)) throw("Must specify height and radius in shape info");
			if(shapeInfo.height < shapeInfo.radius) throw("Height must be greater than or equal to radius")
			shape = new Ammo.btCapsuleShape(shapeInfo.radius, shapeInfo.height - ( shapeInfo.radius * 2 ) );
			break;
		case "concave":
			if(!('triangles' in shapeInfo) || !shapeInfo.triangles) throw("Must specify triangles in shape info");
			let i, triangle = null;
			const triangle_mesh = new Ammo.btTriangleMesh();
			for ( i = 0; i < shapeInfo.triangles.length; i++ ) {
				triangle = shapeInfo.triangles[i];
				temp_vec3_1.setValue(triangle[0].x, triangle[0].y, triangle[0].z);
				temp_vec3_2.setValue(triangle[1].x, triangle[1].y, triangle[1].z);
				temp_vec3_3.setValue(triangle[2].x, triangle[2].y, triangle[2].z);
				triangle_mesh.addTriangle(temp_vec3_1, temp_vec3_2, temp_vec3_3, true);
			}
			shape = new Ammo.btBvhTriangleMeshShape(triangle_mesh, true, true);
			break;
		case "convex":
			if(!('points' in shapeInfo)) throw("Must specify triangles in shape info");
			//console.log('Building convex hull');
			shape = new Ammo.btConvexHullShape();
			for ( let i = 0; i < shapeInfo.points.length; i++ ) {
				const point = shapeInfo.points[i];
				temp_vec3_1.setValue(point.x, point.y, point.z);
				shape.addPoint(temp_vec3_1);
			}
			//console.log('Done');
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
	if(rot){ 
		temp_quat_1.setValue(rot.x, rot.y, rot.z, rot.w);
		temp_trans_1.setRotation(temp_quat_1);
	}
	return temp_trans_1;
}

var world = null;
var temp_trans_1 = null;
var temp_trans_2 = null;
var temp_vec3_1 = null;
var temp_vec3_2 = null;
var temp_vec3_3 = null;
var temp_quat_1 = null;
var temp_quat_2 = null;

function init() {
	temp_trans_1 = new Ammo.btTransform();
	temp_trans_2 = new Ammo.btTransform();
	temp_vec3_1 = new Ammo.btVector3(0,0,0);
	temp_vec3_2 = new Ammo.btVector3(0,0,0);
	temp_vec3_3 = new Ammo.btVector3(0,0,0);
	temp_quat_1 = new Ammo.btQuaternion(0,0,0,1);
	temp_quat_2 = new Ammo.btQuaternion(0,0,0,1);
	world = initPhysics();
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
	const motion = gameState.motion[id];
	if(Math.abs(motion.fx)+Math.abs(motion.fz) > 0) {
		bodies[id].setFriction(0.45);
		temp_vec3_1.setValue(
			gameState.motion[id].fx*stepDt, 
			gameState.motion[id].fy*stepDt, 
			gameState.motion[id].fz*stepDt
		);
		bodies[id].applyImpulse(temp_vec3_1);

		//face us towards that inpulse
		/*var rotation = Math.atan2(motion.fx, motion.fz);
		temp_vec3_1.setValue(0, rotation*stepDt*0.1, 0);
		bodies[id].applyTorqueImpulse(temp_vec3_1);*/
	} else {
		bodies[id].setFriction(1.5);
	}
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
	if(character) { // remove from sim things that are far away from player
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
	}

	if(!(id in bodies) || !bodies[id]) {
		var shapeInfo = { ...state.shape };
		if(id in gameState.render && (gameState.render[id].type === 'animatedMesh' || gameState.render[id].type === 'heightField')) { 
			if(!('loading' in gameState.render[id]) || gameState.render[id].loading === true) {
				return state;
			}
			if(!('x' in state) && gameState.render[id].xpos) {
				return {...state, 
					x: gameState.render[id].xpos,
					y: gameState.render[id].ypos,
					z: gameState.render[id].zpos,
				};
			}
			if(!('rotation' in state) && gameState.render[id].xquat) {
				return {...state, rotation: {
						x: gameState.render[id].xquat,
						y: gameState.render[id].yquat,
						z: gameState.render[id].zquat,
						w: gameState.render[id].wquat
					}
				};
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
			if(shapeInfo.type == 'concave' && ('mass' in state && state.mass > 0)) {
				throw("Cannot create a concave mesh with mass. Concave mesh (triangle mesh) must be static");
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
			if(shapeInfo.type == 'concave' && ('mass' in state && state.mass > 0)) {
				throw("Cannot create a concave mesh with mass. Concave mesh (triangle mesh) must be static");
			}
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

	if(gameState.motion && id in gameState.motion) {
		applyMotionPhysics(state, id, eventHandler, gameState);
	}
	state = readPhysicsState(state, id);

	return state;
}

function applyCollision(state, id, eventHandler, gameState) {
	return { ...state, colliding: id in globalCollisionMap? globalCollisionMap[id] : [] };
}

const constraints = {};
function applyConstraints(state, id, eventHandler, gameState) {
	if(!(id in constraints) && state.bodyA in bodies) {
		constraints[id] = createConstraint(
			state.type, bodies[state.bodyA], bodies[state.bodyB], state.localA, state.localB, state.options
		);
		console.log("Constraint created");
		console.log(constraints[id]);
	}
	return state;
}

function stepWorld(gameState) {
	step(world.m_dynamicsWorld, world.dispatcher);
	/*
		Clean up aka garbage collect unused game objects from physics simulation
	*/
	for(var objectId in bodies) {
		if(!(objectId in gameState.state.physics)) {
			world.m_dynamicsWorld.removeRigidBody(bodies[objectId]);
			delete bodies[objectId];
		}
	}
	//delete no longer active constraints.
	let constraintDeleted = false;
	for(var objectId in constraints) {
		if(!(objectId in gameState.state.constraint)) {
			world.m_dynamicsWorld.removeConstraint(constraints[objectId]);
			delete constraints[objectId];
			constraintDeleted = true;
		}
	}
	//If a constraint is deleted, we should wake up all the bodies
	//because it doesn't seem to wake them. TODO we could probably just wake affected bodies
	if(constraintDeleted) {
		for(var objectId in bodies) {
			bodies[objectId].activate();
		}
	}
	readCollisionData(gameState);
}


export { init, applyPhysics, resetWorld, applyCollision, stepWorld, bodies, applyConstraints }
