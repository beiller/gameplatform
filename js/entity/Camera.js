define(["lib/three", 'entity/Entity', "OrbitControls"], function(THREE, Entity, OrbitControls) {
	Camera.prototype = new Entity();
	Camera.prototype.constructor = Camera;
		
	function Camera(mesh, game, dof, ratio, clipNear, clipFar) {
	    var camera = new THREE.PerspectiveCamera(dof, ratio, clipNear, clipFar);
	    camera.position.z = 5;
	    camera.position.y = -3;
	    camera.position.x = 0;
	    camera.targetQuaternion = new THREE.Quaternion();

	    var cameraZoom = 35.0;
	    this.trackingCharacter = 'eve';

	    this.disableYLock = false;
	
	    function displaywheel(e) {
	        var evt=window.event || e; //equalize event object
	        var delta=evt.detail? evt.detail*(-120) : evt.wheelDelta; //check for detail first so Opera uses that instead of wheelDelta
	        //document.getElementById("wheelvalue").innerHTML=delta //delta returns +120 when wheel is scrolled up, -120 when down
	        //cam.position.z += (delta/120*0.1);
	        //cam.position.y += (delta/120*0.005);
	        cameraZoom += delta*0.01;
	        camera.setFocalLength(cameraZoom);
	    }
	    var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x
	    document.addEventListener(mousewheelevt, displaywheel, false);

	    var scope = this;
	    //document.addEventListener("mousemove", function(e) { scope.defaultMouseMoveFunction(e, scope); }, false);
		Entity.prototype.constructor.call(this, camera, game);

		var orbitControls = null;
		function onMouseDown(event) {
			orbitControls.enabled = true;
			console.log('enabled orbit', event.button);
		}
		function onMouseUp(event) {
			orbitControls.enabled = false;
			console.log('disabled orbit');
		}
		game.renderer.domElement.addEventListener("mousedown", onMouseDown);
		game.renderer.domElement.addEventListener("mouseup", onMouseUp);
		orbitControls = new THREE.OrbitControls( camera, game.renderer.domElement );
		this.orbitControls = orbitControls
	}
	Camera.prototype.defaultMouseMoveFunction = function(e, scope) {
	    var x = e.clientX;
	    var y = e.clientY;
	    var xr = ((x / window.innerWidth) - 0.5) * 2.0;
	    var yr = ((y / window.innerHeight) - 0.5) * 2.0;
	    var qtarget = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, -.1, 0), xr);
	    var qtarget2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-.1, 0, 0), yr);
	    qtarget.multiply(qtarget2);
	    //cam.quaternion.slerp(qtarget, 0.25);
	    if(scope.mesh.targetQuaternion) {
	    	scope.mesh.targetQuaternion.copy(qtarget);
	    }  
	    scope.mesh.offset = yr;
	};
	Camera.prototype.defaultCameraUpdateFunction = function () {
		var game = this.game;
		if(this.trackingCharacter in game.characters) {
			if(!this.disableYLock) {
		        this.orbitControls.target.set(
		        	game.characters[this.trackingCharacter].body.getPositionX(),
		        	this.orbitControls.target.y,
		        	game.characters[this.trackingCharacter].body.getPositionZ()
		        );
	    	}
	        if(game.characters[this.trackingCharacter].stateMachine.current != 'playinganimation' && !this.disableYLock) {
	        	this.mesh.position.x = game.characters[this.trackingCharacter].body.getPositionX();
	    	}
	        //this.mesh.position.y = game.characters[this.trackingCharacter].body.getPositionY();
    	}
    	this.orbitControls.update();
    };
	Camera.prototype.update = function() {
	    this.defaultCameraUpdateFunction();
	};
	return Camera;
});