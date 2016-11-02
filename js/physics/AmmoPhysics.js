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
	
	Body.prototype.getVelocity = function() {
		var l = this.body.getLinearVelocity();
		return [l.x(), l.y(), l.z()];
	};
	Body.prototype.getVelocityX = function() { this.body.getLinearVelocity().x(); };
	Body.prototype.getVelocityY = function() { this.body.getLinearVelocity().y(); };
	Body.prototype.getVelocityZ = function() { this.body.getLinearVelocity().z(); };
	
	Body.prototype.getQuaternion = function() {
		var q = this.body.getWorldTransform().getRotation();
		return [q.x(), q.y(), q.z(), q.w()];
	};	
	Body.prototype.getQuaternionX = function() { return this.body.getWorldTransform().getRotation().x(); };	
	Body.prototype.getQuaternionY = function() { return this.body.getWorldTransform().getRotation().y(); };	
	Body.prototype.getQuaternionZ = function() { return this.body.getWorldTransform().getRotation().z(); };	
	Body.prototype.getQuaternionW = function() { return this.body.getWorldTransform().getRotation().w(); };	
	
	Body.prototype.applyImpulse = function(f, p) {
		this.body.applyImpulse(new Ammo.btVector3(f[0], f[1], f[2]), new Ammo.btVector3(p[0], p[1], p[2]));
	};

	function AmmoPhysics() {
		this.tempVector3 = new Ammo.btVector3(0, 0, 0);
		this.initPhysics();
	}
	AmmoPhysics.prototype.step = function() {
		if(this.m_dynamicsWorld) {
    		this.m_dynamicsWorld.stepSimulation(1/60);
    	}
	};
	
	AmmoPhysics.prototype.checkForGround = function(character) {
		return true;
	};

	AmmoPhysics.prototype.tVec = function(x, y, z) {
		this.tempVector3.setValue(x, y, z);
		return this.tempVector3;
	};

	/**
	 * Spawns a rigid body into the demo scene
	 * @tparam float mass
	 * @tparam btTransform startTransform
	 * @tparam btCollisionShape shape
	 * @tparam Object options
	 * @treturn btRigidBody
	 */
	AmmoPhysics.prototype.localCreateRigidBody = function(mass, startTransform, shape, options) {
		if (!shape)
			return null;

		// rigidbody is dynamic if and only if mass is non zero, otherwise static
		var isDynamic = (mass != 0.0);

		var localInertia = new Ammo.btVector3(0, 0, 0);
		if (isDynamic)
			shape.calculateLocalInertia(mass, localInertia);

		var myMotionState = new Ammo.btDefaultMotionState(startTransform);
		var cInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, shape, localInertia);
		var btBody = new Ammo.btRigidBody(cInfo);
		btBody.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
		btBody.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
		//btBody.setContactProcessingThreshold(this.m_defaultContactProcessingThreshold);
		this.m_dynamicsWorld.addRigidBody(btBody);
		//this.m_shapeDrawer.add(body,shape,options);
		//this.m_bodies.push(body);
		//this.m_startMotionStates.push(myMotionState);
		return btBody;
	};

	AmmoPhysics.prototype.initPhysics = function() {
		// Bullet-interfacing code
		var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
		var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
		var overlappingPairCache = new Ammo.btDbvtBroadphase();
		//var overlappingPairCache = new Ammo.btAxisSweep3(new Ammo.btVector3(-10,-10,-10),new Ammo.btVector3(10,10,10));
		var solver = new Ammo.btSequentialImpulseConstraintSolver();
		this.m_dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
		//this.m_dynamicsWorld.getSolverInfo().set_m_numIterations(10);
		this.m_dynamicsWorld.setGravity(this.tVec(0, -9.82, 0));
		
		this.addGroundPlane(-4);
	};
	AmmoPhysics.prototype.addGroundPlane = function(height) {
		// Create infinite ground plane
		var aabbShape = new Ammo.btStaticPlaneShape(this.tVec(0, 1, 0), -1.5);
		var aabbTransform = new Ammo.btTransform();
		aabbTransform.setIdentity();
		aabbTransform.setOrigin(this.tVec(0, height, 0));
		var body = new Body(this.localCreateRigidBody(0, aabbTransform, aabbShape));	
		
		console.log(body.getVelocity());	
	};
	AmmoPhysics.prototype.addCharacterPhysics = function(radius, mass, position) {
		// Create character body
		if(position === undefined) position = [0,0,0];
		var shape = new Ammo.btSphereShape(radius || 1.0);
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(this.tVec(position[0], position[1], position[2]));
		return new Body(
			this.localCreateRigidBody(mass || 49.0, transform, shape)
		);
	};
	AmmoPhysics.prototype.addStaticPhysics = function(shape, mesh, position) {
		if (shape === 'box') {
			if(position === undefined) position = [0,0,0];
			mesh.geometry.computeBoundingBox();
			var bboxmax = mesh.geometry.boundingBox.max;
			var boxShape = new Ammo.btBoxShape(this.tVec(bboxmax.x, bboxmax.y, bboxmax.z));
			var boxTransform = new Ammo.btTransform();
			boxTransform.setIdentity();
			boxTransform.setOrigin(this.tVec(position[0], position[1], position[2]));
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
		var boxShape = new Ammo.btBoxShape(this.tVec(sizex, sizey, sizez));
		var boxTransform = new Ammo.btTransform();
		boxTransform.setIdentity();
		boxTransform.setOrigin(this.tVec(position[0], position[1], position[2]));
		return new Body(
			this.localCreateRigidBody(mass || 49.0, boxTransform, boxShape)
		);
	};

	return AmmoPhysics;
}); 