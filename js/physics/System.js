define([
	"lib/ammo", "lib/three", "entity/DynamicEntity", "entity/PhysBone", "physics/Body"
], function(
	Ammo, THREE, DynamicEntity, PhysBone, Body
) {	
	var temp_trans_1 = new Ammo.btTransform();
	var temp_trans_2 = new Ammo.btTransform();

	var temp_vec3_1 = new Ammo.btVector3(0,0,0);
	var temp_vec3_2 = new Ammo.btVector3(0,0,0);

	var temp_quat_1 = new Ammo.btQuaternion(0,0,0,1);
	var temp_quat_2 = new Ammo.btQuaternion(0,0,0,1);

	var p = new THREE.Vector3();
	var q = new THREE.Quaternion();
	var r = new THREE.Vector3();
	var s = new THREE.Vector3(1, 1, 1);
	var o = new THREE.Vector3();

	var tWorldRot1 = new THREE.Quaternion();
	var tWorldPos1 = new THREE.Vector3();

	function System(game) {
		this.constraints = [];
		this.dynamics = [];
		this.game = game;
	}

	System.prototype = {
		createDebugMesh: function(body) {
	        var sphere = new THREE.Mesh(
	        	//new THREE.SphereGeometry(radius, 12, 12), 
	        	new THREE.BoxGeometry(body.shapeInfo.x*2, body.shapeInfo.y*2, body.shapeInfo.z*2),
	        	new THREE.MeshStandardMaterial({
	        		depthTest: false, 
	        		depthWrite: false,
	        		color: new THREE.Color(0xFF0000)
	        	})
	        );
	        sphere.renderOrder = 9999;
	        
	        var axesHelper = new THREE.AxesHelper( 0.2 );
		
	    	sphere.add(axesHelper);
	    	//sphere.position.fromArray(body.getPosition());
	    	//sphere.quaternion.fromArray(body.getQuaternion());
	    	this.game.scene.add(sphere);
	    	return sphere
		},
		createFromMap: function(systemMap, skeleton) {
			var nameMapping = {
				"pel": "NPC Pelvis [Pelv]",
				"sp1": "NPC Spine [Spn0]",
				"sp2": "NPC Spine1 [Spn1]",
				"sp3": "NPC Spine2 [Spn2]",
				"sp4": "",
				"sp5": "NPC Neck [Neck]",
				"hed": "NPC Head [Head]",
				"clv": "NPC Clavicle [Clv].{LR}",
				"am1": "NPC UpperArm [Uar].{LR}",
				"am2": "NPC Forearm [Lar].{LR}",
				"hnd": "NPC Hand [Hnd].{LR}",
				"lg1": "NPC Thigh [Thg].{LR}",
				"lg2": "NPC Calf [Clf].{LR}",
				"fot": "NPC Foot [ft ].{LR}"
			}
			var np = function(k, side) { 
				if(side) {
					return nameMapping[k].replace('{LR}', side);
				}
				return nameMapping[k]; 
			};
			var bW = 0.015;
			var bH = 0.015;

			var boneData = [
				{ name: np('pel'), length: 0.15, width: bW, height: bH, kinematic: true },
				{ name: np('sp1'), width: bW, height: bH, child: np('sp2'), kinematic: true },
				{ name: np('sp2'), width: bW, height: bH, child: np('sp3'), kinematic: false },
				{ name: np('sp3'), width: bW, height: bH, child: np('sp5'), kinematic: false },
				{ name: np('sp5'), width: bW, height: bH, child: np('hed'), kinematic: false },
				{ name: np('hed'), length: 0.15, width: bW, height: bH, kinematic: false },
				{ name: np('clv', 'L'), width: bW, height: bH, child: np('am1', 'L') },
				{ name: np('clv', 'R'), width: bW, height: bH, child: np('am1', 'R') },
				{ name: np('am1', 'L'), width: bW, height: bH, child: np('am2', 'L') },
				{ name: np('am1', 'R'), width: bW, height: bH, child: np('am2', 'R') },
				{ name: np('am2', 'L'), width: bW, height: bH, child: np('hnd', 'L') },
				{ name: np('am2', 'R'), width: bW, height: bH, child: np('hnd', 'R') },
				{ name: np('hnd', 'L'), length: 0.15, width: bW, height: bH },
				{ name: np('hnd', 'R'), length: 0.15, width: bW, height: bH },
				{ name: np('lg1', 'L'), width: bW, height: bH, child: np('lg2', 'L') },
				{ name: np('lg1', 'R'), width: bW, height: bH, child: np('lg2', 'R') },
				{ name: np('lg2', 'L'), width: bW, height: bH, child: np('fot', 'L') },
				{ name: np('lg2', 'R'), width: bW, height: bH, child: np('fot', 'R') },
				{ name: np('fot', 'L'), length: 0.15, width: bW, height: bH, },
				{ name: np('fot', 'R'), length: 0.15, width: bW, height: bH, }
			];

			let mVec3_1 = new THREE.Vector3();
			let mVec3_2 = new THREE.Vector3();
			function calcLength(skeleton, boneName1, boneName2) {
				let bone1 = skeleton.getBoneByName(boneName1).matrixWorld.decompose(mVec3_1, q, r);
				let bone2 = skeleton.getBoneByName(boneName2).matrixWorld.decompose(mVec3_2, q, r);
				return mVec3_1.sub(mVec3_2).length();
			}

			skeleton.pose();
			skeleton.bones[0].updateMatrixWorld(true);

			for(let i = 0; i < boneData.length; i++) {
				let entry = boneData[i];
				if(entry.child) {
					entry.length = calcLength(skeleton, entry.name, entry.child);
				} else {
					entry.length = entry.length || 0.2;
				}
				
				let bodyInfo = {
					mass: 0.1,
					kinematic: entry.kinematic || false,
					damping: entry.damping || 0.5,
					noContact: false,
					staticObject: false,
				};
				let shapeInfo = {
					type: "box",
					z: entry.length / 2.0 || 0.2,
					x: entry.width || 0.05,
					y: entry.height || 0.05
				};
				let boneBody = new Body(bodyInfo, shapeInfo);
				let bone = skeleton.getBoneByName(entry.name);
				bone.matrixWorld.decompose(p, q, r);

				//translate via Z axis half the length
				let xLat = new THREE.Vector3(0, 0, -(entry.length / 2.0));
				xLat.applyQuaternion(q);
				boneBody.setPosition([p.x + xLat.x, p.y + xLat.y, p.z + xLat.z]);
				boneBody.setQuaternion([q.x, q.y, q.z, q.w]);
				
				//let dE = new DynamicEntity(bone, this.game, boneBody);
				//dE.localOffset = xLat;

				//boneMesh, boneBody, parentBody, parentMesh, game, options
				let dE = new PhysBone(bone, boneBody, null, null, this.game, {
					localOffset: new THREE.Vector3(0, 0, -(entry.length / 2.0))
				});

				dE.debugMesh = this.createDebugMesh(boneBody);
				this.dynamics.push(dE);
				let pW = this.game.physicsWorld;
				pW.addBody(boneBody, pW.collisionLayers.WORLD, pW.collisionLayers.WORLD);
			}
		}
	};

	return System;
}); 