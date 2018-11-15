import * as THREE from './lib/three.module.js';
import * as GLTF from './GLTFLoader.js';

// Instantiate a loader
var loader = new GLTF.GLTFLoader();

// Optional: Provide a DRACOLoader instance to decode compressed mesh data
//THREE.DRACOLoader.setDecoderPath( '/examples/js/libs/draco' );
//loader.setDRACOLoader( new THREE.DRACOLoader() );

var loadedFiles = {};

function loadGLTF(filename, callback, numTimesCalled) {
	if(!numTimesCalled) {
		numTimesCalled = 1;
	}
	if(!(filename in loadedFiles)) {
		// set pre-cache (tell system we're loading file)
		loadedFiles[filename] = null;
		function newCallback(gltf) {
			loadedFiles[filename] = gltf;
		}
		// Load a glTF resource
		loader.load(
			// resource URL
			filename,
			// called when the resource is loaded
			newCallback,
			// called while loading is progressing
			function ( xhr ) {

				console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

			},
			// called when loading has errors
			function ( error ) {

				console.log( 'An error happened' );
				console.log(error);

			}
		);
		setTimeout(function() {loadGLTF(filename, callback, numTimesCalled+1)}, 500);  // wait for loading to finish
	} else {
		if(loadedFiles[filename] === null) {
			if(numTimesCalled > 20) {
				console.error("Failed loading file", filename, "Waiting for file but we gave up");
				return;
			}
			setTimeout(function() {loadGLTF(filename, callback, numTimesCalled+1)}, 500);  // wait for loading to finish
		} else {
			// HACKS
			/*function cloneSkinnedMesh(skinnedMesh) {
				let geometryFromGlobal = skinnedMesh.geometry;
			    let clonedGeometry = geometryFromGlobal.clone()
			    let bones = JSON.parse(JSON.stringify(geometryFromGlobal.bones))
			    let skinWeights = JSON.parse(JSON.stringify(geometryFromGlobal.skinWeights))
			    let skinIndices = JSON.parse(JSON.stringify(geometryFromGlobal.skinIndices))
			    skinWeights = skinWeights.map(x => { return new THREE.Vector4().copy(x) })
			    skinIndices = skinIndices.map(x => { return new THREE.Vector4().copy(x) })
			    Object.assign(clonedGeometry, {bones, skinWeights, skinIndices })
			    
			    let clonedMesh = skinnedMesh.clone();
			    clonedMesh.geometry = clonedGeometry;
			    clonedGeometry.animations = skinnedMesh.geometry.animations;
			    return clonedMesh;
			}*/
			var newScene = new THREE.Scene();
			for(var i in loadedFiles[filename].scene.children) {
				/*if(loadedFiles[filename].scene.children[i].geometry && loadedFiles[filename].scene.children[i].geometry.bones) {
					newScene.add(cloneSkinnedMesh(loadedFiles[filename].scene.children[i]));
					if(loadedFiles[filename].scene.children[i].skeleton) {
						newScene.children[i].skeleton = loadedFiles[filename].scene.children[i].skeleton.clone();
					}
				} else {
					newScene.add(loadedFiles[filename].scene.children[i].clone());
				}*/
				newScene.add(loadedFiles[filename].scene.children[i].clone());
			}
			callback({
				scene: newScene,
				animations: loadedFiles[filename].animations
			});


			return;
		}
	}
}

export { loadGLTF }