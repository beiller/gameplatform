define(["lib/three", "lib/ammo"], function(THREE, Ammo) {
	function PhysBone(boneMesh, boneBody, parentBody, physEngine, character, radius) {
		this.boneMesh = boneMesh;
		this.parentBody = parentBody;
		this.character = character;
		this.body = boneBody;

		var worldPositionBone = new THREE.Vector3().fromArray(this.body.getPosition());
		var worldPositionParent = new THREE.Vector3().fromArray(this.parentBody.getPosition());
		var localPositionParent = new THREE.Vector3().copy(worldPositionBone).sub(worldPositionParent);
		var parentQuaternion = new THREE.Quaternion().fromArray(this.parentBody.getQuaternion());
		localPositionParent.applyQuaternion(parentQuaternion);
		bALocalPosition = [localPositionParent.x, localPositionParent.y, localPositionParent.z];

		var bBLocalPosition = new THREE.Vector3(0, -radius, 0);
		//var childQuaternion = new THREE.Quaternion().fromArray(this.body.getQuaternion());
		//bBLocalPosition.applyQuaternion(childQuaternion);
		var bBLocalPosition = [bBLocalPosition.x, bBLocalPosition.y, bBLocalPosition.z];
		this.constraint = physEngine.createConstraint("BALL", parentBody, this.body, bALocalPosition, bBLocalPosition);

		console.log({
			parent: worldPositionParent,
			child: worldPositionBone,
			localParent: localPositionParent,
			localChild: new THREE.Vector3(0, -radius, 0)
		});
		
	}
	PhysBone.prototype.update = function() {

		var boneQuat = new THREE.Quaternion(			
			this.body.getQuaternionX(),
			this.body.getQuaternionY(),
			this.body.getQuaternionZ(),
			this.body.getQuaternionW()
		);

		this.boneMesh.quaternion.copy(boneQuat);

	    if(this.debugMesh) {
	    	this.debugMesh.position.fromArray(this.body.getPosition());
	    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
	    }
	};

	return PhysBone;
});