define(["lib/three"], function(THREE) {

	texloader = new THREE.TextureLoader();
	jsonloader = new THREE.ObjectLoader();



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
		this.textureCache = {};
	}
	Loader.prototype.loadTexture = function(url) {
		var cache = this.textureCache;
	    return new Promise(function (resolve, reject) {
	    	if(url in cache) {
	    		resolve(cache[url]);
	    	} else {
	        	texloader.load(url, function(texture) { cache[url] = texture; resolve(texture) });
	        }
	    });
	};
	Loader.prototype.loadMesh = function(url) {
	    return new Promise(function (resolve, reject) {
	        jsonloader.load(url, resolve);
	    });
	};
	Loader.prototype.loadJSON = function(url) {
		return loadXHR(url).then(JSON.parse);
	};

	return Loader;
});