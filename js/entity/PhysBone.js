define(["lib/three"], function(THREE) {
	function PhysBone(attachBoneName, boneName, boneMesh, boneBody, world, character) {
		this.boneBody = boneBody;
		this.boneMesh = boneMesh;
		this.effectScale = 1;
		this.boneBody.angularDamping = 0.999;
        this.boneBody.linearDamping = 0.999;
		//create an empty body which attaches to our bone
		this.attachBoneBody = new CANNON.Body({
            mass: 1
        });
        this.restPosition = new THREE.Vector3().copy(this.boneMesh.position);
	    this.attachBoneBody.position.copy(
	    	this.boneMesh.position
	    );
		this.constraint = new CANNON.DistanceConstraint(this.boneBody, this.attachBoneBody, 0.01, 1);
		this.constraint.collideConnected = false;
		world.addConstraint(this.constraint);	
		this.character = character;
	}
	PhysBone.prototype.setBoneFromBody = function() {
		var vector = new THREE.Vector3().setFromMatrixPosition(this.boneMesh.matrixWorld);
		var invMatrix = new THREE.Matrix4().getInverse(new THREE.Matrix4().extractRotation(this.boneMesh.matrixWorld));
		var v1 = new THREE.Vector3().copy(vector);
		var v2 = new THREE.Vector3().copy(this.boneBody.position);
		v1.applyMatrix4(invMatrix);
		v2.applyMatrix4(invMatrix);
	    var p = new THREE.Vector3().copy(v2).sub(v1);
	    p.multiplyScalar(this.effectScale);
	    p.add(this.restPosition);
	    this.boneMesh.position.copy(p);
	};
	PhysBone.prototype.update = function() {
        //this is how we update the fake body
	    this.boneMesh.position.copy(this.restPosition);
	    this.boneMesh.updateMatrixWorld(true);
	    var vector = new THREE.Vector3().setFromMatrixPosition(this.boneMesh.matrixWorld);
	    this.attachBoneBody.position.copy(vector);
	    this.setBoneFromBody();
	    if(this.debugMesh) {
	    	this.debugMesh.position.copy(this.boneBody.position);
	    	this.debugMesh.quaternion.copy(this.boneBody.quaternion);
	    }
	};

	return PhysBone;
});