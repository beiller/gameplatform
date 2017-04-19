define(["lib/ammo", "lib/three"], function(Ammo, THREE) {
	var trans = new Ammo.btTransform();

	function Body(mybody) {
		this.body = mybody;
	}
	Body.prototype.getPosition = function() {
		var l = this.body.getWorldTransform().getOrigin();
		return [l.x(), l.y(), l.z()];
	};
	Body.prototype.getPositionX = function() { return this.body.getWorldTransform().getOrigin().x(); };
	Body.prototype.getPositionY = function() { return this.body.getWorldTransform().getOrigin().y(); };
	Body.prototype.getPositionZ = function() { return this.body.getWorldTransform().getOrigin().z(); };
	Body.prototype.setPosition = function(positionArray) {
		var t = this.body.getWorldTransform()
		t.setOrigin(new Ammo.btVector3(positionArray[0], positionArray[1], positionArray[2]));
		this.body.activate();
	};
	
	Body.prototype.getVelocity = function() {
		var l = this.body.getLinearVelocity();
		return [l.x(), l.y(), l.z()];
	};
	Body.prototype.getVelocityX = function() { return this.body.getLinearVelocity().x(); };
	Body.prototype.getVelocityY = function() { return this.body.getLinearVelocity().y(); };
	Body.prototype.getVelocityZ = function() { return this.body.getLinearVelocity().z(); };
	
	Body.prototype.getQuaternion = function() {
		var q = this.body.getWorldTransform().getRotation();
		return [q.x(), q.y(), q.z(), q.w()];
	};	
	Body.prototype.getQuaternionX = function() { return this.body.getWorldTransform().getRotation().x(); };	
	Body.prototype.getQuaternionY = function() { return this.body.getWorldTransform().getRotation().y(); };	
	Body.prototype.getQuaternionZ = function() { return this.body.getWorldTransform().getRotation().z(); };	
	Body.prototype.getQuaternionW = function() { return this.body.getWorldTransform().getRotation().w(); };	
	Body.prototype.setQuaternion = function(positionArray) {
		var t = this.body.getWorldTransform()
		t.setRotation(new Ammo.btQuaternion(positionArray[0], positionArray[1], positionArray[2], positionArray[3]));
		this.body.activate();
	};

	Body.prototype.setFromOpenGLMatrix = function(array) {
		trans.setIdentity();
		trans.setFromOpenGLMatrix(array);
		this.body.setWorldTransform(trans);
		this.body.activate();
	}
	
	Body.prototype.applyImpulse = function(f, p) {
		console.log(f);
		this.body.activate();
		this.body.applyImpulse(new Ammo.btVector3(f[0], f[1], f[2]));
	};
	
	Body.prototype.setDamping = function(linearDamping, angularDamping) {
		this.body.setDamping(linearDamping, angularDamping);
	};

	function AmmoPhysics() {
		this.initPhysics();
		this.collisionLayers = {
			PLAYER: 1,
			WORLD: 2,
			OTHER: 4,
			NOTHING: 8
		};
		this.callbacks = {};
	}
	AmmoPhysics.prototype.addCollisionCallback = function(body, func) {
		this.callbacks[body.ptr] = func;
	};
	AmmoPhysics.prototype.step = function() {
		var numIterations = 100;
		var dt = 1/60;
		if(this.m_dynamicsWorld) {
			for(var i = 0; i < numIterations; i++) {
	    		this.m_dynamicsWorld.stepSimulation(dt / numIterations);
	    	}
    	}

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
		        	this.callbacks[b1.ptr](new Body(b1), new Body(b2), [hp.x(), hp.y(), hp.z()]);
		        }
		        if(b2.ptr in this.callbacks) {
		        	var hp = pt.getPositionWorldOnB();
		        	this.callbacks[b2.ptr](new Body(b2), new Body(b1), [hp.x(), hp.y(), hp.z()]);
		        }
		    }
		}
	};

	/*
		Bt TRANSFORMS?
		var localA = new Ammo.btTransform();
		var localB = new Ammo.btTransform();
		localA.setIdentity(); localB.setIdentity();
		localA.setOrigin(new Ammo.btVector3(0,0,0));
		localB.setOrigin(new Ammo.btVector3(0,0,0));
	*/
	
//Ammo.btHingeConstraint(m_bodies[BODYPART_PELVIS],
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
		var constraint = new Ammo.btPoint2PointConstraint(
			bodyA.body, 
			bodyB.body, 
			new Ammo.btVector3(localA[0], localA[1], localA[2]), 
			new Ammo.btVector3(localB[0], localB[1], localB[2])
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

		var transA = new Ammo.btTransform();
		transA.setIdentity();
		transA.setRotation(new Ammo.btQuaternion(q1.x, q1.y, q1.z, q1.w));
		transA.setOrigin(new Ammo.btVector3(p1.x, p1.y, p1.z));
		
		
		var transB = new Ammo.btTransform();
		transB.setIdentity();
		transB.setRotation(new Ammo.btQuaternion(q2.x, q2.y, q2.z, q2.w));
		transB.setOrigin(new Ammo.btVector3(p2.x, p2.y, p2.z));
		

		var constraint = new Ammo.btGeneric6DofConstraint(
			bodyA.body, 
			bodyB.body, 
			transA, 
			transB,
			false
		);

		Ammo.destroy(transA);
		Ammo.destroy(transB);

		constraint.setLinearLowerLimit(new Ammo.btVector3(0, 0, 0));
		constraint.setLinearUpperLimit(new Ammo.btVector3(0, 0, 0));

		constraint.setAngularLowerLimit(new Ammo.btVector3( -0.25, -0.25, -0.01));
		constraint.setAngularUpperLimit(new Ammo.btVector3(  0.25,  0.25,  0.01));

		this.m_dynamicsWorld.addConstraint(constraint, true);
		return {
			bodyA: bodyA,
			bodyB: bodyB,
			constraint: constraint,
			updateSpringPosition: function(positionArray) {  }
		};
	};

	AmmoPhysics.prototype.createConstraintCone = function(bodyA, bodyB, localA, localB, options) {
		var q1 = new THREE.Quaternion().fromArray(bodyA.getQuaternion()).inverse();
		var q2 = new THREE.Quaternion().fromArray(bodyB.getQuaternion()).inverse();
		//var q1_i = new THREE.Quaternion().copy(q1).inverse();
		//var q2_i = new THREE.Quaternion().copy(q2).inverse();
		
		var p1 = new THREE.Vector3().fromArray(localA);
		var p2 = new THREE.Vector3().fromArray(localB);
		//p1.applyQuaternion(q1);
		//p2.applyQuaternion(q2);

		var transA = new Ammo.btTransform();
		transA.setIdentity();
		transA.setRotation(new Ammo.btQuaternion(q1.x, q1.y, q1.z, q1.w));
		transA.setOrigin(new Ammo.btVector3(p1.x, p1.y, p1.z));
		
		var transB = new Ammo.btTransform();
		transB.setIdentity();
		transB.setRotation(new Ammo.btQuaternion(q2.x, q2.y, q2.z, q2.w));
		transB.setOrigin(new Ammo.btVector3(p2.x, p2.y, p2.z));

		var constraint = new Ammo.btConeTwistConstraint(
			bodyA.body, 
			bodyB.body, 
			transA, 
			transB
		);
		Ammo.destroy(transA);
		Ammo.destroy(transB);

		constraint.setLimit(Math.PI / 40, Math.PI / 40, 0.1, 1.0, 0.3, 1.0);
		constraint.enableFeedback();

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
	};

	/**
	 * Spawns a rigid body into the demo scene
	 * @tparam float mass
	 * @tparam btTransform startTransform
	 * @tparam btCollisionShape shape
	 * @tparam Object options
	 * @treturn btRigidBody
	 */
	AmmoPhysics.prototype.localCreateRigidBody = function(mass, startTransform, shape, options, layers, mask) {
		if (!shape)
			return null;
		if(!layers) {
			layers = this.collisionLayers.WORLD;
		}
		if(!mask) {
			mask = this.collisionLayers.WORLD | this.collisionLayers.PLAYER;
		}

		// rigidbody is dynamic if and only if mass is non zero, otherwise static
		var isDynamic = (mass != 0.0);

		var localInertia = new Ammo.btVector3(0, 0, 0);
		if (isDynamic)
			shape.calculateLocalInertia(mass, localInertia);

		var myMotionState = new Ammo.btDefaultMotionState(startTransform);
		var cInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, shape, localInertia);
		//cInfo.friction = 5.0;
		var btBody = new Ammo.btRigidBody(cInfo);
		btBody.setActivationState(4);
		//btBody.setFriction(0.9);
		//btBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
		//btBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
		//btBody.setContactProcessingThreshold(this.m_defaultContactProcessingThreshold);
		this.m_dynamicsWorld.addRigidBody(btBody, layers, mask);
		return btBody;
	};

	AmmoPhysics.prototype.initPhysics = function() {
		this.collisionLayers = [1, 2, 4, 8, 16, 32, 64, 128];
		// Bullet-interfacing code
		var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
		this.dispatcher = dispatcher;
		var overlappingPairCache = new Ammo.btDbvtBroadphase();
		//var overlappingPairCache = new Ammo.btAxisSweep3(new Ammo.btVector3(-10,-10,-10),new Ammo.btVector3(10,10,10));
		var solver = new Ammo.btSequentialImpulseConstraintSolver();
		this.m_dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
		var solver = this.m_dynamicsWorld.getSolverInfo();
		/*console.log(solver);
		solver.m_numIterations = 1000;
		console.log(solver);*/
		this.m_dynamicsWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));


		this.addGroundPlane(-4);
	};
	AmmoPhysics.prototype.addGroundPlane = function(height) {

		// Create ground
		var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(100, 0.5, 6));
		var groundTransform = new Ammo.btTransform();
		groundTransform.setIdentity();
		groundTransform.setOrigin(new Ammo.btVector3(0, height-0.25, 0));
		var body = new Body(this.localCreateRigidBody(0, groundTransform, groundShape));
		/*
		// Create infinite ground plane
		var aabbShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(0, 1, 0), -1.5);
		var aabbTransform = new Ammo.btTransform();
		aabbTransform.setIdentity();
		aabbTransform.setOrigin(new Ammo.btVector3(0, height, 0));
		var body = new Body(this.localCreateRigidBody(0, aabbTransform, aabbShape));	*/
	};
	AmmoPhysics.prototype.addCharacterPhysics = function(radius, mass, position) {
		// Create character body
		if(position === undefined) position = [0,0,0];
		var shape = new Ammo.btSphereShape(radius || 1.0);
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
		var btBody = this.localCreateRigidBody(mass || 49.0, transform, shape, null, this.collisionLayers.PLAYER, this.collisionLayers.WORLD);
		btBody.setAngularFactor(new Ammo.btVector3(0, 0, 0));
		//btBody.setDamping(0.9, 1.0);
		return new Body(
			btBody
		);
	};
	AmmoPhysics.prototype.addStaticPhysics = function(shape, mesh, position) {
		if (shape === 'box') {
			if(position === undefined) position = [0,0,0];
			mesh.geometry.computeBoundingBox();
			var bboxmax = mesh.geometry.boundingBox.max;
			var boxShape = new Ammo.btBoxShape(new Ammo.btVector3(bboxmax.x, bboxmax.y, bboxmax.z));
			var boxTransform = new Ammo.btTransform();
			boxTransform.setIdentity();
			boxTransform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
			return new Body(
				this.localCreateRigidBody(0, boxTransform, boxShape)
			);
		}
	};
	AmmoPhysics.prototype.addObjectPhysics = function(mesh, mass, position) {
		mesh.geometry.computeBoundingBox();
		var len = mesh.geometry.boundingBox.max.sub(mesh.geometry.boundingBox.min);
		var sizex = Math.abs(len.x);
		var sizey = Math.abs(len.y);
		var sizez = Math.abs(len.z);
		if (position === undefined)
			position = [0, 0, 0];
		var boxShape = new Ammo.btBoxShape(new Ammo.btVector3(sizex, sizey, sizez));
		var boxTransform = new Ammo.btTransform();
		boxTransform.setIdentity();
		boxTransform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
		return new Body(
			this.localCreateRigidBody(mass || 49.0, boxTransform, boxShape, this.collisionLayers.OTHER, this.collisionLayers.NOTHING)
		);
	};

	AmmoPhysics.prototype.createPhysBone = function(bone, parentBody, character, physBoneType, radius) {
	    //var radius = 0.075;
	    var mass = 1.2;
	    
	    var position = new THREE.Vector3();
	    var quaternion = new THREE.Quaternion();
	    var scale = new THREE.Vector3();
	    bone.matrixWorld.decompose(position, quaternion, scale);

	    var translation = new THREE.Vector3(0, 0, -radius/2).applyQuaternion(quaternion);
	    position.add(character.armature.position).add(translation);
	    //var position = new THREE.Vector3().copy(position).add(translation);

		var shape = new Ammo.btSphereShape(radius/2);
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
		transform.setRotation(new Ammo.btQuaternion(
			quaternion.x, quaternion.y, quaternion.z, quaternion.w
		));
		
		var btBody = this.localCreateRigidBody(mass, transform, shape, null, this.collisionLayers.OTHER, this.collisionLayers.NOTHING);

		return new physBoneType(bone, new Body(btBody), parentBody, this, character, radius);
	};

	AmmoPhysics.prototype.createCollisionBone = function(bone, character, constructor, radius) {
	    var mass = 1.2;
	    
	    var position = new THREE.Vector3();
	    var quaternion = new THREE.Quaternion();
	    var scale = new THREE.Vector3();
	    bone.matrixWorld.decompose(position, quaternion, scale);

	    var translation = new THREE.Vector3(0, 0, -radius/2).applyQuaternion(quaternion);
	    position.add(character.armature.position).add(translation);
	    //var position = new THREE.Vector3().copy(position).add(translation);

		var shape = new Ammo.btSphereShape(radius);
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
		transform.setRotation(new Ammo.btQuaternion(
			quaternion.x, quaternion.y, quaternion.z, quaternion.w
		));
		//var btBody = this.localCreateRigidBody(mass, transform, shape, null, this.collisionLayers.NOTHING, this.collisionLayers.NOTHING);
		var body = new Body(
			this.localCreateRigidBody(0, transform, shape, null, this.collisionLayers.OTHER, this.collisionLayers.NOTHING)
		);
		
		return new constructor(bone, character.game, body);
	};

	return AmmoPhysics;
}); 