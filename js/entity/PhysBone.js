define(["lib/three"], function(THREE) {

	function makeDebugSphereOfChaos(scene, position, radius, color) {
        var sphere = new THREE.Mesh(
        	new THREE.SphereGeometry(radius, 12, 12), 
        	new THREE.MeshBasicMaterial({wireframe: true, depthTest: false, color: new THREE.Color(color)})
        );
        sphere.position.copy(position);
        scene.add(sphere);
	}


	function PhysBone(boneMesh, boneBody, parentBody, physEngine, character, radius) {
		this.boneMesh = boneMesh;
		this.parentBody = parentBody;
		this.character = character;
		this.body = boneBody;
		this.radius = radius / 2;

		var position = new THREE.Vector3();
	    var quaternion = new THREE.Quaternion();
	    var scale = new THREE.Vector3();
	    boneMesh.updateMatrixWorld(true);
	    boneMesh.matrixWorld.decompose(position, quaternion, scale);

		//read datas
		var childLocation = new THREE.Vector3().copy(position).add(character.armature.position);
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
		var localPositionParent = new THREE.Vector3().copy(childLocation);
		var localPositionChild = new THREE.Vector3().copy(childLocation);

		//var worldOffsetChild = new THREE.Vector3(0, 0, -this.radius).applyQuaternion(childQuaternion);
		//var worldOffsetParent = localPositionParent.applyQuaternion(parentQuaternion);
		localPositionParent.applyMatrix4(parentMatrixWorldInv);
		localPositionChild.applyMatrix4(childMatrixWorldInv);

		/*
		// I H8 MATH!
		var recalculatedParent = new THREE.Vector3().copy(localPositionParent).applyMatrix4(parentMatrixWorld);
		var recalculatedChild = new THREE.Vector3().copy(localPositionChild).applyMatrix4(childMatrixWorld);

		makeDebugSphereOfChaos(character.game.scene, recalculatedChild, 0.001, 0xFF0000);
		makeDebugSphereOfChaos(character.game.scene, recalculatedParent, 0.002, 0x00FF00);
		*/
		
		bALocalPosition = localPositionParent.toArray();
		bBLocalPosition = localPositionChild.toArray();
		this.constraint = physEngine.createConstraint("CONE", parentBody, this.body, bALocalPosition, bBLocalPosition);

	}
	PhysBone.prototype.update = function() {
		this.boneMesh.quaternion.fromArray(this.body.getQuaternion());
		//this.boneMesh.position.fromArray(this.body.getPosition());

	    if(this.debugMesh) {
	    	this.debugMesh.position.fromArray(this.body.getPosition());
	    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
	    }
	};

	return PhysBone;
});