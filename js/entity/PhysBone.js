define(["lib/three", 'entity/Entity'], function(THREE, Entity) {

	var p = new THREE.Vector3();
	var q = new THREE.Quaternion();
	var s = new THREE.Vector3(1, 1, 1);
	var o = new THREE.Vector3();

	/*
		Used for visual debugging purposes
	 */
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

	function PhysBone(boneMesh, boneBody, parentBody, parentMesh, game, options) {
		Entity.call(this, boneMesh, game);
		this.body = boneBody;
		this.boneMesh = boneMesh;
		this.parentBody = parentBody;
		this.parentMesh = parentMesh;
		this.options = options || {};

		/*this.boneMeshRestMatrix = new THREE.Matrix4().copy(this.boneMesh.matrixWorld);
		p.fromArray(this.body.getPosition());
		q.fromArray(this.body.getQuaternion());

		this.boneBodyRestMatrix = new THREE.Matrix4().compose(p, q, s);*/

		this.localOffset = options && options.localOffset ? options.localOffset : new THREE.Vector3(0,0,0);

		if(parentBody) {
			var coords = this._get_local_coords();
			this.constraint = game.physicsWorld.createConstraint("6DOF", parentBody, this.body, coords.bALocalPosition, coords.bBLocalPosition, this.options);
		}

		this.setKinematic(this.body.getKinematic());
	}

	//temp variables
	var tWorldRot1 = new THREE.Quaternion();
	var tWorldPos1 = new THREE.Vector3();
	var tVec3_1 = new THREE.Vector3();
	var tVec3_2 = new THREE.Vector3();
	var tMat4_1 = new THREE.Matrix4();

	PhysBone.prototype = Object.assign( Object.create( Entity.prototype ), {
		
		constructor: PhysBone,

		/* 
			Function used to toggle between the bone 
			copying the physics (dynamic), or the physics 
			copying the bone (kinematic)
		*/
		setKinematic: function(isKinematic) {
			this.body.setKinematic(isKinematic);
			if(isKinematic) {
				this.update = this.updateKinematic;
			} else {
				this.update = this.updateDynamic;
			}
		},

		updateKinematic: function(delta) {

		    if(!this.sleep) {
		    	/*tMat4_1.copy(this.boneMesh.matrixWorld);
				
				if ( (this.boneMesh.parent && this.boneMesh.parent.isBone) || this.parentMesh ) {
					this.boneMesh.matrix.multiply( 
						(this.boneMesh.parent || this.parentMesh).matrixWorld 
					);
				}*/

			    this.boneMesh.matrixWorld.decompose(p, q, s);
			    tWorldPos1.set(
			    	-this.localOffset.x,
			    	-this.localOffset.y,
			    	-this.localOffset.z,
			    ).applyQuaternion(q).add(p);
			    tVec3_1.fromArray(this.body.getPosition()).lerp(tWorldPos1, 0.5);
		        this.body.setPosition([tVec3_1.x, tVec3_1.y, tVec3_1.z], delta);
		        this.body.setQuaternion([q.x, q.y, q.z, q.w], delta);

		        //set velocity?
		        tVec3_2.copy(tWorldPos1).sub(tVec3_1).multiplyScalar(delta);
		        this.body.setVelocity([tVec3_2.x, tVec3_2.y, tVec3_2.z]);

			    if(this.debugMesh) {
			    	this.debugMesh.position.copy(tWorldPos1);
			    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
			    }
			    //following doent exist yet?
			    //this.body.saveKinematicState(delta);
		    }

		    Entity.prototype.update.call(this);
		},


		updateDynamic: function(delta) {
			//get the body position and rotation from physics engine
			p.fromArray(this.body.getPosition());
			q.fromArray(this.body.getQuaternion());	
			//add offset (IE half the length) if offsets dont match
			//eg for bones, we move half the length.	
			o.copy(this.localOffset).applyQuaternion(q);
			p.add(o);
			this.boneMesh.matrixWorld.compose(p, q, s);
			//translate into local space re: parent
			if ( (this.boneMesh.parent && this.boneMesh.parent.isBone) || this.parentMesh ) {
				this.boneMesh.matrix.getInverse( 
					(this.boneMesh.parent || this.parentMesh).matrixWorld 
				);
				this.boneMesh.matrix.multiply( this.boneMesh.matrixWorld );
			} else {
				this.boneMesh.matrix.copy( this.boneMesh.matrixWorld );
			}

			//Strange scaling seems to break things. Make sure armature is 1 scale?
			
			this.boneMesh.matrix.decompose( 
				this.boneMesh.position, 
				this.boneMesh.quaternion, 
				o
			);
			//this.boneMesh.quaternion.slerp(q, 0.75);

		    if(this.debugMesh) {
		    	this.debugMesh.position.fromArray(this.body.getPosition());
		    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
		    }

		    Entity.prototype.update.call(this);
		}
	});
	
	/*
		One time function to do some maths and determine
		how to set up the physics locations
	 */
	PhysBone.prototype._get_local_coords = function() {
		p.fromArray(this.body.getPosition());
		q.fromArray(this.body.getQuaternion());

	    this.boneMesh.matrixWorld.decompose(p, q, s);

	    var constraintPoint = p.add(this.parentMesh.position);

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

		/*if(this.game.debugPhysics && !this.jointdebug) {
			var newChildLocation = new THREE.Vector3().copy(localPositionChild).applyQuaternion(childQuaternion);
			var childWorldLocation = new THREE.Vector3().fromArray(this.body.getPosition());
			var jointWorldLocation = new THREE.Vector3().copy(childWorldLocation).add(newChildLocation);
    		this.jointdebug = makeDebugSphereOfChaos(this.game.scene, jointWorldLocation, 0.003, 0x00FF00);
    		this.game.scene.add(this.jointdebug);
    		//this.boneMesh.add(this.jointdebug);
    	}*/

		return {
			bALocalPosition: localPositionParent.toArray(),
			bBLocalPosition: localPositionChild.toArray(),
			bBWorldPosition: constraintPoint.toArray()
		}
	};

	return PhysBone;
});