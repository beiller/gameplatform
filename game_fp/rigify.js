import * as THREE from './lib/three.module.js';
import * as LOADER from './renderer/loader.js';

function calculateRigidBodyLength(armature, boneName1, boneName2) {
	const bone1 = armature.getBoneByName(boneName1);
	const bone2 = armature.getBoneByName(boneName2);
	const vec3_end = bone1.position.clone();
	const vec3_temp = bone2.position.clone();
	bone1.getWorldPosition(vec3_temp);
	bone2.getWorldPosition(vec3_end);
	return Math.abs(vec3_temp.sub(vec3_end).length());
}

const vec3_1 = new THREE.Vector3();
const vec3_2 = new THREE.Vector3();
const vec3_3 = new THREE.Vector3();
const qua4_1 = new THREE.Quaternion();
const qua4_2 = new THREE.Quaternion();
const mat4_1 = new THREE.Matrix4();
const mat4_2 = new THREE.Matrix4();

function findBoneIndex(boneName, bonesList) {
	let boneIndex = -1
	for(boneIndex = 0; boneIndex < bonesList.length; boneIndex++) {
		if(bonesList[boneIndex].name == boneName) {
			break;
		}
	}
	if(boneIndex === -1) { throw('Unable to find bone ' + boneName)}
	return boneIndex;
}

function getRigidBodyWorldCoordinates(armature, boneName) {
	armature.update();
	const boneIndex = findBoneIndex(boneName, armature.bones);
	//recover full THREE stuff from the inverses sent to GPU
	// this seems to be the only accurate method. Simpler is best and portability is key
	mat4_1.getInverse(armature.boneInverses[boneIndex]); 
	mat4_1.decompose(vec3_1, qua4_1, vec3_2);
	return [vec3_1.clone(), qua4_1.clone()];
}
function calculateLocalConnectionFromWorld(physicsStateA, physicsStateB, x, y, z) {
	return {
		localA: getLocalCoordiantes(physicsStateA, x, y, z),
		localB: getLocalCoordiantes(physicsStateB, x, y, z)
	}
}

function getLocalCoordiantes(physicsState, x, y, z) {
	const vecA = new THREE.Vector3(physicsState.x, physicsState.y, physicsState.z);
	const rA = physicsState.rotation;
	const quaA = new THREE.Quaternion(rA.x, rA.y, rA.z, rA.w);
	const vecWorld = new THREE.Vector3(x, y, z);
	const scale = new THREE.Vector3(1,1,1);
	const m1 = new THREE.Matrix4().compose(vecA, quaA, scale);
	m1.getInverse(m1.clone());
	return vecWorld.applyMatrix4(m1).toArray();
}

function searchTree(tree, predicate, results) {
	if(!results) { results = []; }
	if(!predicate) { predicate = obj => true }
	const gather = (obj) => {if(predicate(obj)) { results.push(obj) }}
	tree.traverse(gather);
	return results;
}

function findSkinnedMesh(root) {
	return searchTree(root, obj => 'skeleton' in obj);
}

function vectorizeBuffer(buffer) {
	const vect = [];
	const consMap = {1: s=>s, 2: THREE.Vector2, 3: THREE.Vector3, 4: THREE.Vector4}
	const cons = consMap[buffer.itemSize];
	for(let i = 0; i < buffer.count; i++) {
		vect.push(new cons().fromBufferAttribute(buffer, i))
	} 
	return vect;
}

function gatherVertices(boneIndex, skinIndex, skinWeight, position, minimumQueryWeight) {
	let shinVertices = [];
	let vertexCache = {};
	for(let i = 0; i < skinIndex.length; i++) {
		const hashKey = position[i].x + "," + position[i].y + "," + position[i].z;
		if(!(hashKey in vertexCache)) {
			if(skinIndex[i].x == boneIndex && skinWeight[i].x > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			} else if(skinIndex[i].y == boneIndex && skinWeight[i].y > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			} else if(skinIndex[i].z == boneIndex && skinWeight[i].z > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			} else if(skinIndex[i].w == boneIndex && skinWeight[i].w > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			}
		}
	}
	return shinVertices;
}

function getRandomSubarray(arr, size) {
    var shuffled = arr.slice(0), i = arr.length, temp, index;
    while (i--) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(0, size);
}

/*
	Given a GLFT file (character-like)
	Requires that glft has a SkinnedMesh and 1 armature

	Will output rigid bodies matching the makeup given in "pairs"
*/
function createCubeMesh(skinnedMesh, namePrefix, pairs) {
	const armature = skinnedMesh.skeleton;
	//const shape = "capsule"; 
	const shape = "box"; 
	const radius = 0.035; 
	const mass = 0.05; 
	const entities = {};
	for(let i = 0; i < pairs.length; i++) {	
		const boneName = pairs[i][0];
		if(namePrefix+".bone."+boneName in entities) { continue; }
		/*
			Create the rigid body
		*/
		let length = 0.1;
		if(typeof pairs[i][1] == 'number') {
			length = pairs[i][1];
		} else {
			length = calculateRigidBodyLength(armature, pairs[i][0], pairs[i][1]);
		}
		const coordinates = getRigidBodyWorldCoordinates(armature, pairs[i][0]);
		const vec3 = coordinates[0];
		const quat = coordinates[1];
		vec3.add(vec3_3.set(0, length / 2.0, 0).applyQuaternion(quat));
		const positioning = {x: vec3.x, y: vec3.y, z: vec3.z, rotation: {x: quat.x, y: quat.y, z: quat.z, w: quat.w} };
		entities[namePrefix+".bone."+pairs[i][0]] = {
			"entity": {...positioning},
			//"render": {type: shape, radius: radius, height: length, ignoreOffset: true, x: radius, y: length/2, z: radius},
			"physics": {...positioning,
				shape: {type: shape, radius: radius, height: length, x: radius, y: length/2, z: radius }, mass: mass,
				damping: .99,
				boneOffsetX: 0, boneOffsetY: -length/2, boneOffsetZ: 0
			}
		};
		//DEBUG
		//entities[namePrefix+".bone."+boneName].physics.staticObject = true;
		/*entities[namePrefix+".debugBoneAxis."+boneName] = { 
			entity: {...positioning}, render: { type: "axis", ignoreOffset: true }, 
		};*/
		//END DEBUG
	}
	return entities;
}

function calculateConvexHullMass(points, density) {
	if(!density) density = 500.0;
	const min = [9999999,9999999,9999999];
	const max = [-9999999,-9999999,-9999999];
	for(let i = 0; i < points.length; i++) {
		const p = points[i];
		if(p.x > max[0]) { max[0] = p.x}
		if(p.x < min[0]) { min[0] = p.x}
		if(p.y > max[1]) { max[1] = p.y}
		if(p.y < min[1]) { min[1] = p.y}
		if(p.z > max[2]) { max[2] = p.z}
		if(p.z < min[2]) { min[2] = p.z}
	}
	const mass = (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]) * density;
	return mass;
	/*const TOTAL_MASS = 49.8952;  // 110 lbs
	const PER_SHAPE_MASS = TOTAL_MASS / jointData['princess'].pairs.length;
	return PER_SHAPE_MASS;*/
}

/*
	Given a GLFT file (character-like)
	Requires that glft has a SkinnedMesh and 1 armature

	Will output rigid bodies matching the mesh using convex hull
*/
function createConvexHullMesh(skinnedMesh, namePrefix, pairs) {		
	const MAX_VERTICES = 50;
	const bonesList = skinnedMesh.skeleton.bones;
	const position = vectorizeBuffer(skinnedMesh.geometry.attributes.position);
	const skinIndex = vectorizeBuffer(skinnedMesh.geometry.attributes.skinIndex);
	const skinWeight = vectorizeBuffer(skinnedMesh.geometry.attributes.skinWeight);
	let totalMass = 0;

	//create a convex hull for each bone
	const returnEntities = {};
	for(let i = 0; i < pairs.length; i++) {	
		const boneName = pairs[i][0];
		if(namePrefix+".bone."+boneName in returnEntities) { continue; }

		console.log('Building', boneName);
		const boneIndex = findBoneIndex(boneName, bonesList);
		let boneVertexList = gatherVertices(boneIndex, skinIndex, skinWeight, position, 0.35);
		const mass = calculateConvexHullMass(boneVertexList, 100.0);
		totalMass += mass;

		if(boneVertexList.length > 3) { // need at least 4 vtx for convex hull
			if(boneVertexList.length > MAX_VERTICES) { // limit to MAX_VERTICES vertex count
				boneVertexList = getRandomSubarray(boneVertexList, MAX_VERTICES);
			}
			const coordinates = getRigidBodyWorldCoordinates(skinnedMesh.skeleton, boneName);
			const vec3 = coordinates[0];
			const quat = coordinates[1];
			const localPoints = boneVertexList.map((p)=>{
				return p.clone().sub(vec3).applyQuaternion(quat.clone().inverse());
			});
			const cP = new THREE.Vector3(0,0,0); //center point
			localPoints.forEach(e=>cP.add(e));
			cP.divideScalar(localPoints.length); // average of all points
			const shiftedPoints = localPoints.map(p=>p.clone().sub(cP));
			const points = shiftedPoints.map( (v)=>{return {x: v.x, y: v.y, z: v.z}} );


			vec3.add(cP.clone().applyQuaternion(quat));
			
			const positioning = {x: vec3.x, y: vec3.y, z: vec3.z, rotation: {x: quat.x, y: quat.y, z: quat.z, w: quat.w} };
			returnEntities[namePrefix+".bone."+boneName] = { 
				entity: {...positioning}, 
				//render: { type: "convex", points: points, ignoreOffset: true }, 
				physics: {
					...positioning, 
					shape: { type: "convex", points: points }, mass: mass,
					boneOffsetX: -cP.x, boneOffsetY: -cP.y, boneOffsetZ: -cP.z
				}
			};
		}
	}
	console.log("Total mass: " + totalMass + "kg/" + (totalMass * 2.18257) + "lbs");
	return returnEntities
}

/*
A function that connects rigid bodies given existing rigid
bodies with a name prefix
params
	entites: object containing the rigid body descriptions
	armature: THREE.Skeleton instane
	namePrefix: namePrefix given to the entities and to these constraints
*/
function connectRigidBodies(entities, armature, namePrefix, pairs2) {
	const newEntities = {...entities};
	for(let i = 0; i < pairs2.length; i++) {	
		/*
			Connect joints
		*/
		const entity1 = entities[namePrefix+".bone."+pairs2[i][0]];
		if(!entity1) throw("Unable to find bone: "+pairs2[i][0]);
		const entity2 = entities[namePrefix+".bone."+pairs2[i][1]];
		if(!entity2) throw("Unable to find bone: "+pairs2[i][1]);
		const bone1 = armature.getBoneByName(pairs2[i][0]);
		const bone2 = armature.getBoneByName(pairs2[i][1]);
		const coords = getRigidBodyWorldCoordinates(armature, bone1.name);
		const b1 = coords[0];
		const locals = calculateLocalConnectionFromWorld(
			entity1.physics, entity2.physics, b1.x, b1.y, b1.z
		)

		const defaultLim = Math.PI;
		const lim = 20;
		let low = [-defaultLim / lim, -defaultLim / lim, -defaultLim / lim];
		let high = [defaultLim / lim, defaultLim / lim, defaultLim / lim];
		if(pairs2[i][2]) {
			low = pairs2[i][2].map(x=>x * 0.5);
		}
		if(pairs2[i][3]) {
			high = pairs2[i][3].map(x=>x * 0.5);
		}
		const q1 = bone1.quaternion.clone()
		bone1.getWorldQuaternion(q1);
		const q2 = bone2.quaternion.clone()
		bone2.getWorldQuaternion(q2);

		newEntities[namePrefix+".constraint."+pairs2[i][0]] = {
			"constraint": {
				type: "6DOF",
				bodyA: namePrefix+".bone."+pairs2[i][0],
				bodyB: namePrefix+".bone."+pairs2[i][1],
				localA: locals.localA,
				localB: locals.localB,
				options: {
					quaternionA: [q1.x, q1.y, q1.z, -q1.w],
					quaternionB: [q2.x, q2.y, q2.z, -q2.w],
					disableCollision: true,
					rotationLimitsLow : low,
					rotationLimitsHigh : high
				}
			}
		};
	}
	return newEntities;
}

function pinConstriants(entities, namePrefix, pins) {
	for(let i in pins) {
		//const constraint = namePrefix+".constraint."+pins[i];
		const pin = namePrefix+".pin."+pins[i][0];
		const bone = namePrefix+".bone."+pins[i][0];
		var x = entities[bone].physics.x;
		var y = entities[bone].physics.y;
		var z = entities[bone].physics.z;
		if(pins[i].length > 1) {
			x = pins[i][1];
			y = pins[i][2];
			z = pins[i][3];
		} 
        entities = {
            ...entities,
            [pin+".1"]: {
                "entity": {x: x, y: y, z: z},
                "render": {type: "sphere", radius: 0.025 },
                "physics": {x: x, y: y, z: z, shape: {type: "sphere", radius: 0.025 }, mass: 0, noContact: true, kinematic: true}
            },
            [pin+".2"]: {
                "entity": {x: x, y: y, z: z},
                "render": {type: "axis", ignoreOffset: true}, "entity": {x: x, y: y, z: z},
                //"physics": {x: x, y: y, z: z, shape: {type: "sphere", radius: 0.025 }, mass: 0, noContact: true, kinematic: true},
                "constraint": {
                    type: "6DOF", bodyA: bone, localA: [0,0,0], bodyB: pin+".1", localB: [0,0,0],
                    options: {
                        disableCollision: true,
                        //rotationLimitsLow : [-100,-100,-100],
                        //rotationLimitsHigh : [100, 100, 100],
                        spring: true, stiffness: 5000.0 * entities[bone].physics.mass, distance: 2, damping: 0.5
                    }
                },
                //"particle": {maxAge: 500}
            }
        }
	}
	
	try {
		const springSettings = { 
			distance: 5.0, spring: true, stiffness: 250.0, disableCollision: false 
		};
		entities[namePrefix+".constraint.RootNode_rPectoral"].constraint.options = {
			...entities[namePrefix+".constraint.RootNode_rPectoral"].constraint.options,
			...springSettings
		};
		entities[namePrefix+".constraint.RootNode_lPectoral"].constraint.options = {
			...entities[namePrefix+".constraint.RootNode_lPectoral"].constraint.options,
			...springSettings
		}
	} catch(e) { console.warn(e); }

	return entities;
}

function moveBodies(entities, offset, rotation) {
	for(let eid in entities) {
		if('physics' in entities[eid]) {
			entities[eid].physics.x += offset.x;
			entities[eid].physics.y += offset.y;
			entities[eid].physics.z += offset.z;

		}
	}
	return entities;
}

function spawnRagdoll(namePrefix, armature, pairs, pairs2, offset, rotation) {
    const pins = [
		['DEF-spine_006', 0.00728, 1.01423, -0.2011]
	];

	let entities = createConvexHullMesh(armature, namePrefix, pairs);
	//let entities = createCubeMesh(armature, namePrefix, pairs);
	entities = connectRigidBodies(entities, armature.skeleton, namePrefix, pairs2);
	//entities = moveBodies(entities, offset, rotation);
	entities = pinConstriants(entities, namePrefix, pins);
	
	return entities;
}

export {spawnRagdoll, searchTree, vectorizeBuffer, findSkinnedMesh}
