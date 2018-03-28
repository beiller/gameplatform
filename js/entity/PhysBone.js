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
		this.options = options;

		this.parentBone = this.boneMesh.parent;

		this.localOffset = options && options.localOffset ? options.localOffset : new THREE.Vector3(0,0,0);

		if(parentBody) {
			var coords = this._get_local_coords();
			this.constraint = game.physicsWorld.createConstraint("6DOF", parentBody, this.body, coords.bALocalPosition, coords.bBLocalPosition, this.options);
		}

		this.setKinematic(this.body.getKinematic());
	}

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

		updateKinematic: function(updateDeep) {

		    if(!this.sleep) {
			    this.boneMesh.matrixWorld.decompose(p, q, s);
			    var worldOffset = o.copy(this.localOffset).applyQuaternion(q).add(p)
		        this.body.setPosition([worldOffset.x, worldOffset.y, worldOffset.z]);
		        this.body.setQuaternion([q.x, q.y, q.z, q.w]);
			    if(this.debugMesh) {
			    	this.debugMesh.position.copy(worldOffset);
			    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
			    	this.debugMesh.updateMatrixWorld();
			    }
			    //following doent exist yet?
			    //this.body.body.saveKinematicState(dt);
		    }

		    Entity.prototype.update.call(this);
		},

		updateDynamic: function(updateDeep) {
			p.fromArray(this.body.getPosition());
			q.fromArray(this.body.getQuaternion());		
			o.copy(this.localOffset).applyQuaternion(q);
			p.add(o);
			this.boneMesh.matrixWorld.compose(p, q, s);

			var bone = this.boneMesh;
			if ( bone.parent && bone.parent.isBone ) {

				bone.matrix.getInverse( bone.parent.matrixWorld );
				bone.matrix.multiply( bone.matrixWorld );

			} else {

				bone.matrix.copy( bone.matrixWorld );

			}

			bone.matrix.decompose( bone.position, bone.quaternion, p );

		    if(this.debugMesh) {
		    	this.debugMesh.position.fromArray(this.body.getPosition());
		    	this.debugMesh.quaternion.fromArray(this.body.getQuaternion());
		    }

		    Entity.prototype.update.call(this);
		}
	});
	
	/*
		One time function to do some maths and determine
		how to set up the physics locations etc. Do not run
		every frame!!!!
	 */
	PhysBone.prototype._get_local_coords = function() {
		var position = p;
	    var quaternion = q;
	    var scale = s;
	    //this.boneMesh.updateMatrixWorld(true);
	    //confirmed above is not needed
	    this.boneMesh.matrixWorld.decompose(position, quaternion, scale);

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

		if(this.game.debugPhysics && !this.jointdebug) {
			var newChildLocation = new THREE.Vector3().copy(localPositionChild).applyQuaternion(childQuaternion);
			var childWorldLocation = new THREE.Vector3().fromArray(this.body.getPosition());
			var jointWorldLocation = new THREE.Vector3().copy(childWorldLocation).add(newChildLocation);
    		this.jointdebug = makeDebugSphereOfChaos(this.game.scene, jointWorldLocation, 0.003, 0x00FF00);
    		this.game.scene.add(this.jointdebug);
    		//this.boneMesh.add(this.jointdebug);
    	}

		return {
			bALocalPosition: localPositionParent.toArray(),
			bBLocalPosition: localPositionChild.toArray(),
			bBWorldPosition: constraintPoint.toArray()
		}
	};

	return PhysBone;
});