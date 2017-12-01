define(["lib/three"], function(THREE) {

	texloader = new THREE.TextureLoader();
	jsonloader = new THREE.JSONLoader();

	function loadXHR(url) {
	    return new Promise(function (resolve, reject) {
	        var xhr = new XMLHttpRequest();
	        url += '?cache=' + new Date().getTime();
	        xhr.open("GET", url);
	        xhr.onload = function(e) { resolve(e.target.response) };
	        xhr.onerror = reject;
	        xhr.send();
	    });
	}

	function Loader() {

	}

	var loaderPromise = {};
	var loaderCache = {};

	Loader.prototype.loadTexture = async function(url) {
		if(url in loaderPromise) {
			await loaderPromise[url];
		}
		if(url in loaderCache) {
			return loaderCache[url];
		}
	    loaderPromise[url] = new Promise(function (resolve, reject) {
	        texloader.load(url + '?cache=' + new Date().getTime(), resolve);
	    });
	    loaderCache[url] = await loaderPromise[url];
	    return loaderCache[url];
	};

	Loader.prototype.loadMesh = async function(url) {
		if(url in loaderPromise) {
			await loaderPromise[url];
		}
		if(url in loaderCache) {
			return loaderCache[url];
		}
	    loaderPromise[url] = new Promise(function (resolve, reject) {
	        jsonloader.load(url + '?cache=' + new Date().getTime(), function(geometry, materials) {
				var bufferGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
				//THREE.js issue# 6869
		    	bufferGeometry.animations = geometry.animations;
		    	bufferGeometry.bones = geometry.bones;
		        geometry.dispose();
		        delete geometry;
	        	resolve({geometry: bufferGeometry, materials: materials});
	        });
	    });
	    loaderCache[url] = await loaderPromise[url];
	    return loaderCache[url];
	};
	Loader.prototype.loadJSON = function(url) {
		return loadXHR(url).then(JSON.parse);
	};

	return Loader;
});