define([
	"lib/ammo", "lib/three", "physics/Body", 
	"entity/DynamicCollisionEntity", "entity/PhysBone"], 

	function(Ammo, THREE, Body, DynamicCollisionEntity, PhysBone) {
	
	var temp_trans_1 = new Ammo.btTransform();
	var temp_trans_2 = new Ammo.btTransform();

	var temp_vec3_1 = new Ammo.btVector3(0,0,0);
	var temp_vec3_2 = new Ammo.btVector3(0,0,0);

	var temp_quat_1 = new Ammo.btQuaternion(0,0,0,1);
	var temp_quat_2 = new Ammo.btQuaternion(0,0,0,1);

	function AmmoPhysics() {
		this.collisionLayers = {
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

		this.callbacks = {};

		this.stepHz = 240;
		this.constraintSolverIterations = 60;

		this.initPhysics();
	}
	AmmoPhysics.prototype.addCollisionCallback = function(body, func) {
		this.callbacks[body.ptr] = func;
	};
	AmmoPhysics.prototype.step = function(dt) {
		var numIterations = this.stepHz / 60;
		//var dt = 1/60;
		for(var i = 0; i < numIterations; i++) {
			this.m_dynamicsWorld.stepSimulation(dt/numIterations, 1, 1/this.stepHz);
		}

		/*
			Emit collision detection events

			CollisionCallback arguments body1:Body, body2:Body, hitpoint:Array(xyz)
		*/
		var i,
		    dp = this.dispatcher,
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
		        if(b1.ptr in this.callbacks) {
		        	var hp = pt.getPositionWorldOnA();
		        	this.callbacks[b1.ptr](b1, b2, [hp.x(), hp.y(), hp.z()]);
		        }
		        if(b2.ptr in this.callbacks) {
		        	var hp = pt.getPositionWorldOnB();
		        	this.callbacks[b2.ptr](b2, b1, [hp.x(), hp.y(), hp.z()]);
		        }
		    }
		}
	};
	
	AmmoPhysics.prototype.createConstraint = function(type, bodyA, bodyB, localA, localB, options) {
		/*
			Create a constraint
			bodyA: parent body
			bodyB: child body
			localA: local coordinates of connection in A
			lobalB: local coordinates of connection in B

		*/
		switch(type) {
		    case "BALL":
		        return this.createConstraintBall(bodyA, bodyB, localA, localB, options);
		        break;
		    case "6DOF":
		        return this.createConstraint6DOF(bodyA, bodyB, localA, localB, options);
		        break;
		    case "CONE":
		    	return this.createConstraintCone(bodyA, bodyB, localA, localB, options);
		    	break;
		    default:
		    	throw("Invalid constraint type: " + type);
		}
	};

	AmmoPhysics.prototype.createConstraintBall = function(bodyA, bodyB, localA, localB, options) {
		temp_vec3_1.setValue(localA[0], localA[1], localA[2]);
		temp_vec3_2.setValue(localB[0], localB[1], localB[2]);
		var constraint = new Ammo.btPoint2PointConstraint(
			bodyA.body, 
			bodyB.body, 
			temp_vec3_1, 
			temp_vec3_2
		);
		this.m_dynamicsWorld.addConstraint(constraint, true);
		return {
			bodyA: bodyA,
			bodyB: bodyB,
			constraint: constraint,
			updateSpringPosition: function(positionArray) {  }
		};
	};
	AmmoPhysics.prototype.createConstraint6DOF = function(bodyA, bodyB, localA, localB, options) {
		var q1 = new THREE.Quaternion().fromArray(bodyA.getQuaternion()).inverse();
		var q2 = new THREE.Quaternion().fromArray(bodyB.getQuaternion()).inverse();
		//var q1_i = new THREE.Quaternion().copy(q1).inverse();
		//var q2_i = new THREE.Quaternion().copy(q2).inverse();
		
		var p1 = new THREE.Vector3().fromArray(localA);
		var p2 = new THREE.Vector3().fromArray(localB);
		//p1.applyQuaternion(q1);
		//p2.applyQuaternion(q2);

		var transA = temp_trans_1;
		temp_vec3_1.setValue(p1.x, p1.y, p1.z);
		temp_quat_1.setValue(q1.x, q1.y, q1.z, q1.w);
		transA.setIdentity();
		transA.setRotation(temp_quat_1);
		transA.setOrigin(temp_vec3_1);
		
		
		var transB = temp_trans_2;
		temp_vec3_1.setValue(p2.x, p2.y, p2.z);
		temp_quat_1.setValue(q2.x, q2.y, q2.z, q2.w);
		transB.setIdentity();
		transB.setRotation(temp_quat_1);
		transB.setOrigin(temp_vec3_1);
		

		var constraint = new Ammo.btGeneric6DofSpringConstraint(
			bodyA.body, 
			bodyB.body, 
			transA, 
			transB,
			false
		);

		if(!options) {
			options = {};
		}

		var angleLow = options.rotationLimitsLow ? options.rotationLimitsLow : [-0.5, -0.25, -0.5];
		var angleHigh = options.rotationLimitsHigh ? options.rotationLimitsHigh : [0.5, 0.25, 0.5];
		temp_vec3_1.setValue(angleLow[0], angleLow[1], angleLow[2]);
		temp_vec3_2.setValue(angleHigh[0], angleHigh[1], angleHigh[2]);
		constraint.setAngularLowerLimit(temp_vec3_1);
		constraint.setAngularUpperLimit(temp_vec3_2);

		if(options.spring) {
			constraint.enableSpring(3, true);
			constraint.enableSpring(4, true);
			constraint.enableSpring(5, true);

			constraint.setStiffness(3, options.stiffness || 5.0);
			constraint.setStiffness(4, options.stiffness || 5.0);
			constraint.setStiffness(5, options.stiffness || 5.0);

			//constraint.setDamping(3, options.damping || 100);
			//constraint.setDamping(4, options.damping || 100);
			//constraint.setDamping(5, options.damping || 100);

			dist = options.distance || 1.5;
			temp_vec3_1.setValue(-dist, -dist, -0);
			constraint.setAngularLowerLimit(temp_vec3_1);
			temp_vec3_1.setValue(dist, dist, 0);
			constraint.setAngularUpperLimit(temp_vec3_2);
		} else {
			temp_vec3_1.setValue(0,0,0);
			constraint.setLinearLowerLimit(temp_vec3_1);
			constraint.setLinearUpperLimit(temp_vec3_1);	
		}

		

		this.m_dynamicsWorld.addConstraint(constraint, true);
		return {
			bodyA: bodyA,
			bodyB: bodyB,
			constraint: constraint,
			updateSpringPosition: function(positionArray) {  }
		};
	};

	/*AmmoPhysics.prototype.createConstraintCone = function(bodyA, bodyB, localA, localB, options) {
		var q1 = new THREE.Quaternion().fromArray(bodyA.getQuaternion()).inverse();
		var q2 = new THREE.Quaternion().fromArray(bodyB.getQuaternion()).inverse();
		//var q1_i = new THREE.Quaternion().copy(q1).inverse();
		//var q2_i = new THREE.Quaternion().copy(q2).inverse();
		
		var p1 = new THREE.Vector3().fromArray(localA);
		var p2 = new THREE.Vector3().fromArray(localB);
		//p1.applyQuaternion(q1);
		//p2.applyQuaternion(q2);

		var transA = temp_trans_1;
		transA.setIdentity();
		transA.setRotation(new Ammo.btQuaternion(q1.x, q1.y, q1.z, q1.w));
		transA.setOrigin(new Ammo.btVector3(p1.x, p1.y, p1.z));
		
		var transB = temp_trans_2;
		transB.setIdentity();
		transB.setRotation(new Ammo.btQuaternion(q2.x, q2.y, q2.z, q2.w));
		transB.setOrigin(new Ammo.btVector3(p2.x, p2.y, p2.z));

		var constraint = new Ammo.btConeTwistConstraint(
			bodyA.body, 
			bodyB.body, 
			transA, 
			transB
		);

		//constraint.setLimit(Math.PI / 40, Math.PI / 40, 0.1, 1.0, 0.3, 1.0);
		//constraint.setLimit(0.1, 0.1, 0.1);
		constraint.setLimit(0, 0.001);
		constraint.setLimit(1, 0.001);
		constraint.setLimit(2, 0.001);
		
		//constraint.setLimit(3, 0.001);
		//constraint.enableFeedback();

		this.m_dynamicsWorld.addConstraint(constraint, true);
		return {
			bodyA: bodyA,
			bodyB: bodyB,
			constraint: constraint,
			updateSpringPosition: function(positionArray) {  }
		};
	};


	AmmoPhysics.prototype.createSpring = function(body1, body2, distance, max_force) {
		//btGeneric6DofSpringConstraint (btRigidBody &rbB, const btTransform &frameInB, bool useLinearReferenceFrameB)
		//void btPoint2PointConstraint([Ref] btRigidBody rbA, [Ref] btRigidBody rbB, [Ref] btVector3 pivotInA, [Ref] btVector3 pivotInB);
 		//var constraint = new Ammo.btPoint2PointConstraint(body1, body2, new Ammo.btVector3(0,0.15,0), new Ammo.btVector3(0,-0.15,0), true);
 		//addConstraint (btTypedConstraint *constraint, bool disableCollisionsBetweenLinkedBodies=false)
		var b1 = body1.getPosition();
		console.log(b1);
		//var constraint = new Ammo.btConeTwistConstraint(body1.body, body2.body, localA, localB);
		var constraint = new Ammo.btPoint2PointConstraint(
			body1.body, 
			body2.body, 
			new Ammo.btVector3(0, 0, -0.05), 
			new Ammo.btVector3(b1[0], b1[1], b1[2])
		);
		//constraint.setLimit(Math.PI/16, Math.PI/16, Math.PI/16);
		this.m_dynamicsWorld.addConstraint(constraint, true);

		return {
			body1: body1,
			body2: body2,
			constraint: constraint,
			updateSpringPosition: function(positionArray) {  }
		};
	};*/

	AmmoPhysics.prototype.initPhysics = function() {
		// Bullet-interfacing code
		var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
		this.dispatcher = dispatcher;
		var overlappingPairCache = new Ammo.btDbvtBroadphase();

		var solver = new Ammo.btSequentialImpulseConstraintSolver();
		this.m_dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
		
		var s = this.m_dynamicsWorld.getSolverInfo();
		s.set_m_splitImpulse(true);
		s.set_m_numIterations(this.constraintSolverIterations);

		/*Ammo.ContactResultCallback = function(e) {
			console.log("CONTACT?", e);
		};*/
		temp_vec3_1.setValue(0, -9.82, 0);
		this.m_dynamicsWorld.setGravity(temp_vec3_1);


		this.addGroundPlane(-4);
	};
	AmmoPhysics.prototype.addGroundPlane = function(height) {
		temp_trans_1.setIdentity();
		temp_vec3_1.setValue(0, height, 0);
		temp_trans_1.setOrigin(temp_vec3_1);

	    var shapeOptions = { type: "box", x: 100, y: 0.5, z: 6, margin: 0.0001 };

	    var bodyOptions = {
	    	mass: 0,
	    	transform: temp_trans_1,
	    	options: {},
	    	staticObject: true
	    };

		var body = new Body(bodyOptions, shapeOptions);
		this.m_dynamicsWorld.addRigidBody(body.body, this.collisionLayers.WORLD, this.collisionLayers.WORLD | this.collisionLayers.PLAYER);

		return body;
	};
	AmmoPhysics.prototype.addCharacterPhysics = function(radius, mass, position) {
		// Create character body
		if(position === undefined) position = [0,0,0];
		var shape = new Ammo.btSphereShape(radius || 1.0);
		var transform = temp_trans_1;
		temp_vec3_1.setValue(position[0], position[1], position[2]);
		transform.setIdentity();
		transform.setOrigin(temp_vec3_1);

		var shapeOptions = { type: "sphere", radius: radius };

	    var bodyOptions = {
	    	mass: mass,
	    	transform: transform,
	    	options: {}
	    };

		var body = new Body(bodyOptions, shapeOptions);
		this.m_dynamicsWorld.addRigidBody(body.body, this.collisionLayers.PLAYER, this.collisionLayers.WORLD);

		
		temp_vec3_1.setValue(0,0,0);
		body.body.setAngularFactor(temp_vec3_1);

		return body;
		
	};
	AmmoPhysics.prototype.addStaticPhysics = function(shape, mesh, position) {
		if (shape === 'box') {
			if(position === undefined) position = [0,0,0];
			mesh.geometry.computeBoundingBox();
			var bboxmax = mesh.geometry.boundingBox.max;
			var boxTransform = temp_trans_1;
			boxTransform.setIdentity();
			boxTransform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));

		    var shapeOptions = { type: "box", x: bboxmax.x, y: bboxmax.y, z: bboxmax.z, margin: 0.0001 };

		    var bodyOptions = {
		    	mass: 0,
		    	transform: boxTransform,
		    	options: {}
		    };

			var body = new Body(bodyOptions, shapeOptions);
			this.m_dynamicsWorld.addRigidBody(body.body, this.collisionLayers.WORLD, this.collisionLayers.WORLD);

			return body;
		}
	};
	AmmoPhysics.prototype.addObjectPhysics = function(mesh, mass, position) {
		mesh.geometry.computeBoundingBox();
		var len = mesh.geometry.boundingBox.max.sub(mesh.geometry.boundingBox.min);
		if (position === undefined)
			position = [0, 0, 0];

		var boxTransform = temp_trans_1;
		boxTransform.setIdentity();
		boxTransform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));

	    var shapeOptions = { type: "box", x: Math.abs(len.x), y: Math.abs(len.y), z: Math.abs(len.z), margin: 0.0001 };

	    var bodyOptions = {
	    	mass: mass,
	    	transform: boxTransform,
	    	options: {}
	    };

		var body = new Body(bodyOptions, shapeOptions);
		this.m_dynamicsWorld.addRigidBody(body.body, this.collisionLayers.WORLD, this.collisionLayers.WORLD);

		return body;
	};

	AmmoPhysics.prototype.determineWorldPosition = function(bone, parentMesh, radius) {
	    var position = new THREE.Vector3();
	    var quaternion = new THREE.Quaternion();
	    var scale = new THREE.Vector3();
	    bone.matrixWorld.decompose(position, quaternion, scale);

	    var translation = new THREE.Vector3(0, 0, -radius/2).applyQuaternion(quaternion);
	    position.add(translation).add(parentMesh.position);
		
		var transform = temp_trans_1;
		temp_vec3_1.setValue(position.x, position.y, position.z);
		temp_quat_1.setValue(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
		transform.setIdentity();
		transform.setOrigin(temp_vec3_1);
		transform.setRotation(temp_quat_1);
		return transform;
	};

	AmmoPhysics.prototype.determineZLength = function(bone, options) {
		var z_len = 0.0;
	    if(options.tailBone) {
	    	var tailBone = options.tailBone;
		    var position = new THREE.Vector3();
		    var quaternion = new THREE.Quaternion();
		    var scale = new THREE.Vector3();
		    bone.matrixWorld.decompose(position, quaternion, scale);

		    var position2 = new THREE.Vector3();
		    tailBone.matrixWorld.decompose(position2, quaternion, scale);

		    var mag = position.sub(position2).length();
		    z_len = mag;
	    }
	    if(options.localOffset) {
		    z_len = options.localOffset[2];
	    }
	    return z_len;
	};

	AmmoPhysics.prototype.createPhysBone = function(bone, parentBody, parentMesh, z_len, options, game, useDynamicCollision) {
		if(!options) {
			options = {};
		}
	    var mass = 1.0;

	    z_len = this.determineZLength(bone, options);
	    
	    var transform = this.determineWorldPosition(bone, parentMesh, z_len);

	    var shapeOptions = {
	    	type: "box",
	    	x: options.boxWidth || 0.02, y: options.boxDepth || 0.02, z: z_len/2, margin: 0.0001
	    };

	    var bodyOptions = {
	    	mass: options.mass || mass,
	    	transform: transform,
	    	options: {},
	    	noContact: "noContact" in options ? options.noContact : true,
	    	kinematic: "kinematic" in options ? options.kinematic : true
	    };

		var body = new Body(bodyOptions, shapeOptions);
		this.m_dynamicsWorld.addRigidBody(body.body, this.collisionLayers.WORLD, this.collisionLayers.WORLD);

		if(useDynamicCollision) {
			options.localOffset = new THREE.Vector3(0, 0, -z_len/2);
			//return new DynamicCollisionEntity(bone, body, parentBody, parentMesh, game, options);
		} else {
			options.localOffset = new THREE.Vector3(0, 0, z_len/2);
		}
		var physBone = new PhysBone(bone, body, parentBody, parentMesh, game, options);
		physBone.update();
		return physBone;
	};

	return AmmoPhysics;
}); 