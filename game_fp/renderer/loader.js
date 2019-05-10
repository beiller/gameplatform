import * as THREE from '../lib/three.module.js';
import * as Loader from '../Loader.js';

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
			pmremGenerator.update( renderer );
			var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker( pmremGenerator.cubeLods );
			pmremCubeUVPacker.update( renderer );
			//const hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
			hdrCubeMap.dispose();
			resolve(pmremCubeUVPacker.CubeUVRenderTarget);
		} );
	});
};

const textureCache = {};
function loadTextureOnce(url, callback) {
	if(!(url in textureCache)) {
		textureCache[url] = 'loading'
		Loader.loadTexture(url).then(function(tex) {
	    	textureCache[url] = tex;
	    	callback(tex);
	    })	
	} else {
		if(textureCache[url] === 'loading') {
			setTimeout(function() { loadTextureOnce(url, callback) }, 1000);
		} else {
			callback(textureCache[url]);
		}
	}
}

function loadMeshFile(callbackFn, state) {
	let extension = state.filename.split('.').pop().toLowerCase();
	if(extension === 'json') {
		Loader.loadThreeJS(state, callbackFn);
	} else {
		Loader.loadGLTF(state, callbackFn);
	}
}

export {loadEXRMap, loadTextureOnce, loadMeshFile}