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
	    this.attachBoneMesh = character.findBone(attachBoneName);
	    var distance = 0.01;
	    var max_force = 1.0;
		this.constraint = new CANNON.DistanceConstraint(this.boneBody, this.attachBoneBody, distance, max_force);
		this.constraint.collideConnected = false;
		world.addConstraint(this.constraint);	
		this.character = character;
		
		/*var radius = 0.15;
		var geom = new THREE.SphereGeometry(radius);
		var mat = new THREE.MeshBasicMaterial({wireframe: true});
		this.debugMesh = new THREE.Mesh(geom, mat);
		character.game.scene.add(this.debugMesh);*/
	}
	PhysBone.prototype.setBoneFromBody = function() {
		var pos = new THREE.Vector3().copy(this.boneBody.position);
		var invMatrix = new THREE.Matrix4().getInverse(this.attachBoneMesh.matrixWorld);
		pos.applyMatrix4(invMatrix);
	    this.boneMesh.position.copy(pos);
	};
	PhysBone.prototype.update = function() {
		//this is how we update the fake body
	    this.boneMesh.position.copy(this.restPosition);
	    this.boneMesh.updateMatrixWorld(true);
	    this.attachBoneBody.position.copy(new THREE.Vector3().setFromMatrixPosition(this.boneMesh.matrixWorld));
	    this.setBoneFromBody();
	    if(this.debugMesh) {
	    	this.debugMesh.position.copy(this.boneBody.position);
	    	this.debugMesh.quaternion.copy(this.boneBody.quaternion);
	    }
	};

	return PhysBone;
});