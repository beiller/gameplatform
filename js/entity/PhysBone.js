define(["lib/three"], function(THREE) {
	function PhysBone(attachBoneName, boneName, boneMesh, boneBody, physEngine, character) {
		this.boneBody = boneBody;
		this.boneMesh = boneMesh;
		this.effectScale = 1;
		this.boneBody.setDamping(0.9, 0.9);		

        this.restPosition = new THREE.Vector3().copy(this.boneMesh.position);
	    this.attachBoneMesh = character.findBone(attachBoneName);
	    var distance = 0.01;
	    var max_force = 1.0;
	    var worldPosition = [this.boneMesh.position.x, this.boneMesh.position.y, this.boneMesh.position.z];
		this.constraint = physEngine.createSpring(this.boneBody, character.body, distance, max_force, worldPosition);
		this.character = character;
		
		/*var radius = 0.15;
		var geom = new THREE.SphereGeometry(radius);
		var mat = new THREE.MeshBasicMaterial({wireframe: true});
		this.debugMesh = new THREE.Mesh(geom, mat);
		character.game.scene.add(this.debugMesh);*/
	}
	PhysBone.prototype.setBoneFromBody = function() {
		var pos = new THREE.Vector3().fromArray(this.boneBody.getPosition());
		var invMatrix = new THREE.Matrix4().getInverse(this.attachBoneMesh.matrixWorld);
		pos.applyMatrix4(invMatrix);
	    this.boneMesh.position.copy(pos);
	};
	PhysBone.prototype.update = function() {
		//this is how we update the fake body
	    this.boneMesh.position.copy(this.restPosition);
	    this.boneMesh.updateMatrixWorld(true);
	    var position = new THREE.Vector3().setFromMatrixPosition(this.boneMesh.matrixWorld);
	    this.constraint.updateSpringPosition([position.x, position.y, position.z]);
	    this.setBoneFromBody();
	    if(this.debugMesh) {
	    	this.debugMesh.position.fromArray(this.boneBody.getPosition());
	    	this.debugMesh.quaternion.fromArray(this.boneBody.getQuaternion());
	    }
	};

	return PhysBone;
});