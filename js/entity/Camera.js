define(["lib/three", 'entity/Entity', "OrbitControls"], function(THREE, Entity, OrbitControls) {

	var qtarget = new THREE.Quaternion();
    var qtarget2 = new THREE.Quaternion();
    var tmpVec1 = new THREE.Vector3(0, -.1, 0);
    var tmpVec2 = new THREE.Vector3(-.1, 0, 0);

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
	    //var cameraProxy = new THREE.Object3D();
	    //cameraProxy.add(camera);
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

	Camera.prototype = Object.assign( Object.create( Entity.prototype ), {
		constructor: Camera,

		defaultMouseMoveFunction: function(e, scope) {
		    var x = e.clientX;
		    var y = e.clientY;
		    var xr = ((x / window.innerWidth) - 0.5) * 2.0;
		    var yr = ((y / window.innerHeight) - 0.5) * 2.0;
		    qtarget.setFromAxisAngle(tmpVec1, xr);
		    qtarget2.setFromAxisAngle(prototype, yr);
		    qtarget.multiply(qtarget2);
		    //cam.quaternion.slerp(qtarget, 0.25);
		    if(scope.mesh.targetQuaternion) {
		    	scope.mesh.targetQuaternion.copy(qtarget);
		    }  
		    scope.mesh.offset = yr;
		},
		defaultCameraUpdateFunction: function () {
			var game = this.game;
			var camera = this.mesh;
			if(this.trackingCharacter in game.characters) {
				if(!this.disableYLock) {
			        this.orbitControls.target.set(
			        	game.characters[this.trackingCharacter].body.getPositionX(),
			        	this.orbitControls.target.y,
			        	game.characters[this.trackingCharacter].body.getPositionZ()
			        );
		    	}
		        if(game.characters[this.trackingCharacter].stateMachine.current != 'playinganimation' && !this.disableYLock) {
		        	camera.position.x = game.characters[this.trackingCharacter].body.getPositionX();
		    	}

		    	game.spot1.position.copy(camera.position);
	    		game.spot1.position.x += 0.5;
	    		game.spot1.position.z -= 1;

		    	game.spot1.target.position.fromArray(game.characters[this.trackingCharacter].body.getPosition());
		    	game.spot1.target.position.y = game.spot1.position.y;


		    	//game.spot1.target.position.copy(game.spot1.position);
				//game.spot1.target.position.z -= 1;
	    		game.spot2.position.x = game.characters[this.trackingCharacter].body.getPositionX() + 0.5;
	    		game.spot2.position.y = camera.position.y;
		    	//game.spot2.target.position.fromArray(game.characters[this.trackingCharacter].body.getPosition());
		    	game.spot2.target.position.copy(game.spot2.position);
		    	game.spot2.target.position.z -= 2.0;
	    	}
	    	this.orbitControls.update();
	    },
		update: function() {
		    this.defaultCameraUpdateFunction();
		    Entity.prototype.update.call(this);
		}
	});

	return Camera;
});