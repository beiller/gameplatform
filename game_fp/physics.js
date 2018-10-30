Ammo().then(function() {

const temp_trans_1 = new Ammo.btTransform();
const temp_trans_2 = new Ammo.btTransform();
const temp_vec3_1 = new Ammo.btVector3(0,0,0);
const temp_vec3_2 = new Ammo.btVector3(0,0,0);
const temp_quat_1 = new Ammo.btQuaternion(0,0,0,1);
const temp_quat_2 = new Ammo.btQuaternion(0,0,0,1);
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

const stepHz = 120;
const constraintSolverIterations = 10;
const callbacks = {};
function addCollisionCallback(body, func) {
	callbacks[body.ptr] = func;
};
function step(m_dynamicsWorld, dispatcher, dt) {
	dt = Math.min(dt, 0.05);
	var numIterations = stepHz / 60;
	for(var i = 0; i < numIterations; i++) {
		m_dynamicsWorld.stepSimulation(dt/numIterations, 1, 1/stepHz);
	}

	/*
		Emit collision detection events

		CollisionCallback arguments body1:Body, body2:Body, hitpoint:Array(xyz)
	*/
	var i,
	    dp = dispatcher,
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
	        if(b1.ptr in callbacks) {
	        	var hp = pt.getPositionWorldOnA();
	        	console.log(b1, b2, [hp.x(), hp.y(), hp.z()]);
	        }
	        if(b2.ptr in callbacks) {
	        	var hp = pt.getPositionWorldOnB();
	        	console.log(b2, b1, [hp.x(), hp.y(), hp.z()]);
	        }
	    }
	}
};


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
function createBody(shape, bodyInfo) {
	var body = localCreateRigidBody(
		bodyInfo.mass, bodyInfo.transform, shape, bodyInfo.options
	);
	var flags = [];
	if(bodyInfo.noContact) flags.push(collisionFlags.CF_NO_CONTACT_RESPONSE);
	if(bodyInfo.staticObject) flags.push(collisionFlags.CF_STATIC_OBJECT);
	if(bodyInfo.kinematic) flags.push(collisionFlags.CF_KINEMATIC_OBJECT);
	body.setDamping(bodyInfo.damping || 0.7, bodyInfo.damping || 0.7);
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

function localCreateRigidBody(mass, startTransform, shape, options, layers, mask) {
	if (!shape)
		return null;

	// rigidbody is dynamic if and only if mass is non zero, otherwise static
	var isDynamic = (mass != 0.0);

	var localInertia = new Ammo.btVector3(0, 0, 0);
	if (isDynamic)
		shape.calculateLocalInertia(mass, localInertia);

	var myMotionState = new Ammo.btDefaultMotionState(startTransform);
	var cInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, shape, localInertia);
	cInfo.friction = 5.0;
	var btBody = new Ammo.btRigidBody(cInfo);
	btBody.setActivationState(4); //disables sleep
	btBody.setFriction(0.9);
	//btBody.setDamping(options.damping || 1.0, options.damping || 1.0);
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

function main() {
	var world = initPhysics();
	var groundBody = function(){
		var shapeOptions = { 
			type: "box", x: 100, y: 1, z: 6, margin: 0.00001 
		};
		var bodyOptions = {
			mass: 0, transform: getMat3({x:0,y:-1,z:0}), options: {}, staticObject: true
		};
		return createBody(createShape(shapeOptions), bodyOptions);
	}();
	var boxBody = function(){
		var shapeOptions = { 
			type: "box", x: 1, y: 1, z: 1, margin: 0.00001 
		};
		var bodyOptions = {
			mass: 1.0, transform: getMat3({x:0,y:5.0,z:0}), options: {}
		};
		return createBody(createShape(shapeOptions), bodyOptions);
	}();

	//m_dynamicsWorld.addRigidBody(body.body, collisionLayers.WORLD, collisionLayers.WORLD | collisionLayers.PLAYER);

	addBody(world.m_dynamicsWorld, groundBody);
	addBody(world.m_dynamicsWorld, boxBody);
	for(var i = 0; i < 1000; i++) {
		step(world.m_dynamicsWorld, world.dispatcher, 0.05);
		console.log(boxBody.getWorldTransform().getOrigin().y());
	}
};
main();

});