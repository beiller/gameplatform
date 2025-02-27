define(["lib/three"], function(THREE) {

	var p = new THREE.Vector3();
	var q = new THREE.Quaternion();
	var s = new THREE.Vector3(1, 1, 1);
	var o = new THREE.Vector3();

	function PhysRig(character, game) {
		this.game = game;
		this.character = character;

		
		this.constraints = [];
		this.physicMap = {};
		this.dynamics = [];
		this.boxSize = 0.025;
	}

	PhysRig.prototype = Object.assign( PhysRig, {

		constructor: PhysRig,

		update: function(delta) {

		},

		_doPhysDebug: function(physBone, radius, options) {
			if(!options) {
				options = {};
			}
			if(physBone.localOffset) {
				radius = physBone.localOffset.z;
			}
	        var sphere = new THREE.Mesh(
	        	//new THREE.SphereGeometry(radius, 12, 12), 
	        	new THREE.BoxGeometry(options.boxWidth*2 || this.boxSize*2, options.boxDepth*2 || this.boxDepth*2, radius*2),
	        	new THREE.MeshBasicMaterial({wireframe: true, depthTest: false, color: new THREE.Color(0xFF0000)})
	        );
	        
	        var axisHelper = new THREE.AxisHelper( 0.2 );
		
	    	sphere.add(axisHelper);
	    	this.game.scene.add(sphere);
	        physBone.debugMesh = sphere;
		},

		createFromMap: function(boneMap) {
			var character = this.character;
			var scope = this;
			boneMap.forEach(function(e) {
				//DEBUG!!!!
				//e.type = "DYNAMIC";
				//END DEBUG!!!!
				if(e.bone) e.bone = character.findBone(e.bone); 
				if(e.options && e.options.tailBone) e.options.tailBone = character.findBone(e.options.tailBone);
				try{
					scope.createPhysic(e, character.armature);
				} catch(e) {
					console.error(e);
				}
			});
		},

		deletePhysic: function(physBone) {
			this.dynamics = this.dynamics.filter(e => e != physBone);
			this.game.physicsWorld.removeConstraint(physBone.constraint);
			this.game.physicsWorld.removeBody(physBone.body);
		},

		deletePhysItem: function(mesh) {
			/*
				Given a mesh (clothing/hair/etc) that
				has dynamic bones, destroy that items
				dynamic bones (unequip for example)
			*/
			if(mesh.id in this.physicMap) {
				for(var boneName in this.physicMap[mesh.id]) {
					var physBone = this.physicMap[mesh.id][boneName];
					if(physBone.debugMesh) {
						this.game.scene.remove(physBone.debugMesh);
					}
					this.deletePhysic(physBone);
				}
			}
			this.physicMap[mesh.id] = null;
			delete this.physicMap[mesh.id];
		},

		createPhysic: function(physicInfo, parentMesh) {
			var globalBoneMap = this.physicMap;
			var physBone = null;
			if(!(parentMesh.id in globalBoneMap)) {
				globalBoneMap[parentMesh.id] = {};
			}

			if(physicInfo.type == "KINEMATIC" && physicInfo.options.moveTo) {
				console.log("Attaching a magic bone to mesh id: ", this.character.armature.id);
				//globalBoneMap[parentMesh.id][physicInfo.bone.name] = globalBoneMap[this.character.armature.id][physicInfo.options.moveTo];
				return globalBoneMap[this.character.armature.id][physicInfo.options.moveTo]
			}

			var connectBody = { body: null };
			//set the connect body, to create a constraint
			if("connect_body" in physicInfo) {
				if(physicInfo.connect_body in globalBoneMap[parentMesh.id]) {
					connectBody = globalBoneMap[parentMesh.id][physicInfo.connect_body];
				} else if(physicInfo.connect_body in globalBoneMap[this.character.armature.id]) {
					connectBody = globalBoneMap[this.character.armature.id][physicInfo.connect_body];
				} else {
					console.log("Cannot find bone!", physicInfo.connect_body, globalBoneMap[parentMesh.id])
					//throw "Cannot find bone!";
				}
			}
			physicInfo.options.kinematic = physicInfo.type == "KINEMATIC";
			physicInfo.options.boxWidth = physicInfo.options.boxWidth || this.boxSize;
			physicInfo.options.boxDepth = physicInfo.options.boxDepth || this.boxSize;
			physBone = this.game.physicsWorld.createPhysBone(
				physicInfo.bone, 
				connectBody.body, 
				parentMesh,
				physicInfo.radius, 
				physicInfo.options,
				this.game,
				physicInfo.type == "KINEMATIC"
			);
			this.dynamics.push(physBone);

			globalBoneMap[parentMesh.id][physicInfo.bone.name] = physBone;

			if(this.game.debugPhysics) {
				this._doPhysDebug(physBone, physicInfo.radius, physicInfo.options);
			}

			return physBone;
		}

	});

	return PhysRig;
});