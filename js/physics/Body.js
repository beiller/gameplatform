define(["lib/ammo"], function(Ammo) {	
	var temp_trans_1 = new Ammo.btTransform();
	var temp_trans_2 = new Ammo.btTransform();

	var temp_vec3_1 = new Ammo.btVector3(0,0,0);
	var temp_vec3_2 = new Ammo.btVector3(0,0,0);

	var temp_quat_1 = new Ammo.btQuaternion(0,0,0,1);
	var temp_quat_2 = new Ammo.btQuaternion(0,0,0,1);

	var collisionFlags = { 
		CF_STATIC_OBJECT: 1, 
		CF_KINEMATIC_OBJECT: 2, 
		CF_NO_CONTACT_RESPONSE: 4, 
		CF_CUSTOM_MATERIAL_CALLBACK: 8, 
		CF_CHARACTER_OBJECT: 16, 
		CF_DISABLE_VISUALIZE_OBJECT: 32, 
		CF_DISABLE_SPU_COLLISION_PROCESSING: 64 
	};

	var body_map = new Map();

	function Body(bodyInfo, shapeInfo) {
		this.bodyInfo = bodyInfo;
		this.shapeInfo = shapeInfo;
		this.collisionFlags = [];

		this.shape = this.createShape(this.shapeInfo);
		this.mass = this.bodyInfo.mass;

		this.body = this.localCreateRigidBody(
			this.bodyInfo.mass, 
			this.bodyInfo.transform, 
			this.shape, 
			this.bodyInfo.options
		);

		this.setNoContact(this.bodyInfo.noContact && true);
		this.setStatic(this.bodyInfo.staticObject && true);
		this.setKinematic(this.bodyInfo.kinematic && true);

		body_map[this.body.ptr] = this;
		this.setDamping(this.bodyInfo.damping || 0.7, this.bodyInfo.damping || 0.7);
	}

	Body.prototype = {
		/*
			General purpose flag manipulators
		*/
		_writeFlags: function() {
			var flagToSet = 0
			this.collisionFlags.forEach(function(e) { flagToSet |= e; });
			this.body.setCollisionFlags(flagToSet);
		},
		_setFlag: function(flag, value) {
			if(value && !(this.collisionFlags.indexOf(flag) > -1)) {
				this.collisionFlags.push(flag);
				this._writeFlags();
			}
			if(!value && (this.collisionFlags.indexOf(flag) > -1)) {
				this.collisionFlags = this.collisionFlags.filter(function(item) { 
				    return item !== flag;
				});
				this._writeFlags();
			}
		},
		_getFlag: function(flag) {
			return this.collisionFlags.indexOf(flag) > -1;
		},

		/*
			Flag Setters
		*/
		setKinematic: function(isKinematic) {
			this._setFlag(collisionFlags.CF_KINEMATIC_OBJECT, isKinematic);
			temp_vec3_1.setValue(0,0,0);
			if(isKinematic) {
				this.body.setLinearVelocity(temp_vec3_1);
				this.body.setAngularVelocity(temp_vec3_1);
				//this.body.getCollisionShape().calculateLocalInertia( this.mass, temp_vec3_1 );
				this.body.setMassProps(0, temp_vec3_1);

			} else {
				this.body.getCollisionShape().calculateLocalInertia( this.mass, temp_vec3_1 );
				this.body.setMassProps(this.mass, temp_vec3_1);
			}
		},
		setNoContact: function(isNoContact) {
			this._setFlag(collisionFlags.CF_NO_CONTACT_RESPONSE, isNoContact);
		},
		setStatic: function(isStatic) {
			this._setFlag(collisionFlags.CF_STATIC_OBJECT, isStatic);
		},

		/*
			Flag Getters
		*/
		getKinematic: function() {
			return this._getFlag(collisionFlags.CF_KINEMATIC_OBJECT);
		},
		getNoContact: function(isNoContact) {
			return this._getFlag(collisionFlags.CF_NO_CONTACT_RESPONSE);
		},
		getStatic: function(isStatic) {
			return this._getFlag(collisionFlags.CF_STATIC_OBJECT);
		},

		/*
			Various getting and setting of physics state
		*/
		getPosition: function() {
			var l = this.body.getWorldTransform().getOrigin();
			return [l.x(), l.y(), l.z()];
		},
		getPositionX: function() { return this.body.getWorldTransform().getOrigin().x(); },
		getPositionY: function() { return this.body.getWorldTransform().getOrigin().y(); },
		getPositionZ: function() { return this.body.getWorldTransform().getOrigin().z(); },
		setPosition: function(positionArray, dT) {
			//console.log(this.body.getMotionState().getWorldTransform(temp_trans_1));
			//temp_trans_1.setIdentity();
			var t = this.body.getWorldTransform();
			//var t = this.body.getWorldTransform();
			temp_vec3_1.setValue(positionArray[0], positionArray[1], positionArray[2]);
			t.setOrigin(temp_vec3_1);
			this.body.getMotionState().setWorldTransform(t);
			//this.body.saveKinematicState(dT || 0.01);
			
			//temp_trans_1.setRotation(this.body.getWorldTransform().getRotation());
			//this.body.getMotionState().setWorldTransform(temp_trans_1);
			//this.body.activate();
		},
		
		getVelocity: function() {
			var l = this.body.getLinearVelocity();
			return [l.x(), l.y(), l.z()];
		},
		getVelocityX: function() { return this.body.getLinearVelocity().x(); },
		getVelocityY: function() { return this.body.getLinearVelocity().y(); },
		getVelocityZ: function() { return this.body.getLinearVelocity().z(); },
		setVelocity: function(linearVelocity, angularVelocity) {
			temp_vec3_1.setValue(linearVelocity[0], linearVelocity[1], linearVelocity[2]);
			this.body.setLinearVelocity(temp_vec3_1);
			if(angularVelocity) {
				temp_vec3_1.setValue(angularVelocity[0], angularVelocity[1], angularVelocity[2]);
				this.body.setLinearVelocity(temp_vec3_1);
			}
		},
		
		getQuaternion: function() {
			var q = this.body.getWorldTransform().getRotation();
			return [q.x(), q.y(), q.z(), q.w()];
		},
		getQuaternionX: function() { return this.body.getWorldTransform().getRotation().x(); },
		getQuaternionY: function() { return this.body.getWorldTransform().getRotation().y(); },	
		getQuaternionZ: function() { return this.body.getWorldTransform().getRotation().z(); },	
		getQuaternionW: function() { return this.body.getWorldTransform().getRotation().w(); },	
		setQuaternion: function(positionArray, dT) {
			//temp_trans_1.setIdentity();
			var t = this.body.getWorldTransform();
			//temp_trans_1.setOrigin(this.body.getWorldTransform().getOrigin());
			temp_quat_1.setValue(positionArray[0], positionArray[1], positionArray[2], positionArray[3]);
			t.setRotation(temp_quat_1);
			this.body.getMotionState().setWorldTransform(t);
			//this.body.getMotionState().setWorldTransform(temp_trans_1);
			//this.body.saveKinematicState(dT || 0.01);
		},
		
		applyImpulse: function(f, p) {
			temp_vec3_1.setValue(f[0], f[1], f[2]);
			this.body.applyImpulse(temp_vec3_1);
		},
		
		setDamping: function(linearDamping, angularDamping) {
			this.body.setDamping(linearDamping, angularDamping);
		}
	};
	Body.prototype.createShape = function(shapeInfo) {
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
	Body.prototype.localCreateRigidBody = function(mass, startTransform, shape, options, layers, mask) {
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

	Body.getByBody = function(engineBody) {
		return body_map[engineBody.ptr];
	};

	return Body;
}); 