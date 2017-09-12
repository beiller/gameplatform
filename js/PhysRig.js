define(["lib/three"], function(THREE) {

	var p = new THREE.Vector3();
	var q = new THREE.Quaternion();
	var s = new THREE.Vector3(1, 1, 1);
	var o = new THREE.Vector3();

	function PhysRig(armature, physicsWorld) {
		this.physicsWorld = physicsWorld;
		this.armature = armature;

		this.physBones = [];
		this.constraints = [];
	}

	PhysRig.prototype = Object.assign( Object.create(), {
		constructor: PhysRig,

		update: function(delta) {

		}
	});

	PhysRig.prototype._doPhysDebug = function(physBone, radius, options) {
		if(!options) {
			options = {};
		}
		if(physBone.localOffset) {
			radius = physBone.localOffset.z;
		}
        var sphere = new THREE.Mesh(
        	//new THREE.SphereGeometry(radius, 12, 12), 
        	new THREE.BoxGeometry(options.boxWidth || 0.02, options.boxDepth || 0.02, radius*2),
        	new THREE.MeshBasicMaterial({wireframe: true, depthTest: false, color: new THREE.Color(0xFF0000)})
        );
        
        var axisHelper = new THREE.AxisHelper( 0.2 );
	
    	sphere.add(axisHelper);
    	scope.scene.add(sphere);
        physBone.debugMesh = sphere;
	};

	PhysRig.prototype.createPhysic = function(physicInfo, parentMesh) {
		var scope = this.game;
		var globalBoneMap = this.physicMap;
		var physBone = null;
		if(!(parentMesh.id in globalBoneMap)) {
			globalBoneMap[parentMesh.id] = {};
		}
		switch(physicInfo.type) {
			case "KINEMATIC":
				physBone = this.game.physicsWorld.createCollisionBone(
					physicInfo.bone, 
					parentMesh,
					physicInfo.radius,
					physicInfo.options,
					this.game
				);
				//this.add(physBone);
				this.dynamics.push(physBone);
				break;
			case "DYNAMIC":
				var connectBody = null;
				if("connect_body" in physicInfo) {
					if(physicInfo.connect_body in globalBoneMap[parentMesh.id]) {
						connectBody = globalBoneMap[parentMesh.id][physicInfo.connect_body];
					} else if(physicInfo.connect_body in globalBoneMap[this.armature.id]) {
						connectBody = globalBoneMap[this.armature.id][physicInfo.connect_body];
					} else {
						console.log("Cannot find bone!", physicInfo.connect_body, globalBoneMap[parentMesh.id])
						//throw "Cannot find bone!";
					}
				} else {
					connectBody = {body: null};
				}
				physBone = this.game.physicsWorld.createPhysBone(
					physicInfo.bone, 
					connectBody.body, 
					parentMesh,
					physicInfo.radius, 
					physicInfo.options,
					this.game
				);
				this.dynamics.push(physBone);
				/*
				if(connectBody.body !== null) {
					connectBody.add(physBone);
				} else {
					this.add(physBone);
				}
				//this.staticBones.push(physBone);*/
				break;
		}
		globalBoneMap[parentMesh.id][physicInfo.bone.name] = physBone;

		if(this.game.debugPhysics) {
			this._doPhysDebug(physBone, physicInfo.radius, physicInfo.options);
		}
	};



	return PhysRig;
});