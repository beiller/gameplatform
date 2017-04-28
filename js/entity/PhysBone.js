define(["lib/three"], function(THREE) {

	function makeDebugSphereOfChaos(scene, position, radius, color) {
        var sphere = new THREE.Mesh(
        	new THREE.SphereGeometry(radius, 12, 12), 
        	new THREE.MeshBasicMaterial({wireframe: true, depthTest: false, color: new THREE.Color(color)})
        );
        sphere.position.copy(position);
        var axisHelper = new THREE.AxisHelper( 0.2 );
		
        sphere.add(axisHelper);
        return sphere;
	}


	function PhysBone(boneMesh, boneBody, parentBody, physEngine, character, options) {
		this.boneMesh = boneMesh;
		this.parentBody = parentBody;
		this.character = character;
		this.body = boneBody;
		this.options = options;

		this.localOffset = options && options.localOffset ? options.localOffset : new THREE.Vector3(0,0,0);

		if(parentBody) {
			var coords = this._get_local_coords();
			this.constraint = physEngine.createConstraint("6DOF", parentBody, this.body, coords.bALocalPosition, coords.bBLocalPosition, this.options);
		}
	}
	PhysBone.prototype._get_local_coords = function() {
		var position = new THREE.Vector3();
	    var quaternion = new THREE.Quaternion();
	    var scale = new THREE.Vector3();
	    //this.boneMesh.updateMatrixWorld(true);
	    //confirmed above is not needed
	    this.boneMesh.matrixWorld.decompose(position, quaternion, scale);

	    var constraintPoint = new THREE.Vector3().copy(position).add(this.character.armature.position);

		//read datas
		var childLocation = new THREE.Vector3().fromArray(this.body.getPosition());
		var childQuaternion = new THREE.Quaternion().fromArray(this.body.getQuaternion());
		var parentLocation = new THREE.Vector3().fromArray(this.parentBody.getPosition());
		var parentQuaternion = new THREE.Quaternion().fromArray(this.parentBody.getQuaternion());
		var scaleVec = new THREE.Vector3(1,1,1);

		//construct matrices?
		var childMatrixWorld = new THREE.Matrix4().compose(childLocation, childQuaternion, scaleVec);
		var parentMatrixWorld = new THREE.Matrix4().compose(parentLocation, parentQuaternion, scaleVec);

		//do maths
		var parentMatrixWorldInv = new THREE.Matrix4().getInverse(parentMatrixWorld);
		var childMatrixWorldInv = new THREE.Matrix4().getInverse(childMatrixWorld);

		var localPositionParent = new THREE.Vector3().copy(constraintPoint);
		var localPositionChild = new THREE.Vector3().copy(constraintPoint);

		localPositionParent.applyMatrix4(parentMatrixWorldInv);
		localPositionChild.applyMatrix4(childMatrixWorldInv);

		if(this.character.game.debugPhysics && !this.jointdebug) {
			var newChildLocation = new THREE.Vector3().copy(localPositionChild).applyQuaternion(childQuaternion);
			var childWorldLocation = new THREE.Vector3().fromArray(this.body.getPosition());
			var jointWorldLocation = new THREE.Vector3().copy(childWorldLocation).add(newChildLocation);
    		this.jointdebug = makeDebugSphereOfChaos(this.character.game.scene, jointWorldLocation, 0.003, 0x00FF00);
    		this.character.game.scene.add(this.jointdebug);
    		//this.boneMesh.add(this.jointdebug);
    	}

		return {
			bALocalPosition: localPositionParent.toArray(),
			bBLocalPosition: localPositionChild.toArray(),
			bBWorldPosition: constraintPoint.toArray()
		}
	};


	PhysBone.prototype.update = function() {
		var p = new THREE.Vector3().fromArray(this.body.getPosition());
		var q = new THREE.Quaternion().fromArray(this.body.getQuaternion());
		var s = new THREE.Vector3(1, 1, 1);
		var o = new THREE.Vector3().copy(this.localOffset).applyQuaternion(q);
		p.add(o);

		this.boneMesh.matrixWorld.compose(p, q, s);

		var bone = this.boneMesh;
		if ( bone.parent && bone.parent.isBone ) {

			bone.matrix.getInverse( bone.parent.matrixWorld );
			bone.matrix.multiply( bone.matrixWorld );

		} else {

			bone.matrix.copy( bone.matrixWorld );

		}

		bone.matrix.decompose( bone.position, bone.quaternion, bone.scale );

		/*bone.traverse(function(b) {
			b.matrixWorldNeedsUpdate = true;
			b.updateMatrix();
			b.updateMatrixWorld(true);

		});*/


	    if(this.debugMesh) {
	    	this.debugMesh.position.fromArray(this.body.getPosition());
	    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());

			//var coords = this._get_local_coords();
			//var pos = new THREE.Vector3().fromArray(coords.bBWorldPosition);
			//this.jointdebug.position.copy(pos);//.sub(this.character.armature.position);

			//makeDebugSphereOfChaos(character.game.scene, recalculatedChild, 0.001, 0xFF0000);
			//makeDebugSphereOfChaos(character.game.scene, recalculatedParent, 0.002, 0x00FF00);
	    }
	};

	return PhysBone;
});