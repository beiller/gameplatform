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

function loadDAE(url) {
	return new Promise((resolve) => {
		DAEloader.load(url, (collada) => {
			const skinnedMeshList = findSkinnedMesh(collada.scene);  // Gather all skinned mesh
			// join all meshes together into one
			let armature = skinnedMeshList[0];
			for(let i = 1; i < skinnedMeshList.length; i++) {
				armature.geometry = MESHUTILS.mergeGeometry(armature.geometry, skinnedMeshList[i].geometry);
			}
			const skeletonRootBones = findRootBone(collada.scene);

			const matchDefBones = obj => obj.name.startsWith('DEF-')
			const clone = o => o.clone();

			const deformFaceBones = searchTree(armature.skeleton.getBoneByName("ORG-face"), matchDefBones);
			const lHandBones = searchTree(armature.skeleton.getBoneByName("DEF-hand_R"), matchDefBones).slice(1);
			const rHandBones = searchTree(armature.skeleton.getBoneByName("DEF-hand_L"), matchDefBones).slice(1);
			
			const matchOtherBones = obj => !(deformFaceBones.includes(obj) || lHandBones.includes(obj) || rHandBones.includes(obj))
			const matchOtherDefBones = obj => matchDefBones(obj) && matchOtherBones(obj);
			
			const otherBones = searchTree(armature.skeleton.getBoneByName("root"), matchOtherDefBones);
			const clearChildren = (o) => { o.children = []; return o; };
			console.log('deformFaceBones', deformFaceBones.map(clone).map(clearChildren));
			console.log('lHandBones', lHandBones.map(clone).map(clearChildren));
			console.log('rHandBones', rHandBones.map(clone).map(clearChildren));
			console.log('otherBones', otherBones.map(clone).map(clearChildren));

			for(let i = 0; i < skeletonRootBones.length; i++) {
				armature.add(skeletonRootBones[i]);
			}
			resolve({scene: armature});
		});
	});
}

function loadGLTF(url) {
	return new Promise((resolve, reject) => {
		GLTFLoader.load(
			url, gltf => resolve(gltf),
			function ( xhr ) {
				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
			}, reject
		);
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

export {loadEXRMap, loadTextureOnce, loadMeshFile, loadGLTF}