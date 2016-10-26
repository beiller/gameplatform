define(["lib/three"], function(THREE) {
	function PhysBoneConeTwist(attachBoneName, boneName, game, character, attachPrevJoint) {   
		this.boneMesh = character.findBone(boneName);
		this.attachBoneMesh = character.findBone(attachBoneName);
		if(attachPrevJoint) {
			this.parentLength = attachPrevJoint.boneLength;
			this.update = this._update_without_root;
		} else {
			//DO calculations of bone lengths     
	        var boneStart = new THREE.Vector3().setFromMatrixPosition( this.attachBoneMesh.matrixWorld );
	        var boneEnd = new THREE.Vector3().setFromMatrixPosition( this.boneMesh.matrixWorld );
	        this.parentLength = new THREE.Vector3().copy(boneStart).sub(boneEnd).length();
    		this.update = this._update_with_root;
		}
        var boneStart = new THREE.Vector3().setFromMatrixPosition( this.boneMesh.matrixWorld );
        if(this.boneMesh.children.length > 0) {
        	//bone size calculated by distance to first child
        	var boneEnd = new THREE.Vector3().setFromMatrixPosition( this.boneMesh.children[0].matrixWorld );
        } else {
        	/*
        	 * Calculate some default size
        	 */
		    var xAxis = new THREE.Vector3();
		    var yAxis = new THREE.Vector3();
		    var zAxis = new THREE.Vector3();
		    this.boneMesh.matrixWorld.extractBasis (xAxis, yAxis, zAxis);
        	var defaultLen = new THREE.Vector3().copy(yAxis).multiplyScalar(0.1);
        	var boneEnd = new THREE.Vector3().copy(boneStart).add(defaultLen);
        }
        this.boneLength = new THREE.Vector3().copy(boneStart).sub(boneEnd).length();
        
        //Create physical bodies
		var radius = 0.075;
        var shape = new CANNON.Sphere( radius );
        var boneBody = new CANNON.Body({
            mass: 1
        });
        boneBody.addShape(shape);
        boneBody.collisionFilterGroup = game.collisionGroups[3];
        boneBody.collisionFilterMask = game.collisionGroups[2] | game.collisionGroups[1];
        boneBody.angularDamping = 0.99999999;
        boneBody.linearDamping = 0.99;
        game.world.add(boneBody); // Step 3
        
		this.boneBody = boneBody;
		if(attachPrevJoint) {
			this.attachBoneBody = attachPrevJoint.boneBody;
		} else {
			this.attachBoneBody = new CANNON.Body({mass: 1});
		    this.attachBoneBody.position.copy(boneStart);
	   	}

		//create the joint
        var jointOptions = {
            pivotA: new CANNON.Vec3(0,0,this.boneLength/2.0),
            pivotB: new CANNON.Vec3(0,0,-this.parentLength/2.0),
            axisA: CANNON.Vec3.UNIT_Y,
            axisB: CANNON.Vec3.UNIT_Y,
            angle: 0.5,
            twistAngle: 0.5
        };
        this.constraint = new CANNON.ConeTwistConstraint(this.boneBody, this.attachBoneBody, jointOptions);		
		this.constraint.collideConnected = false;
		game.world.addConstraint(this.constraint);	
		this.character = character;
		
		/*
		//create debug meshes
		var radius = 0.05;
		var geom = new THREE.BoxGeometry(0.052, 0.052, this.boneLength);
		var mat = new THREE.MeshBasicMaterial({wireframe: true});
		this.debugMesh = new THREE.Mesh(geom, mat);
		character.game.scene.add(this.debugMesh);
		
		if(!attachPrevJoint) {
			var radius = 0.05;
			var geom = new THREE.BoxGeometry(0.052, 0.052, this.parentLength);
			var mat = new THREE.MeshBasicMaterial({wireframe: true});
			this.debugMesh2 = new THREE.Mesh(geom, mat);
			character.game.scene.add(this.debugMesh2);
		}*/

	}

	PhysBoneConeTwist.prototype._update_without_root = function() {
	    var location = new THREE.Vector3();
	    var rotation = new THREE.Quaternion();
	    var scale = new THREE.Vector3();	    
	    var q = new THREE.Quaternion().copy(this.boneBody.quaternion);
	    this.attachBoneMesh.matrixWorld.decompose(location, rotation, scale);
	    var parentToLocal = new THREE.Quaternion().copy(rotation).inverse();
	    q = parentToLocal.multiply(q);
		
	    this.boneMesh.quaternion.copy(q);

	    if(this.debugMesh) {
	    	this.debugMesh.position.copy(this.boneBody.position);
	    	this.debugMesh.quaternion.copy(this.boneBody.quaternion);
	    }
	};
	PhysBoneConeTwist.prototype._update_with_root = function() {
	    var xAxis = new THREE.Vector3();
	    var yAxis = new THREE.Vector3();
	    var zAxis = new THREE.Vector3();
	    var location = new THREE.Vector3();
	    var rotation = new THREE.Quaternion();
	    var scale = new THREE.Vector3();
	    this.attachBoneMesh.matrixWorld.extractBasis (xAxis, yAxis, zAxis);
	    this.attachBoneMesh.matrixWorld.decompose(location, rotation, scale);
	    
	    var movement = new THREE.Vector3().copy(zAxis).multiplyScalar(-this.parentLength / 2.0);
	    var npos = new THREE.Vector3().copy(location).add(movement);
	    this.attachBoneBody.position.copy(npos);
	    this.attachBoneBody.quaternion.copy(rotation);
	    
	    var q = new THREE.Quaternion().copy(this.boneBody.quaternion);
	    this.attachBoneMesh.matrixWorld.decompose(location, rotation, scale);
	    var parentToLocal = new THREE.Quaternion().copy(rotation).inverse();
	    q = parentToLocal.multiply(q);
		
	    this.boneMesh.quaternion.copy(q);

	    if(this.debugMesh) {
	    	this.debugMesh.position.copy(this.boneBody.position);
	    	this.debugMesh.quaternion.copy(this.boneBody.quaternion);

	    	this.debugMesh2.position.copy(this.attachBoneBody.position);
	    	this.debugMesh2.quaternion.copy(this.attachBoneBody.quaternion);
	    }
	};

	return PhysBoneConeTwist;
});