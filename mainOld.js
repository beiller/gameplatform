/*
 * DATA
 */

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var stats;

function World() {
	this.lights = [];
	this.characterMesh = null;
	this.movementDirection = new THREE.Vector2(0,0);
	this.animations = {};
	this.animationNames = [];
	this.drawLights = true;
	this.movementSpeed = 0.05;
	
	this.dynamicObjects = [];
	
	
	this.world = new CANNON.World();
	this.world.gravity.set(0,-9.82,0);
	this.world.broadphase = new CANNON.NaiveBroadphase();
	//this.world.solver.iterations = 10;
    //this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
    //this.world.defaultContactMaterial.contactEquationRegularizationTime = 10;
	
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(37.8, window.innerWidth/window.innerHeight, 0.1, 1000);
	
	this.initRendering();
	this.createGround();
	this.createLights();
	
};
World.prototype.update = function() {
	var dt = 1/60;
	this.world.step(dt);
	
	for(var i in this.dynamicObjects) {
		this.dynamicObjects[i].update();
	}
}
World.prototype.createBody = function(mass, radius, position) {
	var shape = new CANNON.Box(new CANNON.Vec3( radius, radius, radius ));
	var body = new CANNON.Body({
		mass: mass
	});
	body.addShape(shape);
	body.position.set(position[0], position[1], position[2]);
	body.quaternion.setFromAxisAngle(new CANNON.Vec3(-0.5,0.5,0), 20 * (Math.PI / 180));
	this.world.add(body); // Step 3
	var cube = new THREE.Mesh( new THREE.BoxGeometry( radius, radius, radius ), new THREE.MeshPhongMaterial() );
	cube.position.copy(body.position);
	this.scene.add(cube);
	cube.body = body;
	cube.castShadow = true;
	cube.receiveShadow = true;
	cube.update = function() {
		this.position.copy(this.body.position);
		this.quaternion.copy(this.body.quaternion);
	}
	this.dynamicObjects.push(cube);
}
World.prototype.createGround = function() {
	var groundShape = new CANNON.Plane();
	var groundBody = new CANNON.Body({mass: 0});
	groundBody.addShape(groundShape);
	groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1,0,0), 90 * (Math.PI / 180));
	groundBody.position.set(0, -0.25, 0);
	this.world.add(groundBody);
	var geometry = new THREE.PlaneBufferGeometry(500, 500, 16, 16);
	var color = new THREE.ImageUtils.loadTexture('grass.jpg');
	color.wrapS = THREE.RepeatWrapping;
	color.wrapT = THREE.RepeatWrapping;
	color.repeat.set(100,100);
	var material = new THREE.MeshPhongMaterial({
		map: color,
		specular: new THREE.Color(0x090909),
		shininess: 24,
		side: THREE.DoubleSide
	});

	var plane = new THREE.Mesh(geometry, material);
	plane.rotateOnAxis(new THREE.Vector3(-1.0,0.0,0.0), 90 * (Math.PI / 180));
	//plane.castShadow = true;
	plane.receiveShadow = true;
	this.scene.add(plane);
}
World.prototype.createLights = function() {
	var ambientLight = new THREE.AmbientLight(0x101010);
	this.scene.add(ambientLight);
	
	var hemiLight = new THREE.HemisphereLight(0xeeeeff, 0x1f8888, 0.6);
	hemiLight.position.set( 0, 500, 0 );
	this.scene.add(hemiLight);

	var sun = new THREE.DirectionalLight( 0xffffff, 1 );
	var frustrum = 10;
	sun.shadowCameraNear = 10;
	sun.shadowCameraFar = 200;
	sun.shadowCameraLeft = -frustrum;
	sun.shadowCameraRight = frustrum;
	sun.shadowCameraTop = frustrum;
	sun.shadowCameraBottom = -frustrum;
	
	sun.position.set( 0, 10, -25 );
	sun.rotateOnAxis(new THREE.Vector3(1.0,0.0,0.0), 45 * (Math.PI / 180));
	sun.rotateOnAxis(new THREE.Vector3(0.0,1.0,0.0), 180 * (Math.PI / 180));
	sun.castShadow = true;
	sun.shadowDarkness = 0.5;
	//sun.shadowCameraVisible = true; //debug
	sun.shadowMapWidth = 1024;
	sun.shadowMapHeight = 1024;
	sun.shadowBias = -0.0001;
	this.scene.add(sun);
}
World.prototype.initRendering = function() {
	this.renderer = new THREE.WebGLRenderer( {antialias:true} );
	this.renderer.shadowMapEnabled = true;
	this.renderer.shadowMapType = THREE.PCFSoftShadowMap;
	this.renderer.setSize(window.innerWidth, window.innerHeight);
	this.renderer.setClearColor( 0x222222, 1);
	document.body.appendChild(this.renderer.domElement);
}

world = new World();


/*
 * FUNCTIONS
*/
function stopAllAnimations() {
	for(var animation in world.animations) {
		world.animations[animation].stop();
	}
}

function loadJSON(filename, material, callback) {
	loader = new THREE.JSONLoader();
	loader.load( filename, function( geometry ) {
		var mesh = new THREE.SkinnedMesh( geometry, material );
		material.skinning = true;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		world.scene.add( mesh ); 
		world.characterMesh = mesh;
		
		for(var i = 0; i < mesh.geometry.animations.length; i++) {
			world.animations[mesh.geometry.animations[i].name] = new THREE.Animation(
				mesh,
				mesh.geometry.animations[i],
				THREE.AnimationHandler.CATMULLROM
			);
			world.animationNames.push(mesh.geometry.animations[i].name);
		}
		//mesh.add(world.camera);
		//world.camera.translateZ(-5);
		//world.camera.translateY(5);
		var lookat = new THREE.Vector3(0,0,0);
		lookat.copy(mesh.position);
		lookat.y += 1.2;
		//world.camera.lookAt(lookat);
		world.animations['idle'].play();
		callback();
	} );
}

function loadMaterial(diffusePath, specularPath, bumpPath) {
	var color = new THREE.ImageUtils.loadTexture( diffusePath );
	var spec = new THREE.ImageUtils.loadTexture( specularPath );
	var bump = new THREE.ImageUtils.loadTexture( bumpPath );
	//new THREE.MeshBasicMaterial( { side:THREE.BackSide,map:texture,transparency:true, opacity:0.9, depthWrite: false, depthTest: false });
	//may need above for transparent, untested.
	var material = new THREE.MeshPhongMaterial( { 
		map: color,
		specular: new THREE.Color( 0x121212 ),
		shininess: 175, 
		bumpMap: bump, 
		specularMap: spec,
		bumpScale: 0.015,
		transparent: true,
		opacity: 1.0,
		wrapAround: true
	} );
		
	return material;	
}


	
/*
 * Screen setup
 */
stats = new Stats();
stats.domElement.style.position = 'absolute';
stats.domElement.style.top = '0px';
document.body.appendChild( stats.domElement );


function createNPC() {
	var name = "Billy";
	var hitPoints = 100;
	var magicPoints = 10;
	var npc = new Character(name, hitPoints, magicPoints /*, baseResistance, baseAffinities*/ );
}

/*
 * Loading
 */
var material = loadMaterial( 'final.jpg', 'StonesCobble_s.jpg', 'StonesCobble_n.jpg');
loadJSON("stickman.json", material, onDoneLoading);


/*
 * Uh... camera?
 */
orbitControls = new THREE.OrbitControls( world.camera );
orbitControls.damping = 0.2;
world.camera.translateZ(5);
//controls.addEventListener( 'change', render );


/*
 * Event Listener Configuration
 */
window.addEventListener( 'resize', onWindowResize, false );
window.addEventListener( 'mousedown', onDocumentMouseDown, false );
window.addEventListener( 'keydown', onDocumentKeyDown, false );
window.addEventListener( 'keyup', onDocumentKeyUp, false );
window.addEventListener( 'mousewheel', onMouseWheel, false );
window.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

function onWindowResize() {
	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	world.camera.aspect = window.innerWidth / window.innerHeight;
	world.camera.updateProjectionMatrix();

	world.renderer.setSize( window.innerWidth, window.innerHeight );
}

var keymodifier = {}

function keyDown(keyCode) {
	if(keyCode in keymodifier) {
		if(keymodifier[keyCode] == false) {
			
		}
	}
}

var keymap = {
	'keydown': {
		'87': function(){
			world.movementDirection.y += 1.0;
		},
		'83': function(){
			world.movementDirection.y -= 1.0;
		},
		'68': function(){
			world.movementDirection.x -= 1.0;
		},
		'65': function(){
			world.movementDirection.x += 1.0
		}
	},
	'keyup':{
		'87': function(){
			world.movementDirection.y -= 1.0;
		},
		'83': function(){
			world.movementDirection.y += 1.0;
		},
		'68': function(){
			world.movementDirection.x += 1.0;
		},
		'65': function(){
			world.movementDirection.x -= 1.0
		}
	}
}

function onMouseWheel( event ) {
	event.preventDefault();
	event.stopPropagation();
	var delta = 0;
	if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
		delta = event.wheelDelta;
	} else if ( event.detail !== undefined ) { // Firefox
		delta = - event.detail;
	}
	if ( delta > 0 ) {
		camera.translateZ(-1);
	} else {
		camera.translateZ(1);
	}
	scope.update();
	scope.dispatchEvent( startEvent );
	scope.dispatchEvent( endEvent );

}

function onDocumentKeyDown( event ) {
	if((event.keyCode in keymodifier && keymodifier[event.keyCode] == false) || !(event.keyCode in keymodifier)) {
		if (event.keyCode in keymap['keydown']) {
			keymap['keydown'][event.keyCode]();
			keymodifier[event.keyCode] = true;
			animationStateChanged();
		}
	}
}
function onDocumentKeyUp( event ) {
	if ((event.keyCode in keymodifier && keymodifier[event.keyCode] == true) || !(event.keyCode in keymodifier)) {
		if (event.keyCode in keymap['keyup']) {
			keymap['keyup'][event.keyCode]();
			keymodifier[event.keyCode] = false;
			animationStateChanged();
		}
	}
}

function animationStateChanged() {
	var movementVector = world.movementDirection.clone();
	movementVector.normalize();
	stopAllAnimations();
	if(movementVector.y > 0.01) {
	  	world.animations['walk_forwards'].play();		
	}
	if(movementVector.y < -0.01) {
		world.animations['walk_backwards'].play();
	}
	if(movementVector.x > 0.01) {
		world.animations['walk_left'].play();
	}
	if(movementVector.x < -0.01) {
		world.animations['walk_right'].play();
	}
	if(Math.abs(movementVector.x) < 0.1 && Math.abs(movementVector.y) < 0.1) {
		world.animations['idle'].play();
	}	
}

function onDocumentMouseMove( event ) {
	mouseX = ( event.clientX - windowHalfX );
	mouseY = ( event.clientY - windowHalfY );
}

function onDocumentMouseDown( event ) {

}			

var GUIControls = function() {
  this.shininess = 175;
  this.specularColor = [128, 128, 128, 1.0];
  this.bumpScale = 0.015;
  this.opacity = 1.0;
  this.speed = 1.0;

};

function onDoneLoading() {
	requestAnimationFrame(render);
}

var controls = new GUIControls();

window.onload = function() {
  var gui = new dat.GUI();
  gui.add(controls, 'shininess', 0, 255);
  gui.addColor(controls, 'specularColor');
  gui.add(controls, 'bumpScale', 0, 0.1);
  gui.add(controls, 'opacity', 0, 1);
  gui.add(controls, 'speed', 0, 10);
};

var clock = new THREE.Clock();

world.createBody(0.5, 0.5, [0,3,0]);
//world.createBody(1.0, 1.0, [0,3,1.1]);
//world.createBody(1.0, 1.0, [0,2,-1.1]);
//world.createBody(1.0, 1.0, [1.1,3,0.1]);

var animation = function() {
	world.update();
	
	THREE.AnimationHandler.update(clock.getDelta() * controls.speed);
	material.shininess = controls.shininess;
	material.specular = new THREE.Color( controls.specularColor[0]/255, controls.specularColor[1]/255, controls.specularColor[2]/255 );
	material.bumpScale = controls.bumpScale;
	material.opacity = controls.opacity;
	
	var movementVector = world.movementDirection.clone();
	movementVector.normalize();
	movementVector.multiplyScalar(world.movementSpeed);
	world.characterMesh.translateX(movementVector.x);
	world.characterMesh.translateZ(movementVector.y);
	
	//camera.matrixWorld.copy(world.characterMesh.matrixWorld);
	//camera.translateZ(5);
	//world.characterMesh.matrixWorldNeedsUpdate = true;
	//camera.translateZ(5);
}

var render = function () {
	animation();
	world.renderer.render(world.scene, world.camera);
	stats.update();
	requestAnimationFrame(render);
};
