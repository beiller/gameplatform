import * as THREE from '../lib/three.module.js';
import * as Loader from '../Loader.js';
import * as GLTF from '../GLTFLoader.js';

const GLTFLoader = new GLTF.GLTFLoader();

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
			const vrSetting = renderer.vr.enabled;
			renderer.vr.enabled = false;
			pmremGenerator.update( renderer );
			var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker( pmremGenerator.cubeLods );
			pmremCubeUVPacker.update( renderer );
			//const hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
			hdrCubeMap.dispose();
			renderer.vr.enabled = vrSetting;
			resolve(pmremCubeUVPacker.CubeUVRenderTarget);
		} );
	});
};


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
	} else {
		//Loader.loadGLTF(state, callbackFn);
		loadGLTF(state.filename).then(gltf => callbackFn(gltf));
		//loadGLTFOnce(state.filename, callbackFn);
	}
}

export {loadEXRMap, loadTextureOnce, loadMeshFile, loadGLTF}