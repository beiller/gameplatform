define(["lib/three"], function(THREE) {
	function PhysBoneConeTwist(attachBoneName, boneName, boneMesh, boneBody, world, character) {
		this.boneBody = boneBody;
		this.boneMesh = boneMesh;
		this.effectScale = 1;
		this.boneBody.angularDamping = 0.999;
        //this.boneBody.linearDamping = 0.999;
		//create an empty body which attaches to our bone
		this.attachBoneBody = new CANNON.Body({
            mass: 1
        });
        this.restPosition = new THREE.Vector3().copy(this.boneMesh.position);
        this.restQuaternion = new THREE.Quaternion().copy(this.boneMesh.quaternion);
	    
	    var xAxis = new THREE.Vector3();
	    var yAxis = new THREE.Vector3();
	    var zAxis = new THREE.Vector3();
	    this.boneMesh.matrixWorld.extractBasis (xAxis, yAxis, zAxis);
        this.boneStart = new THREE.Vector3().setFromMatrixPosition( this.boneMesh.matrixWorld );
        if(this.boneMesh.children.length > 0) {
        	this.boneEnd = new THREE.Vector3().setFromMatrixPosition( this.boneMesh.children[0].matrixWorld );
        } else {
        	var defaultLen = new THREE.Vector3().copy(yAxis).multiplyScalar(0.1);
        	this.boneEnd = new THREE.Vector3().copy(boneStart).add(defaultLen);
        }
        
        var len = new THREE.Vector3().copy(this.boneStart).sub(this.boneEnd);
        var vlen = len.length();
        
	    this.attachBoneBody.position.copy(
	    	this.boneStart
	    );
	    
	    
		//this.constraint = new CANNON.DistanceConstraint(this.boneBody, this.attachBoneBody, 0.01, 1);
        // Neck joint
        var offset1 = new THREE.Vector3().copy(yAxis).multiplyScalar(0.0000001);
        var offset2 = new THREE.Vector3().copy(yAxis).multiplyScalar(-vlen);
        var jointOptions = {
            pivotA: new CANNON.Vec3().copy(offset1),
            pivotB: new CANNON.Vec3().copy(offset2),
            axisA: CANNON.Vec3.UNIT_Y,
            axisB: CANNON.Vec3.UNIT_Y,
            angle: 1
            //twistAngle: twistAngle
        };
        this.constraint = new CANNON.ConeTwistConstraint(this.boneBody, this.attachBoneBody, jointOptions);		
		this.constraint.collideConnected = false;
		world.addConstraint(this.constraint);	
		this.character = character;
		var radius = 0.05;
		var geom = new THREE.BoxGeometry(0.07, 0.07, vlen);
		var mat = new THREE.MeshBasicMaterial({wireframe: true});
		this.debugMesh = new THREE.Mesh(geom, mat);
		character.game.scene.add(this.debugMesh);
		console.log(boneMesh);
	}
	PhysBoneConeTwist.prototype.setBoneFromBody = function() {
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
	PhysBoneConeTwist.prototype.update = function() {
        //this is how we update the fake body
	    this.boneMesh.position.copy(this.restPosition);
	    this.boneMesh.quaternion.copy(this.restQuaternion);
	    this.boneMesh.updateMatrixWorld(true);
	    var xAxis = new THREE.Vector3();
	    var yAxis = new THREE.Vector3();
	    var zAxis = new THREE.Vector3();
	    var location = new THREE.Vector3();
	    var rotation = new THREE.Quaternion();
	    var scale = new THREE.Vector3();
	    this.boneMesh.matrixWorld.extractBasis (xAxis, yAxis, zAxis);
	    this.boneMesh.matrixWorld.decompose(location, rotation, scale);
	    
	    
	    this.attachBoneBody.position.copy(location);
	    this.attachBoneBody.quaternion.copy(rotation);
	    //this.setBoneFromBody();
	    var q = new THREE.Quaternion().copy(this.boneBody.quaternion);
	    this.boneMesh.matrixWorld.decompose(location, rotation, scale);
	    rotation = rotation.inverse();
	    q = q.multiply(rotation);
	    //this.boneMesh.quaternion.set(q.y, q.z, q.x, q.w);
	    this.boneMesh.quaternion.copy(q);
	    //var e = new THREE.Euler().setFromQuaternion(q);
	    //this.boneMesh.rotation.x = this.boneBody.quaternion.x;
	    if(this.debugMesh) {
	    	this.debugMesh.position.copy(this.boneBody.position);
	    	this.debugMesh.quaternion.copy(this.boneBody.quaternion);
	    }
	    this.boneMesh.updateMatrixWorld(true);
	};

	return PhysBoneConeTwist;
});