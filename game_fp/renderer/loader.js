import * as THREE from '../lib/three.module.js';
import * as Loader from '../Loader.js';
import * as GLTF from '../GLTFLoader.js';
import * as MESHUTILS from '../mesh_utils.js';
import {ColladaLoader} from '../DAELoader.js';


const GLTFLoader = new GLTF.GLTFLoader();
const DAEloader = new ColladaLoader();

function loadEXRMap(renderer) {
	return new Promise(function(resolve) { 
		var genCubeUrls = function( prefix, postfix ) {
			return [
				prefix + 'px' + postfix, prefix + 'nx' + postfix,
				prefix + 'py' + postfix, prefix + 'ny' + postfix,
				prefix + 'pz' + postfix, prefix + 'nz' + postfix
			];
		};
		var hdrUrls = genCubeUrls( '/textures/park1/', '.hdr' );
		new THREE.HDRCubeTextureLoader().load( THREE.UnsignedByteType, hdrUrls, function ( hdrCubeMap ) {
			var pmremGenerator = new THREE.PMREMGenerator( hdrCubeMap );
			//disable VR rendering to borrow the renderer for this
			const vrSetting = renderer.vr.enabled;
			renderer.vr.enabled = false;
			pmremGenerator.update( renderer );
			var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker( pmremGenerator.cubeLods );
			pmremCubeUVPacker.update( renderer );
			//const hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
			hdrCubeMap.dispose();
			//reenable VR if it was enabled
			renderer.vr.enabled = vrSetting;
			resolve(pmremCubeUVPacker.CubeUVRenderTarget);
		} );
	});
};

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

function findRootBone(root) {
	return searchTree(root, obj => obj.isBone && (!obj.parent || !obj.parent.isBone));
}

const matchDefBones = obj => obj.name.startsWith('DEF-');

/*
	Convert rigify rig from blender to game format
	Strips out all bones except those prefixed with "DEF-" (deform bones in rigify)

	Returns a THREE.Skeleton with roughly the following hierarchy:

	root->
	  spine->
	     face
	  legs
	  arms->
		 hands/fingers

*/
function rigifyToSimple(rigifySkeleton) {
	const m1 = new THREE.Matrix4();
	rigifySkeleton.update();

	const allDEFBones = searchTree(rigifySkeleton.getBoneByName("root"), matchDefBones);
	const deformFaceBones = searchTree(rigifySkeleton.getBoneByName("ORG-face"), matchDefBones);
	const lHandBones = searchTree(rigifySkeleton.getBoneByName("DEF-hand_L"), matchDefBones).slice(1);
	const rHandBones = searchTree(rigifySkeleton.getBoneByName("DEF-hand_R"), matchDefBones).slice(1);
	
	const matchOtherBones = obj => !(deformFaceBones.includes(obj) || lHandBones.includes(obj) || rHandBones.includes(obj))
	const matchOtherDefBones = obj => matchDefBones(obj) && matchOtherBones(obj);
	
	const otherBones = searchTree(rigifySkeleton.getBoneByName("root"), matchOtherDefBones);
	/*console.log('deformFaceBones', deformFaceBones);
	console.log('lHandBones', lHandBones);
	console.log('rHandBones', rHandBones);
	console.log('otherBones', otherBones);*/
	
	const rootBone = new THREE.Bone();
	rootBone.name = "root";
	//const nullBone = new THREE.Bone();
	const newBones = [rootBone]; //rigifySkeleton.bones.map(o => nullBone);

	for(let i = 0; i < allDEFBones.length; i++) {
		const bone = allDEFBones[i];
		const boneIndex = rigifySkeleton.bones.indexOf(bone);
		m1.getInverse(rigifySkeleton.boneInverses[boneIndex]);
		const newBone = new THREE.Bone();
		newBone.name = bone.name;
		m1.decompose(newBone.position, newBone.quaternion, newBone.scale);
		newBone.matrixWorld.copy(m1);
		newBone.updateMatrix();
		rootBone.add(newBone);
		newBones.push(newBone);
	}
	const newSkeleton = new THREE.Skeleton(newBones);
	
	//f(string, string) -> undefined
	const reparent = (skeleton, parentBoneName, boneName) => {
		if(parentBoneName == boneName) return;
		const parentBone = skeleton.getBoneByName(parentBoneName)
		const childBone = skeleton.getBoneByName(boneName);
		childBone.applyMatrix(m1.copy(skeleton.boneInverses[skeleton.bones.indexOf(parentBone)]));
		parentBone.add(childBone);
	};
	deformFaceBones.forEach(bone => reparent(newSkeleton, "DEF-spine_006", bone.name));
	rHandBones.forEach(bone => reparent(newSkeleton, "DEF-hand_R", bone.name));
	lHandBones.forEach(bone => reparent(newSkeleton, "DEF-hand_L", bone.name));
	reparent(newSkeleton, "DEF-spine", "DEF-pelvis_L");
	reparent(newSkeleton, "DEF-spine", "DEF-pelvis_R");
	reparent(newSkeleton, "DEF-spine_003", "DEF-breast_L");
	reparent(newSkeleton, "DEF-spine_003", "DEF-breast_R");
	newSkeleton.pose()

	return newSkeleton;
}

function loadRigify(url) {
	const loaderMap = {
		'dae': DAEloader, 'gltf': GLTFLoader
	};
	function loaderFunc(url, callbackFn) {
		loaderMap[url.split('.').slice(-1).pop().toLowerCase()].load(url, callbackFn);
	}
	return new Promise((resolve) => {
		loaderFunc(url, (collada) => {
			const skinnedMeshList = findSkinnedMesh(collada.scene);  // Gather all skinned mesh
			// join all meshes together into one
			let armature = skinnedMeshList[0];
			for(let i = 1; i < skinnedMeshList.length; i++) {
				armature.geometry = MESHUTILS.mergeGeometry(armature.geometry, skinnedMeshList[i].geometry);
			}
			//armature.geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
			const simplifiedSkeleton = rigifyToSimple(armature.skeleton);
			armature.geometry = remapBoneIndex(armature.skeleton, simplifiedSkeleton, armature.geometry)
			armature.skeleton = simplifiedSkeleton;
			armature.add(armature.skeleton.bones[0]);
			resolve({scene: armature});
		});
	});
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

function createNameIndexMap(bones) {
	const mapping = {};
	for(let i = 0; i < bones.length; i++) {
		mapping[bones[i].name] = i;
	}
	return mapping;
}
function remapBoneIndex(originalSkeleton, simplifiedSkeleton, geometry) {
	const oldNameIndexMap = createNameIndexMap(originalSkeleton.bones);
	const newNameIndexMap = createNameIndexMap(simplifiedSkeleton.bones);
	const mapping = {};
	for(let name in newNameIndexMap) {
		mapping[oldNameIndexMap[name]] = newNameIndexMap[name];
	}
	const skinIndex = vectorizeBuffer(geometry.attributes.skinIndex);
	//const skinWeight = vectorizeBuffer(geometry.attributes.skinWeight);
	for(let i = 0; i < skinIndex.length; i++) {
		const skinIndexVector = skinIndex[i];
		geometry.attributes.skinIndex.setXYZW(i, mapping[skinIndexVector.x], mapping[skinIndexVector.y], mapping[skinIndexVector.z], mapping[skinIndexVector.w]);
	}
	return geometry;
}

function loadDAE(url) {
	return new Promise((resolve) => {
		DAEloader.load(url, (collada) => {
			const skinnedMeshList = findSkinnedMesh(collada.scene);  // Gather all skinned mesh
			// join all meshes together into one
			let armature = skinnedMeshList[0];
			for(let i = 1; i < skinnedMeshList.length; i++) {
				armature.geometry = MESHUTILS.mergeGeometry(armature.geometry, skinnedMeshList[i].geometry);
			}
			const allDEFBones = searchTree(armature.skeleton.getBoneByName("root"), matchDefBones);
			if(allDEFBones.length > 5) {  // Hack to determine if this is a rigify rig. 
				//armature.geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
				const simplifiedSkeleton = rigifyToSimple(armature.skeleton);
				armature.geometry = remapBoneIndex(armature.skeleton, simplifiedSkeleton, armature.geometry)
				
				armature.skeleton = simplifiedSkeleton
			} 
			armature.add(armature.skeleton.bones[0]);
			resolve({scene: armature});
		});
	});
}

function loadGLTF(url) {
	return new Promise((resolve, reject) => {
		/*GLTFLoader.load(
			url, gltf => resolve(gltf),
			function ( xhr ) {
				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
			}, reject
		);*/
		GLTFLoader.load(url, (gltf) => {
			const skinnedMeshList = findSkinnedMesh(gltf.scene);  // Gather all skinned mesh
			// join all meshes together into one
			let armature = skinnedMeshList[0];
			for(let i = 1; i < skinnedMeshList.length; i++) {
				armature.geometry = MESHUTILS.mergeGeometry(armature.geometry, skinnedMeshList[i].geometry);
			}
			//armature.geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
			//armature.skeleton = rigifyToSimple(armature.skeleton);
			//armature.add(armature.skeleton.bones[0]);
			resolve({scene: armature});
		});
	});
}

function createCache(functionToCache) {
	let globalCache = {};
	return function cachedFunc(url) {
		return new Promise((resolve, reject) => {
			let loadCounter = 0;
			function loadWaiter(url) {
				if(loadCounter > 50) { reject('Unable to load file after 50 seconds!') }
				if(!(url in globalCache)) {
					globalCache[url] = 'loading';
					functionToCache(url).then(function(tex) { globalCache[url] = tex; resolve(tex) });
				} else {
					if(globalCache[url] === 'loading') {
						loadCounter = loadCounter + 1;
						setTimeout(function() { loadWaiter(url) }, 1000);
					} else {
						resolve(globalCache[url]);
					}
				}
			}
			loadWaiter(url);
		});
	}
}

const loadTexture = (url, callback) => Loader.loadTexture(url).then((tex) => {tex.name = url; callback(tex)});

const loadDAECached = createCache(loadDAE);
const loadGLTFCached = createCache(loadGLTF);
const loadTextureCached = createCache(Loader.loadTexture);
const loadTextureOnce = (url, callback) => loadTextureCached(url).then(callback);

function loadGLTFOnce(url, callback) {
	//loadGLTFCached(url).then(result => callback(result.scene.children[1].clone()));
	function clone(result) {
		/*let newScene = new THREE.Scene();
		newScene.add(result.scene.children[0].clone());
		newScene.add(result.scene.children[1].clone());*/
		const newScene = result.scene.clone();
		newScene.traverse(function(object) {
			if ( object.isMesh ) {
				object.material = object.material.clone();
				object.skeleton = object.skeleton.clone();
			}
		});
		return {'scene': newScene, animations: result.animations};
	}
	loadGLTFCached(url).then(result => callback(clone(result)));
}

function loadMeshFile(callbackFn, state) {
	let extension = state.filename.split('.').pop().toLowerCase();
	if(extension === 'json') {
		Loader.loadThreeJS(state, callbackFn);
	} else if(extension === 'dae') {
		//loadGLTF(state.filename).then(gltf => callbackFn(gltf));
		loadDAE(state.filename).then(collada => callbackFn(collada));
	} else {
		//Loader.loadGLTF(state, callbackFn);
		loadGLTF(state.filename).then(gltf => callbackFn(gltf));
		//loadGLTFOnce(state.filename, callbackFn);
	}
}

export {loadEXRMap, loadTextureOnce, loadTexture, loadMeshFile, loadGLTF, loadDAE, loadRigify}