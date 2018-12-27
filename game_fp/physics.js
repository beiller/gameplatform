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
const constraintSolverIterations = 10;
const callbacks = {};
function step(m_dynamicsWorld, dispatcher, dt) {
	dt = Math.min(dt, 0.05);
	var numIterations = stepHz / 60;
	for(var i = 0; i < numIterations; i++) {
		m_dynamicsWorld.stepSimulation(dt/numIterations, 1, 1/stepHz);
	}
};

function getIdByBody(body) {
	for(let id in bodies) {
		if(body.a === bodies[id].a) {
			return id;
		}
	}
	return null;
}

function getCollisionData(objectId) {
	/*
		Emit collision detection events

		CollisionCallback arguments id: Other's ID, hitpoint: Array(xyz)
	*/
	var data = [];
	var i,
	    dp = world.dispatcher,
	    num = dp.getNumManifolds(),
	    manifold, num_contacts, j, pt;

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
	        if(b1.a === bodies[objectId].a) {
	        	let b2Id = getIdByBody(b2);
	        	if(b2Id) {
	        		let hp = pt.getPositionWorldOnB();
	        		data.push({id: b2Id, hp: [hp.x(), hp.y(), hp.z()]});
	        	}
	        }
	        if(b2.a === bodies[objectId].a) {
	        	let b1Id = getIdByBody(b1);
	        	if(b1Id) {
	        		let hp = pt.getPositionWorldOnA();
	        		data.push({id: b1Id, hp: [hp.x(), hp.y(), hp.z()]});
	        	}
	        }
	    }
	}
	return data;
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
function createBody(shape, state) {	
	var bodyInfo = { ...state };
	var body = localCreateRigidBody(bodyInfo.mass, getMat3({x:bodyInfo.x,y:bodyInfo.y,z:bodyInfo.z}), shape);
	var flags = [];

	if(bodyInfo.noContact) flags.push(collisionFlags.CF_NO_CONTACT_RESPONSE);
	if(bodyInfo.staticObject) flags.push(collisionFlags.CF_STATIC_OBJECT);
	if(bodyInfo.kinematic) flags.push(collisionFlags.CF_KINEMATIC_OBJECT);
	if(bodyInfo.damping) {
		body.setDamping(bodyInfo.damping, bodyInfo.damping);
	}
	setBodyFlags(body, flags);
	return body;
}

function createShape(shapeInfo) {
	var shape = null;
	switch(shapeInfo.type) {
		case "sphere":
			if(! 'radius' in shapeInfo) throw("Must specify radius in shape info");
			var shape = new Ammo.btSphereShape(shapeInfo.radius);
			break;
		case "box":
			if(! 'x' in shapeInfo) throw("Must specify x, y, z in shape info");
			temp_vec3_1.setValue(shapeInfo.x, shapeInfo.y, shapeInfo.z);
		    var shape = new Ammo.btBoxShape(temp_vec3_1);
		    shape.setMargin(shapeInfo.margin || 0.0001);
		    break;
		default:
			throw("Invalid shape type: " + shapeInfo.type);
	};
	return shape;
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
	btBody.setFriction(0.9);
	//btBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
	//btBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
	//btBody.setContactProcessingThreshold(this.m_defaultContactProcessingThreshold);
	
	return btBody;
};

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
}

function applyMotionPhysics(state, id, eventHandler, gameState) {
	temp_vec3_1.setValue(gameState.motion[id].fx * movementSpeed, 0, gameState.motion[id].fz * movementSpeed);
	bodies[id].applyImpulse(temp_vec3_1);
	const p = bodies[id].getWorldTransform().getOrigin();
	const x = p.x();
	const y = p.y();
	const z = p.z();
	if(x !== state.x || y !== state.y || z !== state.z) {  //detect changes
		return { ...state, x: x, y: y, z: z }
	}
	return state;
}
const movementSpeed = 15.0;
const bodies = {};
function applyPhysics(state, id, eventHandler, gameState) {
	if(!world) return;

	if(!(id in bodies)) {
		//create bodies
		var shape = createShape({ ...state.shape });
		bodies[id] = createBody(shape, state);
		addBody(world.m_dynamicsWorld, bodies[id]);
		//"rest" the object necessary?
		temp_vec3_1.setValue(0, 0, 0);
		bodies[id].setAngularFactor(temp_vec3_1);
	}

	if(id in gameState.motion) {
		state = applyMotionPhysics(state, id, eventHandler, gameState);
		eventHandler.emitEvent("physics", id, {newPosition: state});
	}
	
	let collisions = getCollisionData(id);
	for(var i = 0; i < collisions.length; i++) {
		eventHandler.emitEvent("collision", id, {
			...collisions[i]
		});
	}

	return state;
}

const frameTime = 1000/60;
function stepWorld() {
	step(world.m_dynamicsWorld, world.dispatcher, frameTime);
}

setInterval(stepWorld, frameTime);


export { init, applyPhysics }
