/*
 * DATA
 */

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var stats;

function World() {
	this.collisionGroups = [
		1,
		2,
		4,
		8,
		16,
		32
	];
	this.lights = [];
	this.movementDirection = new THREE.Vector2(0,0);
	this.animations = {};
	this.animationNames = [];
	this.drawLights = true;
	this.movementSpeed = 0.05;
	
	this.dynamicObjects = [];
	this.animations = {};
	
	this.world = new CANNON.World();
	this.world.gravity.set(0,-9.82,0);
	this.world.broadphase = new CANNON.NaiveBroadphase();
	this.world.solver.iterations = 10;
	this.world.defaultContactMaterial.friction = 0.035;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
    this.world.defaultContactMaterial.contactEquationRegularizationTime = 10;
	
	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(37.8, window.innerWidth/window.innerHeight, 0.1, 1000);
	
	this.initRendering();
	this.createHeightfield();
	//this.createGround();
	this.loadProp("tree.js", new THREE.Vector3(0,0,0));
	//this.loadProp("tree.js", new THREE.Vector3(-20,0,0));
	//this.loadProp("tree.js", new THREE.Vector3(-40,0,0));
	//this.loadProp("tree.js", new THREE.Vector3(-60,0,0));
	//this.loadProp("tree.js", new THREE.Vector3(20,0,0));
	//this.loadProp("tree.js", new THREE.Vector3(40,0,0));
	//this.loadProp("tree.js", new THREE.Vector3(60,0,0));
	this.createLights();

	this.timestep = 0.00;

	this.clock = new THREE.Clock(true);
	
};
World.prototype.getPlayer = function() {
	for(var i = 0; i < this.dynamicObjects.length; i++) {
		if(this.dynamicObjects[i].body.gameType == "player") {
			return this.dynamicObjects[i];
		}
	}
}
World.prototype.update = function() {
	var dt = clock.getDelta();
	this.world.step(Math.min(dt, 0.1));
	
	for(var i in this.dynamicObjects) {
		this.dynamicObjects[i].update();
	}
	THREE.AnimationHandler.update(dt);
}
World.prototype.createHeightfield = function() {

	 // Create a matrix of height values
	var matrix = [];
	var sizeX = 200,
		sizeY = 6;
	for (var i = 0; i < sizeX; i++) {
		matrix.push([]);
		for (var j = 0; j < sizeY; j++) {
			//var height = Math.cos(i/sizeX * Math.PI * 2)*Math.cos(j/sizeY * Math.PI * 2) + 2;
			//if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1)
			//	height = 3;
			var height = Math.random() * 3.25;
			matrix[i].push(height);
		}
	}
	// Create the heightfield
	var hfShape = new CANNON.Heightfield(matrix, {
		elementSize: 5
	});
	var hfBody = new CANNON.Body({ mass: 0 });
	hfBody.addShape(hfShape);
	hfBody.position.set(-sizeX * hfShape.elementSize / 2, -2, sizeY * hfShape.elementSize / 2);
	hfBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -90.0 * (Math.PI / 180));
	hfBody.collisionFilterGroup = this.collisionGroups[0];
	hfBody.collisionFilterMask = this.collisionGroups[0] | this.collisionGroups[1];
	this.world.addBody(hfBody);
	
	var createMeshFromHeightField = function(shape) {
		var geometry = new THREE.Geometry();
		var v0 = new CANNON.Vec3();
		var v1 = new CANNON.Vec3();
		var v2 = new CANNON.Vec3();
		for (var xi = 0; xi < shape.data.length - 1; xi++) {
			for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
				for (var k = 0; k < 2; k++) {
					shape.getConvexTrianglePillar(xi, yi, k===0);
					v0.copy(shape.pillarConvex.vertices[0]);
					v1.copy(shape.pillarConvex.vertices[1]);
					v2.copy(shape.pillarConvex.vertices[2]);
					v0.vadd(shape.pillarOffset, v0);
					v1.vadd(shape.pillarOffset, v1);
					v2.vadd(shape.pillarOffset, v2);
					geometry.vertices.push(
						new THREE.Vector3(v0.x, v0.y, v0.z),
						new THREE.Vector3(v1.x, v1.y, v1.z),
						new THREE.Vector3(v2.x, v2.y, v2.z)
					);
					var i = geometry.vertices.length - 3;
					geometry.faces.push(new THREE.Face3(i, i+1, i+2));
				}
			}
		}
		geometry.computeBoundingSphere();
		geometry.computeFaceNormals();
		/*var color = new THREE.ImageUtils.loadTexture('grass.jpg');
		color.wrapS = THREE.RepeatWrapping;
		color.wrapT = THREE.RepeatWrapping;
		color.repeat.set(100,100);*/
		var material = new THREE.MeshPhongMaterial({
			//map: color,
			color: new THREE.Color(0x002200),
			specular: new THREE.Color(0x090909),
			shininess: 24,
			shading: THREE.FlatShading,
			side: THREE.DoubleSide
		});
		mesh = new THREE.Mesh(geometry, material);
		return mesh;
	}
	var mesh = createMeshFromHeightField(hfShape);
	mesh.position.copy(hfBody.position);
	mesh.quaternion.copy(hfBody.quaternion);
	this.scene.add(mesh);
}
World.prototype.createBody = function(mass, radius, position) {
	var shape = new CANNON.Sphere( radius );
	var body = new CANNON.Body({
		mass: mass
	});
	body.addShape(shape);
	body.position.set(position[0], position[1], position[2]);
	body.collisionFilterGroup = this.collisionGroups[1];
	body.collisionFilterMask = this.collisionGroups[0];// | this.collisionGroups[1];
	body.quaternion.setFromAxisAngle(new CANNON.Vec3(-0.5,0.5,0), 20 * (Math.PI / 180));
	body.fixedRotation = true;
	body.updateMassProperties();
	this.world.add(body); // Step 3
	var cube = new THREE.Mesh( new THREE.SphereGeometry( radius, 12, 12 ), new THREE.MeshBasicMaterial({wireframe: true}) );
	cube.position.copy(body.position);
	body.addEventListener("collide",function(event){
	   event.target.onGround = true;
	})
	//this.scene.add(cube);
	cube.body = body;
	cube.castShadow = true;
	cube.receiveShadow = true;
	cube.update = function() {
		this.position.copy(this.body.position);
		this.quaternion.copy(this.body.quaternion);
	}
	this.dynamicObjects.push(cube);
	return [body, cube];
}
World.prototype.loadProp = function(jsonFileName, position) {
	var loader = new THREE.JSONLoader();
	var scope = this;
	if(position == undefined) {
		var position = new THREE.Vector3(0,0,0);
	}
	loader.load( jsonFileName, function ( geometry, materials ) {
		if(!materials) {
			var material = new THREE.MeshPhongMaterial({
				color: new THREE.Color(0x332211),
				specular: new THREE.Color(0x020202),
				shininess: 24,
				side: THREE.DoubleSide
			});
			materials = [material];
		}
	    var mesh = new THREE.Mesh(geometry, materials[0]);
	    mesh.position.copy(position);
	    mesh.castShadow = true;
		mesh.receiveShadow = true;
	    scope.scene.add(mesh);
	});
}
World.prototype.createGround = function() {
	var groundShape = new CANNON.Plane();
	var groundBody = new CANNON.Body({mass: 0});
	groundBody.addShape(groundShape);
	groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1,0,0), 90 * (Math.PI / 180));
	groundBody.collisionFilterGroup = this.collisionGroups[0];
	groundBody.collisionFilterMask = this.collisionGroups[0] | this.collisionGroups[1];
	groundBody.position.set(0, -4, 0);
	this.world.add(groundBody);
	this.groundBody = groundBody;
	var geometry = new THREE.PlaneBufferGeometry(500, 500, 16, 16);
	var color = new THREE.ImageUtils.loadTexture('grass.jpg');
	color.wrapS = THREE.RepeatWrapping;
	color.wrapT = THREE.RepeatWrapping;
	color.repeat.set(100,100);
	var material = new THREE.MeshPhongMaterial({
		map: color,
		color: new THREE.Color(0x002200),
		specular: new THREE.Color(0x090909),
		shininess: 24,
		side: THREE.DoubleSide
	});

	var plane = new THREE.Mesh(geometry, material);
	plane.rotateOnAxis(new THREE.Vector3(-1.0,0.0,0.0), 90 * (Math.PI / 180));
	plane.position.copy(groundBody.position);
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
	
	sun.position.set( 5, 10, -15 );
	sun.rotateOnAxis(new THREE.Vector3(1.0,0.0,0.0), 85 * (Math.PI / 180));
	sun.rotateOnAxis(new THREE.Vector3(0.0,1.0,0.0), 180 * (Math.PI / 180));
	sun.castShadow = true;
	sun.shadowDarkness = 0.5;
	//sun.shadowCameraVisible = true; //debug
	sun.shadowMapWidth = 1024;
	sun.shadowMapHeight = 1024;
	sun.shadowBias = -0.0001;
	this.scene.add(sun);

	this.sun = sun
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
	var npc = new Character(name, hitPoints, magicPoints, world /*, baseResistance, baseAffinities*/ );
}


/*
 * Uh... camera?
 */
orbitControls = new THREE.OrbitControls( world.camera );
orbitControls.damping = 0.2;
world.camera.translateZ(7);
world.camera.translateY(2.5);
world.camera.lookAt(new THREE.Vector3(0,0,0));
//controls.addEventListener( 'change', render );


/*
 * Event Listener Configuration
 */
window.addEventListener( 'resize', onWindowResize, false );
window.addEventListener( 'mousedown', onDocumentMouseDown, false );
window.addEventListener( 'keydown', onDocumentKeyDown, false );
window.addEventListener( 'keyup', onDocumentKeyUp, false );

function onWindowResize() {
	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	world.camera.aspect = window.innerWidth / window.innerHeight;
	world.camera.updateProjectionMatrix();

	world.renderer.setSize( window.innerWidth, window.innerHeight );
}

var keymodifier = {}

var keymap = {
	'keydown': {
		'87': function(){//w
			PLAYER.movementDirection.z += 1.0;
		},
		'83': function(){//s
			PLAYER.movementDirection.z -= 1.0;
		},
		'68': function(){//a
			PLAYER.movementDirection.x += 1.0;
		},
		'65': function(){//d
			PLAYER.movementDirection.x -= 1.0
		}
	},
	'keyup':{
		'87': function(){
			PLAYER.movementDirection.z -= 1.0;
		},
		'83': function(){
			PLAYER.movementDirection.z += 1.0;
		},
		'68': function(){
			PLAYER.movementDirection.x -= 1.0;
		},
		'65': function(){
			PLAYER.movementDirection.x += 1.0
		}
	}
}

function onDocumentKeyDown( event ) {
	if((event.keyCode in keymodifier && keymodifier[event.keyCode] == false) || !(event.keyCode in keymodifier)) {
		if (event.keyCode in keymap['keydown']) {
			keymap['keydown'][event.keyCode]();
			keymodifier[event.keyCode] = true;
			//animationStateChanged();
		}
	}
}
function onDocumentKeyUp( event ) {
	if ((event.keyCode in keymodifier && keymodifier[event.keyCode] == true) || !(event.keyCode in keymodifier)) {
		if (event.keyCode in keymap['keyup']) {
			keymap['keyup'][event.keyCode]();
			keymodifier[event.keyCode] = false;
			//animationStateChanged();
		}
	}
}

function onDocumentMouseMove( event ) {
	mouseX = ( event.clientX - windowHalfX );
	mouseY = ( event.clientY - windowHalfY );
}

function onDocumentMouseDown( event ) {

}			

/*var GUIControls = function() {
  this.shininess = 175;
  this.specularColor = [128, 128, 128, 1.0];
  this.bumpScale = 0.015;
  this.opacity = 1.0;
  this.speed = 1.0;
};*/

function onDoneLoading() {
	requestAnimationFrame(render);
}

/*var controls = new GUIControls();

window.onload = function() {
  var gui = new dat.GUI();
  gui.add(controls, 'shininess', 0, 255);
  gui.addColor(controls, 'specularColor');
  gui.add(controls, 'bumpScale', 0, 0.1);
  gui.add(controls, 'opacity', 0, 1);
  gui.add(controls, 'speed', 0, 10);
};*/

var clock = new THREE.Clock();
var mass = 2;
var radius = 0.5;
PLAYER = new Character(
	"Billy",
	100,
	10,
	world.createBody(mass, radius, [0,3,0]),
	world,
	null,
	null,
	'gizmo_thunder_ffmodel_upload.js'
);
PLAYER.movementSpeed = 5.0;
PLAYER.body.gameType = "player";
NPC = new BasicAI (
	new Character(
		"Billy",
		100,
		10,
		world.createBody(mass, radius, [12,3,0]),
		world,
		null,
		null,
		'gizmo_thunder_ffmodel_upload.js'
	),
	THREE.Vector2(10, 0)
);
NPC.movementSpeed = 5.0;
NPC2 = new BasicAI (
	new Character(
		"Billy",
		100,
		10,
		world.createBody(mass, radius, [-12,3,0]),
		world,
		null,
		null,
		'gizmo_thunder_ffmodel_upload.js'
	),
	THREE.Vector2(-10, 0)
);
NPC2.movementSpeed = 5.0;


var animation = function() {
	world.update();
	NPC.update();
	NPC2.update();
	PLAYER.update();

	world.camera.position.x = PLAYER.body.position.x;
	world.camera.position.y = PLAYER.body.position.y + 2.5;
}

var render = function () {
	animation();
	world.renderer.render(world.scene, world.camera);
	stats.update();
	requestAnimationFrame(render);
};

render();
