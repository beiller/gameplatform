define([
	"lib/ammo", "lib/three", "entity/DynamicEntity", "entity/PhysBone", "physics/Body"
], function(
	Ammo, THREE, DynamicEntity, PhysBone, Body
) {	

	function makeDebugSphereOfChaos(scene, position, radius, color) {
        var sphere = new THREE.Mesh(
        	new THREE.SphereGeometry(radius, 12, 12), 
    		new THREE.MeshStandardMaterial({
        		depthTest: false, 
        		depthWrite: false, wireframe: true,
        		color: new THREE.Color(0xFF0000)
        	})
        );
        sphere.position.copy(position);
        var axisHelper = new THREE.AxisHelper( 0.2 );
		
        sphere.add(axisHelper);
        return sphere;
	}
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
		_get_local_coords: function(parentBody, body, parentMesh, boneMesh) {
			p.fromArray(body.getPosition());
			q.fromArray(body.getQuaternion());

		    boneMesh.matrixWorld.decompose(p, q, s);

			//read datas
			var childLocation = new THREE.Vector3().fromArray(body.getPosition());
			var childQuaternion = new THREE.Quaternion().fromArray(body.getQuaternion());
			var parentLocation = new THREE.Vector3().fromArray(parentBody.getPosition());
			var parentQuaternion = new THREE.Quaternion().fromArray(parentBody.getQuaternion());
			var scaleVec = new THREE.Vector3(1,1,1);

			//construct matrices?
			var childMatrixWorld = new THREE.Matrix4().compose(childLocation, childQuaternion, scaleVec);
			var parentMatrixWorld = new THREE.Matrix4().compose(parentLocation, parentQuaternion, scaleVec);

			//do maths
			var parentMatrixWorldInv = new THREE.Matrix4().getInverse(parentMatrixWorld);
			var childMatrixWorldInv = new THREE.Matrix4().getInverse(childMatrixWorld);

			var localPositionParent = new THREE.Vector3().copy(p);
			var localPositionChild = new THREE.Vector3().copy(p);

			localPositionParent.applyMatrix4(parentMatrixWorldInv);
			localPositionChild.applyMatrix4(childMatrixWorldInv);


			/*var nL = new THREE.Vector3().copy(localPositionParent).applyQuaternion(parentQuaternion);
			var wL = new THREE.Vector3().fromArray(parentBody.getPosition());
			wL = wL.add(nL);
    		let jointdebug = makeDebugSphereOfChaos(this.game.scene, constraintPoint, 0.05, 0x0000FF);
    		this.game.scene.add(jointdebug);
    		//this.boneMesh.add(this.jointdebug);*/


			return {
				bALocalPosition: localPositionParent.toArray(),
				bBLocalPosition: localPositionChild.toArray(),
				bBWorldPosition: p.toArray()
			}
		},
		createDebugMesh: function(body) {
	        var sphere = new THREE.Mesh(
	        	//new THREE.SphereGeometry(radius, 12, 12), 
	        	new THREE.BoxGeometry(body.shapeInfo.x*2, body.shapeInfo.y*2, body.shapeInfo.z*2),
	        	new THREE.MeshStandardMaterial({
	        		depthTest: false, 
	        		depthWrite: false, wireframe: true,
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
			};
			/*var nameMapping = {
				"pel": "ORG-spine",
				"sp1": "ORG-spine.001",
				"sp2": "tweak_spine.002",
				"sp3": "tweak_spine.003",
				"sp4": "DEF-spine.004",
				"sp5": "DEF-spine.005",
				"hed": "DEF-spine.006",
				"clv": "DEF-shoulder.{LR}",
				"am1": "DEF-upper_arm.{LR}",
				"am2": "DEF-forearm.{LR}",
				"hnd": "DEF-hand.{LR}",
				"lg1": "DEF-thigh.{LR}",
				"lg2": "DEF-shin.{LR}",
				"fot": "DEF-foot.{LR}"
			}*/

			var np = function(k, side) { 
				if(side) {
					return nameMapping[k].replace('{LR}', side);
				}
				return nameMapping[k]; 
			};
			var bW = 0.08;
			var bH = 0.08;

			var boneData = [
				{ name: np('pel'), width: 0.2, height: bH, child: np('sp1'), kinematic: false },
				{ name: np('sp1'), width: 0.2, height: bH, child: np('sp2'), kinematic: false },
				{ name: np('sp2'), width: 0.2, height: bH, child: np('sp3'), kinematic: false },
				{ name: np('sp3'), width: 0.2, height: bH, child: np('sp4'), kinematic: false },
				//{ name: np('sp4'), width: bW, height: bH, child: np('sp5'), kinematic: false },
				{ name: np('sp5'), width: bW, height: bH, child: np('hed'), kinematic: false },
				{ name: np('hed'), length: 0.16, width: 0.17, height: 0.17, kinematic: true },
				{ name: np('clv', 'L'), width: bW, height: bH, child: np('am1', 'L'), kinematic: false },
				{ name: np('clv', 'R'), width: bW, height: bH, child: np('am1', 'R'), kinematic: false },
				{ name: np('am1', 'L'), width: bW, height: bH, child: np('am2', 'L'), kinematic: false },
				{ name: np('am1', 'R'), width: bW, height: bH, child: np('am2', 'R'), kinematic: false },
				{ name: np('am2', 'L'), width: bW, height: bH, child: np('hnd', 'L'), kinematic: false },
				{ name: np('am2', 'R'), width: bW, height: bH, child: np('hnd', 'R'), kinematic: false },
				{ name: np('hnd', 'L'), length: 0.1, width: .01, height: .01, kinematic: true },
				{ name: np('hnd', 'R'), length: 0.1, width: .01, height: .01, kinematic: true },
				{ name: np('lg1', 'L'), width: bW, height: bH, child: np('lg2', 'L'), kinematic: false },
				{ name: np('lg1', 'R'), width: bW, height: bH, child: np('lg2', 'R'), kinematic: false },
				{ name: np('lg2', 'L'), width: bW, height: bH, child: np('fot', 'L'), kinematic: false },
				{ name: np('lg2', 'R'), width: bW, height: bH, child: np('fot', 'R'), kinematic: false },
				{ name: np('fot', 'L'), length: 0.1, width: bW, height: bH, kinematic: true },
				{ name: np('fot', 'R'), length: 0.1, width: bW, height: bH, kinematic: true }
			];

			var dof = 0.1;
			var handDof = 0.5;
			var footDof = 0.5;
			var shoulderDof = dof;
			
			var jointData = [
				{ 
					b1: np('sp1'), b2: np('pel'),
					rotationLimitsLow:  [-dof,-dof,-dof], 
					rotationLimitsHigh: [ dof, dof, dof]
				},
				{ 
					b1: np('sp1'), b2: np('sp2'),
					rotationLimitsLow:  [-dof,-dof,-dof], 
					rotationLimitsHigh: [ dof, dof, dof]
				},
				{ 
					b1: np('sp2'), b2: np('sp3'),
					rotationLimitsLow:  [-dof,-dof,-dof], 
					rotationLimitsHigh: [ dof, dof, dof]
				},
				{ 
					b1: np('sp3'), b2: np('sp5'),
					rotationLimitsLow:  [-dof,-dof,-dof], 
					rotationLimitsHigh: [ dof, dof, dof]
				},
				{ 
					b1: np('sp5'), b2: np('hed'),
					rotationLimitsLow:  [-dof,-dof,-dof], 
					rotationLimitsHigh: [ dof, dof, dof]
				},
				// ----- LEGS
				{ 
					b1: np('pel'), b2: np('lg1', 'L'), 
					rotationLimitsLow: [-0.35,-0.8,-0.15], 
					rotationLimitsHigh: [ 1.5, 0.8, 0.15]
				},
				{ 
					b1: np('lg1', 'L'), b2: np('lg2', 'L'), 
					rotationLimitsLow:  [-2,   -1,-0.1], 
					rotationLimitsHigh: [ 0.01, 1, 0.1]
				},
				{ 
					b1: np('lg2', 'L'), b2: np('fot', 'L'), 
					rotationLimitsLow: [-footDof,-footDof,-footDof], 
					rotationLimitsHigh: [ footDof, footDof, footDof]
				},
				{ 
					b1: np('pel'), b2: np('lg1', 'R'), 
					rotationLimitsLow: [-0.35,-0.8,-0.15], 
					rotationLimitsHigh: [ 1.5, 0.8, 0.15]
				},
				{ 
					b1: np('lg1', 'R'), b2: np('lg2', 'R'), 
					rotationLimitsLow:  [-2,   -1,-0.1], 
					rotationLimitsHigh: [ 0.01, 1, 0.1]
				},
				{ 
					b1: np('lg2', 'R'), b2: np('fot', 'R'), 
					rotationLimitsLow: [-footDof,-footDof,-footDof], 
					rotationLimitsHigh: [ footDof, footDof, footDof]
				},
				// ----- ARMS
				{ 
					b1: np('sp3'), b2: np('clv', 'L'), 
					rotationLimitsLow: [-.1,-.1,-.1], rotationLimitsHigh: [ .1, .1, .1]
				},
				{ 
					b1: np('clv', 'L'), b2: np('am1', 'L'), 
					rotationLimitsLow: [-2,-2,-0.1], 
					rotationLimitsHigh: [ 2, 2, 0.1]
				},
				{ 
					b1: np('am1', 'L'), b2: np('am2', 'L'), 
					rotationLimitsLow: [-0,-0.5,-0.5], 
					rotationLimitsHigh: [ 0, 3, 0.5]
				},
				{ 
					b1: np('am2', 'L'), b2: np('hnd', 'L'), 
					rotationLimitsLow: [-handDof,-handDof,-handDof], 
					rotationLimitsHigh: [ handDof, handDof, handDof]
				},
				{ 
					b1: np('sp3'), b2: np('clv', 'R'), 
					rotationLimitsLow: [-.1,-.1,-.1], rotationLimitsHigh: [ .1, .1, .1]
				},
				{ 
					b1: np('clv', 'R'), b2: np('am1', 'R'), 
					rotationLimitsLow: [-2,-2,-0.1], 
					rotationLimitsHigh: [ 2, 2, 0.1]
				},
				{ 
					b1: np('am1', 'R'), b2: np('am2', 'R'), 
					rotationLimitsLow: [-0,-3,-0.5], 
					rotationLimitsHigh: [ 0, 0.5, 0.5]
				},
				{ 
					b1: np('am2', 'R'), b2: np('hnd', 'R'), 
					rotationLimitsLow: [-handDof,-handDof,-handDof], 
					rotationLimitsHigh: [ handDof, handDof, handDof]
				}

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

			let dynamicsMap = this.dynamicsMap = {};

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
					x: entry.width / 2.0 || 0.05,
					y: entry.height / 2.0 || 0.05
				};
				let boneBody = new Body(bodyInfo, shapeInfo);
				let bone = skeleton.getBoneByName(entry.name);
				bone.matrixWorld.decompose(p, q, r);

				//translate via Z axis half the length
				let xLat = new THREE.Vector3(0, 0, -(entry.length / 2.0));
				xLat.applyQuaternion(q);
				boneBody.setPosition([p.x + xLat.x, p.y + xLat.y, p.z + xLat.z]);
				boneBody.setQuaternion([q.x, q.y, q.z, q.w]);

				//boneMesh, boneBody, parentBody, parentMesh, game, options
				let dE = new PhysBone(bone, boneBody, null, null, this.game, {
					//move by half bone len in z when moving bone to this phys
					localOffset: new THREE.Vector3(0, 0, (entry.length / 2.0))
				});

				dE.debugMesh = this.createDebugMesh(boneBody);
				// TODO remove
				dE.debugMesh.visible = false;
				this.dynamics.push(dE);
				dynamicsMap[bone.name] = dE;

				let physicsWorld = this.game.physicsWorld;
				physicsWorld.addBody(
					boneBody, 
					physicsWorld.collisionLayers.WORLD, 
					physicsWorld.collisionLayers.WORLD
				);
			}

			this.constraints = [];
			for(let i = 0; i < jointData.length; i++) {
				let entry = jointData[i];
				let b1 = dynamicsMap[entry.b1];
				let b2 = dynamicsMap[entry.b2];
				//function(parentBody, body, parentMesh, boneMesh) 
				let coords = this._get_local_coords(
					b1.body, b2.body, b1.mesh, b2.mesh
				);
				let jointdebug = makeDebugSphereOfChaos(this.game.scene, o.fromArray(coords.bALocalPosition), 0.05, 0x0000FF);
				//TODO remove
				jointdebug.visible = false;
				b1.debugMesh.add(jointdebug);
				
				this.constraints.push(
					this.game.physicsWorld.createConstraint(
						"6DOF", b1.body, b2.body, 
						coords.bALocalPosition, coords.bBLocalPosition, entry
					).constraint
				);
			}
		}
	};

	return System;
}); 