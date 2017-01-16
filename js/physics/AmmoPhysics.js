define(["lib/ammo", "lib/three"], function(Ammo, THREE) {
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
		this.body.setWorldTransform(new Ammo.btVector3(positionArray[0], positionArray[1], positionArray[2]));
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
	}
	AmmoPhysics.prototype.step = function() {
		var numIterations = 100;
		var dt = 1/60;
		if(this.m_dynamicsWorld) {
			for(var i = 0; i < numIterations; i++) {
	    		this.m_dynamicsWorld.stepSimulation(dt / numIterations);
	    	}
    	}
	};
	
	AmmoPhysics.prototype.checkForGround = function(character) {
		var r_Bias = 0.25;
		var r = character.mesh.geometry.boundingSphere.radius;
		var body = {x: character.body.getPositionX(), y: character.body.getPositionY(), z: character.body.getPositionZ()};
		
	    var testList = [
	    	[new Ammo.btVector3(body.x+r*0.75, body.y, body.z), new Ammo.btVector3(body.x+r*0.75, body.y-100.0, body.z)],
	    	[new Ammo.btVector3(body.x-r*0.75, body.y, body.z), new Ammo.btVector3(body.x-r*0.75, body.y-100.0, body.z)],
	    ];
	    var gOldPickingDist = 1000.0;
		if (Math.abs(character.body.getVelocityY()) < 0.5) {
			for(var testRayIndex in testList) {
				var rayCallback = new Ammo.ClosestRayResultCallback(testList[testRayIndex][0], testList[testRayIndex][1]);
				this.m_dynamicsWorld.rayTest(testList[testRayIndex][0], testList[testRayIndex][1], rayCallback);
				if (rayCallback.hasHit()) {
					var btBody = rayCallback.get_m_collisionObject();
					var pickPos = rayCallback.get_m_hitPointWorld();
					gOldPickingDist  = (pickPos.op_sub(testList[testRayIndex][0])).length();
					if(gOldPickingDist <= r+r_Bias) {
						return true;
					}
				}
			}
		}
		return false;


	};
	
	AmmoPhysics.prototype.createSpring = function(body1, body2, distance, max_force) {
		//btGeneric6DofSpringConstraint (btRigidBody &rbB, const btTransform &frameInB, bool useLinearReferenceFrameB)
		//void btPoint2PointConstraint([Ref] btRigidBody rbA, [Ref] btRigidBody rbB, [Ref] btVector3 pivotInA, [Ref] btVector3 pivotInB);
 		//var constraint = new Ammo.btPoint2PointConstraint(body1, body2, new Ammo.btVector3(0,0.15,0), new Ammo.btVector3(0,-0.15,0), true);
 		//addConstraint (btTypedConstraint *constraint, bool disableCollisionsBetweenLinkedBodies=false)
		var localA = new Ammo.btTransform();
		var localB = new Ammo.btTransform();
		localA.setIdentity(); localB.setIdentity();
		var b1 = body1.getPosition();
		localA.setOrigin(new Ammo.btVector3(0., 0.1, 0.));
		localB.setOrigin(new Ammo.btVector3(b1[0], 0.4, b1[2]));
		var constraint = new Ammo.btConeTwistConstraint(body1.body, body2.body, localA, localB);
		constraint.setLimit(Math.PI/16, Math.PI/16, Math.PI/16);
		this.m_dynamicsWorld.addConstraint(constraint, true);

		//var constraint = new CANNON.DistanceConstraint(body1.body, body2.body, distance, max_force);
		//constraint.collideConnected = false;
		//this.world.addConstraint(constraint);
		//return constraint;
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
		//btBody.setActivationState(4);
		btBody.setFriction(0.9);
		btBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
		btBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
		//btBody.setContactProcessingThreshold(this.m_defaultContactProcessingThreshold);
		this.m_dynamicsWorld.addRigidBody(btBody, layers, mask);
		return btBody;
	};

	AmmoPhysics.prototype.initPhysics = function() {
		this.collisionLayers = [1, 2, 4, 8, 16, 32, 64, 128];
		// Bullet-interfacing code
		var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
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
		// Create infinite ground plane
		var aabbShape = new Ammo.btStaticPlaneShape(new Ammo.btVector3(0, 1, 0), -1.5);
		var aabbTransform = new Ammo.btTransform();
		aabbTransform.setIdentity();
		aabbTransform.setOrigin(new Ammo.btVector3(0, height, 0));
		var body = new Body(this.localCreateRigidBody(0, aabbTransform, aabbShape));	
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
			this.localCreateRigidBody(mass || 49.0, boxTransform, boxShape)
		);
	};
	
	AmmoPhysics.prototype.createPhysBone = function(boneName, parentBoneName, character, physBoneType) {
	    var rootBone = character.findBone(parentBoneName);
	    var bone = character.findBone(boneName);
	    var radius = 0.075;
	    var mass = 1.2;
	    
	    var position = [bone.matrixWorld.elements[12], bone.matrixWorld.elements[13], bone.matrixWorld.elements[14]];
		var shape = new Ammo.btSphereShape(radius);
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(position[0], position[1], position[2]));
		var btBody = this.localCreateRigidBody(mass, transform, shape, null, this.collisionLayers.CHARACTER, this.collisionLayers.WORLD);
		
	    return new physBoneType(parentBoneName, boneName, bone, new Body(btBody), this, character);
	
		/*if(game.debugPhysics) {
	        var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), new THREE.MeshBasicMaterial({wireframe: true}));
	        sphere.position.copy(body.position);
	        scope.scene.add(sphere);
	        //scope.dynamics.push(new DynamicEntity(sphere, this, body));
	            body.debugMesh = sphere;
			}*/
	};

	return AmmoPhysics;
}); 