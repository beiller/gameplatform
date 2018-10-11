import * as THREE from './three.module.js';
import * as GLTF from './GLTFLoader.js';

// Instantiate a loader
var loader = new GLTF.GLTFLoader();

// Optional: Provide a DRACOLoader instance to decode compressed mesh data
//THREE.DRACOLoader.setDecoderPath( '/examples/js/libs/draco' );
//loader.setDRACOLoader( new THREE.DRACOLoader() );

function loadGLTF(filename, callback) {
	// Load a glTF resource
	loader.load(
		// resource URL
		'DefenderLingerie00.glb',
		// called when the resource is loaded
		callback,
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
}

export { loadGLTF }