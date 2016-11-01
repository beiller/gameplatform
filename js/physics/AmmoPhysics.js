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
	
	Body.prototype.getQuaternion = function() {
		var q = this.body.getWorldTransform().getRotation();
		return [q.x(), q.y(), q.z(), q.w()];
	};	
	Body.prototype.getQuaternionX = function() { return this.body.getWorldTransform().getRotation().x(); };	
	Body.prototype.getQuaternionY = function() { return this.body.getWorldTransform().getRotation().y(); };	
	Body.prototype.getQuaternionZ = function() { return this.body.getWorldTransform().getRotation().z(); };	
	Body.prototype.getQuaternionW = function() { return this.body.getWorldTransform().getRotation().w(); };	
	

	function AmmoPhysics() {
		this.tempVector3 = new Ammo.btVector3(0, 0, 0);
		this.initPhysics();
	}


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
		var body = new Ammo.btRigidBody(cInfo);
		body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
		body.setAngularVelocity(new Ammo.btVector3(0, 0, 0));
		//body.setContactProcessingThreshold(this.m_defaultContactProcessingThreshold);
		this.m_dynamicsWorld.addRigidBody(body);
		//this.m_shapeDrawer.add(body,shape,options);
		//this.m_bodies.push(body);
		//this.m_startMotionStates.push(myMotionState);
		return body;
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

		/*// Create ground
		 var groundShape = new Ammo.btBoxShape(this.tVec(6, 0.5, 6));
		 var groundTransform = new Ammo.btTransform();
		 groundTransform.setIdentity();
		 groundTransform.setOrigin(this.tVec(0, -1.0, 0));
		 var ground = this.localCreateRigidBody(0, groundTransform, groundShape);

		 // Create infinite ground plane
		 var aabbShape = new Ammo.btStaticPlaneShape(this.tVec(0, 1, 0), -1.5);
		 var aabbTransform = new Ammo.btTransform();
		 aabbTransform.setIdentity();
		 this.localCreateRigidBody(0, aabbTransform, aabbShape);

		 // Create smaller boxes
		 var s = 1;
		 var boxShape = new Ammo.btBoxShape(this.tVec(s*0.5, s*0.5, s*0.5));
		 var boxTransform = new Ammo.btTransform();
		 var Nsqrt = 5;
		 for(var j=0; j<Nsqrt; j++){
		 for(var i=0; i<Nsqrt; i++){
		 boxTransform.setIdentity();
		 boxTransform.setOrigin(this.tVec(s*j-(Nsqrt-1)*s*0.5, s*i, 0));
		 this.localCreateRigidBody(1, boxTransform, boxShape);
		 }
		 }*/
	};
	AmmoPhysics.prototype.addGroundPlane = function(height) {
		// Create infinite ground plane
		var aabbShape = new Ammo.btStaticPlaneShape(this.tVec(0, 1, 0), -1.5);
		var aabbTransform = new Ammo.btTransform();
		aabbTransform.setIdentity();
		aabbTransform.setOrigin(this.tVec(0, height, 0));
		var body = this.localCreateRigidBody(0, aabbTransform, aabbShape);		
	};
	AmmoPhysics.prototype.addCharacterPhysics = function(radius, mass, position) {
		// Create character body
		if(position === undefined) position = [0,0,0];
		var shape = new Ammo.btSphereShape(radius || 1.0);
		var transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(this.tVec(position[0], position[1], position[2]));
		mass = mass || 49.0;
		var body = this.localCreateRigidBody(mass, transform, shape);
		return new Body(body);
		
		/*var shape = new CANNON.Sphere( radius || 1.0 );
		 var body = new CANNON.Body({
		 mass: mass || 49.0
		 });
		 if(position === undefined) position = [0,0,0];
		 body.addShape(shape);
		 body.position.set(position[0], position[1], position[2]);
		 body.collisionFilterGroup = this.collisionGroups[1];
		 body.collisionFilterMask = this.collisionGroups[0];// | this.collisionGroups[1];
		 body.fixedRotation = true;
		 //body.angularDamping = 0.9999999;
		 body.linearDamping = 0.2;
		 body.updateMassProperties();
		 this.world.add(body); // Step 3*/

		/*if(this.debugPhysics) {
		 var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), new THREE.MeshBasicMaterial({wireframe: true}));
		 sphere.position.copy(body.position);
		 this.scene.add(sphere);
		 //this.dynamics.push(new DynamicEntity(sphere, this, body));
		 body.debugMesh = sphere;
		 }*/

		return body;
	};
	AmmoPhysics.prototype.addStaticPhysics = function(shape, mesh, position) {
		if (shape === 'box') {
			mesh.geometry.computeBoundingBox();
			var bboxmax = mesh.geometry.boundingBox.max;
			var box = new CANNON.Box(new CANNON.Vec3().copy(bboxmax));
			var body = new CANNON.Body({
				mass : 0
			});
			body.addShape(box);
			body.collisionFilterGroup = this.collisionGroups[0];
			body.collisionFilterMask = this.collisionGroups[0] | this.collisionGroups[1];
			body.position.set(position[0], position[1], position[2]);
			box.updateBoundingSphereRadius();
			this.world.add(body);
			return body;
		}
	};
	AmmoPhysics.prototype.addObjectPhysics = function(mesh, mass, position) {
		//var shape = new CANNON.Sphere( radius || 1.0 );
		mesh.geometry.computeBoundingBox();
		var len = mesh.geometry.boundingBox.max.sub(mesh.geometry.boundingBox.min);
		var sizex = Math.abs(len.x);
		var sizey = Math.abs(len.y);
		var sizez = Math.abs(len.z);
		var shape = new CANNON.Box(new CANNON.Vec3(sizex, sizey, sizez));

		var body = new CANNON.Body({
			mass : mass || 49.0
		});
		if (position === undefined)
			position = [0, 0, 0];
		body.addShape(shape);
		body.position.set(position[0], position[1], position[2]);
		body.collisionFilterGroup = this.collisionGroups[0];
		body.collisionFilterMask = this.collisionGroups[0];
		body.updateMassProperties();
		this.world.add(body);
		// Step 3

		/*if(this.debugPhysics) {
		 var mbox = new THREE.Mesh(new THREE.BoxGeometry( sizex, sizey, sizez, 1, 1, 1 ), new THREE.MeshBasicMaterial({wireframe: true}));
		 this.scene.add(mbox);
		 //this.dynamics.push(new DynamicEntity(mbox, this, body));
		 body.debugMesh = mbox;
		 }*/

		return body;
	};

	return AmmoPhysics;
}); 