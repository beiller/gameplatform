define(["lib/ammo"], function(Ammo) {	
	var temp_trans_1 = new Ammo.btTransform();
	var temp_trans_2 = new Ammo.btTransform();

	var temp_vec3_1 = new Ammo.btVector3(0,0,0);
	var temp_vec3_2 = new Ammo.btVector3(0,0,0);

	var temp_quat_1 = new Ammo.btQuaternion(0,0,0,1);
	var temp_quat_2 = new Ammo.btQuaternion(0,0,0,1);



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
		//console.log(this.body.getMotionState().getWorldTransform(temp_trans_1));
		//temp_trans_1.setIdentity();
		//var t = this.body.getWorldTransform();
		var t = this.body.getWorldTransform();
		temp_vec3_1.setValue(positionArray[0], positionArray[1], positionArray[2]);
		t.setOrigin(temp_vec3_1);
		this.body.getMotionState().setWorldTransform(this.body.getWorldTransform());
		
		//temp_trans_1.setRotation(this.body.getWorldTransform().getRotation());
		//this.body.getMotionState().setWorldTransform(temp_trans_1);
		//this.body.activate();
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
		//temp_trans_1.setIdentity();
		var t = this.body.getWorldTransform();
		//temp_trans_1.setOrigin(this.body.getWorldTransform().getOrigin());
		temp_quat_1.setValue(positionArray[0], positionArray[1], positionArray[2], positionArray[3]);
		t.setRotation(temp_quat_1);
		this.body.getMotionState().setWorldTransform(this.body.getWorldTransform());
		//this.body.getMotionState().setWorldTransform(temp_trans_1);
	};
	
	Body.prototype.applyImpulse = function(f, p) {
		temp_vec3_1.setValue(f[0], f[1], f[2]);
		this.body.applyImpulse(temp_vec3_1);
	};
	
	Body.prototype.setDamping = function(linearDamping, angularDamping) {
		this.body.setDamping(linearDamping, angularDamping);
	};

	return Body;
}); 