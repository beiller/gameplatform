import * as THREE from '../lib/three.module.js';
import * as TREE from '../lib/tree.js';
import * as LOADER from './loader.js';
import * as MESH_UTILS from '../mesh_utils.js';

const customDepthMaterial = new THREE.MeshDepthMaterial( {
	depthPacking: THREE.RGBADepthPacking, alphaTest: 0.25
});
const grassMaterial = new THREE.MeshStandardMaterial({
	//color: new THREE.Color(0x99CC99),
	roughness: 0.5,
	side: THREE.DoubleSide,
	transparent: true,
	alphaTest: 0.5
});
const rockMaterial = new THREE.MeshStandardMaterial(
	{color: new THREE.Color(0x888890), roughness: 0.65}
)
const treeMaterial = new THREE.MeshStandardMaterial({roughness: 0.85, color: new THREE.Color(0x332525)});
const defaultMaterial = new THREE.MeshStandardMaterial({roughness: 0.5});
const groundMaterial = new THREE.MeshStandardMaterial( { roughness: 0.65 } );

const settings = {
	enableShadows: true,
	shadowResolution: 1024,
	enableAA: false
};

const toneMappingOptions = {
	None: THREE.NoToneMapping,
	Linear: THREE.LinearToneMapping,
	Reinhard: THREE.ReinhardToneMapping,
	Uncharted2: THREE.Uncharted2ToneMapping,
	Cineon: THREE.CineonToneMapping
};
const bulbLuminousPowers = {
	"110000 lm (1000W)": 110000,
	"3500 lm (300W)": 3500,
	"1700 lm (100W)": 1700,
	"800 lm (60W)": 800,
	"400 lm (40W)": 400,
	"180 lm (25W)": 180,
	"75 lm (15W)": 75,
	"20 lm (4W)": 20,
	"Off": 0
};
// ref for solar irradiances: https://en.wikipedia.org/wiki/Lux
const hemiLuminousIrradiances = {
	"0.0001 lx (Moonless Night)": 0.0001,
	"0.002 lx (Night Airglow)": 0.002,
	"0.5 lx (Full Moon)": 0.5,
	"3.4 lx (City Twilight)": 3.4,
	"25 lx (Shade)": 25,
	"50 lx (Living Room)": 50,
	"100 lx (Very Overcast)": 100,
	"350 lx (Office Room)": 350,
	"400 lx (Sunrise/Sunset)": 400,
	"1000 lx (Overcast)": 1000,
	"18000 lx (Daylight)": 18000,
	"50000 lx (Direct Sun)": 50000,
};

function setupShadows(light, settings) {	
	light.castShadow = true;
	light.shadow.mapSize = new THREE.Vector2( settings.shadowResolution, settings.shadowResolution );
	
	light.shadow.camera.fov = 1.0;
	light.shadow.camera.near = 0.1;
	light.shadow.camera.far = 50.0;
	//light.shadow.bias = 0.00075;
	//light.shadow.radius = 1;
}

function createRectLight( pos ) {
	const width = 1.5;
	const height = 1.5;
	var bulbLight = new THREE.RectAreaLight( 0xffee88, 1, width, height );
	bulbLight.position.set( pos[0], pos[1], pos[2] );
	var rectLightMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial() );
	rectLightMesh.scale.x = bulbLight.width;
	rectLightMesh.scale.y = bulbLight.height;
	bulbLight.add( rectLightMesh );
	var rectLightMeshBack = new THREE.Mesh( new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial( { color: 0x080808 } ) );
	rectLightMeshBack.rotation.y = Math.PI;
	rectLightMesh.add( rectLightMeshBack );
	return bulbLight;
}
function createPointLight(pos) {
	var bulbLight = new THREE.PointLight( 0xffee88, 1, 100, 2 );
	bulbLight.position.set( pos[0], pos[1], pos[2] );
	/*if(settings.enableShadows) {
		setupShadows(bulbLight, settings);
		bulbLight.shadow.camera.near = 0.1;
		bulbLight.shadow.camera.far = 50.00;
		//bulbLight.shadow.radius = 1;
	}*/
	return bulbLight;
}
function createSpotLight(pos, tar) {
	var bulbLight = new THREE.SpotLight( 0xffee88, 1, 100, 2 );
	bulbLight.position.set( pos[0], pos[1], pos[2] );
	bulbLight.target.position.set( tar[0], tar[1], tar[2] );
	var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
	var bulbMat = new THREE.MeshStandardMaterial( {
		emissive: 0xffffee,
		emissiveIntensity: 1,
		color: 0x000000
	});
	var mesh = new THREE.Mesh( bulbGeometry, bulbMat );
	mesh.castShadow = false;
	mesh.receiveShadow = false;
	bulbLight.add( mesh );
	if(settings.enableShadows) {
		setupShadows(bulbLight, settings);
	}
	bulbLight.angle = 150.0;
	return bulbLight;
}
function createDirectionLight(pos, settings) {
	var light = new THREE.DirectionalLight( 0xffee88, 1.75 );
	light.position.set( pos[0], pos[1], pos[2] );

	if(settings.enableShadows) {
		setupShadows(light, settings);
	}
	/*light.castShadow = true;
	light.shadow.mapSize.width = 4096;
	light.shadow.mapSize.height = 4096;
	light.shadow.camera.near = 2;
	light.shadow.camera.far = 10;*/
	light.shadow.camera.left = -2;
	light.shadow.camera.right = 2;
	light.shadow.camera.top = 2;
	light.shadow.camera.bottom = -2;

	var helper = new THREE.DirectionalLightHelper( light );
	light.add(helper);

	//light.intensity = bulbLuminousPowers["20 lm (4W)"];
	light.intensity = 50000;
	light.distance = 100;

	return light;
}

function createLight(state, lightFunction) {
	if(!lightFunction) lightFunction = createPointLight;
	//state.lightType;
	const pos = [state.x, state.y, state.z];
	const tar = [0,0,0]
	const light = lightFunction(pos, tar);
	light.intensity = 20000;
	light.distance = 1000;

	/*var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 2.0 );
	var bulbMat = new THREE.MeshStandardMaterial( {
		emissive: 0xffffee,
		emissiveIntensity: 10000000,
		color: 0x000000
	});
	var mesh = new THREE.Mesh( bulbGeometry, bulbMat );
	mesh.position.fromArray(pos);
	mesh.castShadow = false;
	mesh.receiveShadow = false;
	//scene.add(mesh);
	light.position.set(0,0,0);
	mesh.add(light);
	return mesh;*/
	return light;
}

function createThreeLight(state, id, eventHandler, gameState) {
	const mesh = createLight(state);
    return mesh;
}

function createWorld(state, id, eventHandler, gameState) {
	const wSeg = gameState.physics[id].shape.terrainWidthExtents;
	const hSeg = gameState.physics[id].shape.terrainDepthExtents;
	const width = gameState.physics[id].shape.x;
	const height = gameState.physics[id].shape.z;
	const heightMap = gameState.physics[id].shape.heightMapData; 

	const simp = new MESH_UTILS.SimplexNoise();
	const scale = 50.0;
	/*function vertexFunction(x, y, z) {
		const sY = simp.noise3d((x/width)*scale, y, (z/height)*scale);
		return [x, (sY-0.5)*0.5, z];
	}*/
	function vertexFunction(x, y, z) {
		return [x, heightMap[x][z], z];
	}

	const pmesh = new THREE.PlaneBufferGeometry( wSeg, hSeg, width - 1, height - 1);
    pmesh.rotateX( -Math.PI / 2 );
    var vertices = pmesh.attributes.position.array;
    for ( var i = 0, j = 0, l = vertices.length; i < l; i++, j += 3 ) {
            vertices[ j + 1 ] = heightMap[i];
    }
	pmesh.computeVertexNormals();
	
	const mesh = new THREE.Mesh(
		pmesh, 
		groundMaterial
	);
    LOADER.loadTextureOnce('/game_fp/textures/ground_hhh316.jpg', function(tex) {
	    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	    tex.offset.set( 0, 0 );
	    tex.repeat.set( 4, 4 );
    	groundMaterial.map = tex;
    	groundMaterial.bumpMap = tex;
    	groundMaterial.bumpScale = 0.05;
    	groundMaterial.needsUpdate = true;
    })
    return mesh;
}

function createRock(state, id) {
	const iter = 1;
	const radius = (Math.random() * 0.6) + 0.3;
	const simp = new MESH_UTILS.SimplexNoise();
	const scale = 150.0;
	function vertexFunction(x, y, z) {
		const sX = simp.noise3d(x, 0, 0) - 0.5;
		const sY = simp.noise3d(x, y, z) - 0.5;
		const sZ = simp.noise3d(0, 0, z) - 0.5;
		const scale = 0.2;
		return [scale*sX+x, scale*sY+y, scale*sZ+z];
	}

	const gmesh = new THREE.IcosahedronGeometry( radius, iter )
	for(let i = 0; i < gmesh.vertices.length; i++) {
		gmesh.vertices[i].fromArray(vertexFunction(gmesh.vertices[i].x, gmesh.vertices[i].y, gmesh.vertices[i].z));
	}
	gmesh.computeVertexNormals();
	const pmesh = new THREE.BufferGeometry().fromGeometry( gmesh ) ;

	const mesh = new THREE.Mesh(
		pmesh, rockMaterial
	);
	LOADER.loadTextureOnce('/game_fp/textures/stone1.jpeg', function(tex) {
    	rockMaterial.map = tex;
    	rockMaterial.bumpMap = tex;
    	rockMaterial.bumpScale = 0.05;
    	rockMaterial.needsUpdate = true;
    });
    return mesh;
}

var cachedSphereGeometry = new THREE.SphereGeometry(1.0, 12, 12);
function createSphere(state, id) {
	const mesh = new THREE.Mesh(
    	cachedSphereGeometry,
    	defaultMaterial
    );
    mesh.scale.set(state.radius, state.radius, state.radius);
    return mesh;
}

var cachedConeGeometry = new THREE.ConeGeometry();
function createCone(state, id) {
	const mesh = new THREE.Mesh(
    	cachedConeGeometry,
    	defaultMaterial
    );
    mesh.scale.set(state.radius, state.height, state.radius);
    return mesh;
}

function createCapsule(state, id) {
	var r = state.radius;
	var g1 = new THREE.SphereGeometry(r, 8, 6, 0, Math.PI*2, 0, Math.PI/2).translate(0, ( state.height*0.25), 0);
	var g2 = new THREE.SphereGeometry(r, 8, 6, 0, Math.PI*2, 0, Math.PI/2).rotateX(Math.PI).translate(0, (-state.height*0.25), 0);
	var g3 = new THREE.CylinderGeometry( 
		r, r, Math.max(state.height*0.5, 0.00001), 8, 5, true 
	)
	g1.merge(g2);
	g1.merge(g3);
	return new THREE.Mesh(g1, defaultMaterial);
}

function createTorusKnot(state, id) {
	return new THREE.Mesh(
    	new THREE.TorusKnotBufferGeometry( state.radius, state.tube ),
    	defaultMaterial
    );
}

function createBox(state, id) {
	return new THREE.Mesh(
    	new THREE.BoxGeometry( state.x * 2, state.y * 2, state.z * 2 ),
    	defaultMaterial
    );
}

function makeTextTexture( message, parameters ) {
	if ( parameters === undefined ) parameters = {};
	var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "MainFont";
	var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 48;
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 0.1;
	var borderColor = parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
	var canvas = document.createElement('canvas');
	canvas.width = parameters.width || 512;
	canvas.height = parameters.height || 256;
	canvas.lineWidth = 1;
	var context = canvas.getContext('2d');
	context.font = fontsize + 'px ' + fontface;

	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;

	// background color
	context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
	    + backgroundColor.b + "," + backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
	    + borderColor.b + "," + borderColor.a + ")";
	context.textAlign = "center";
	context.lineWidth = borderThickness;

	context.strokeText( message, canvas.width/2, fontsize + 5);
	context.fillText( message, canvas.width/2, fontsize + 5);

	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;
	return texture;
}

function makeTextSprite( message, parameters ) {
	var texture = makeTextTexture(message, parameters);
	const spriteMaterial = new THREE.SpriteMaterial(
	    { map: texture, lights: false }
	);
    var sprite = new THREE.Sprite( spriteMaterial );
    sprite.scale.set(10,5,5);
    return sprite;
};

function create3DTextState(state, id) {
	//makeTextSprite("Z", {backgroundColor: {r: 0.9, g: 0.9, b: 1.0, a: 1.0}});
	return makeTextSprite(state.string, {backgroundColor: {r: 0.9, g: 0.9, b: 1.0, a: 1.0}});
}

function create3DText(string, size, height, colorIntHex, x, y, z) {
	var textGeo = new THREE.TextGeometry(string, {
		size: size,
		height: height
	});
	var color = new THREE.Color(colorIntHex);
	var textMaterial = new THREE.MeshStandardMaterial({ emissive: color });
	var text = new THREE.Mesh(textGeo, textMaterial);
	text.position.set(x, y, z);
	return text;
}

function createDebugAxis() {
	var axis = new THREE.AxesHelper();
	//var X = create3DText("X", 1.0, 0.5, 0xFFEEEE, 1, 0, 0);
	var X = makeTextSprite("X", {backgroundColor: {r: 1.0, g: 0.9, b: 0.9, a: 1.0}});
	var Y = makeTextSprite("Y", {backgroundColor: {r: 0.9, g: 1.0, b: 0.9, a: 1.0}});
	var Z = makeTextSprite("Z", {backgroundColor: {r: 0.9, g: 0.9, b: 1.0, a: 1.0}});
	X.position.set(1,0,0); Y.position.set(0,1,0); Z.position.set(0,0,1);
	axis.add(X).add(Y).add(Z);
	axis.scale.set(0.25, 0.25, 0.25);
	return axis;
}

var cachedGrassGeom = null;
//function createCachedGrassGeom() {
const geometry = new THREE.Geometry();
geometry.faceVertexUvs[0] = [];

function addBlade(geometry, offsetX, offsetZ) {
	const bladeWidth = 1.25;
	const bladeHeight = 1.0;
	const r1 = ((Math.random() -0.5)*2) * 0.25;
	const r2 = ((Math.random() -0.5)*2) * 1.0;
	const r3 = ((Math.random() -0.5)*2) * 0.25;
	const r4 = ((Math.random() -0.5)*2) * 1.0;
	const root = 0.0;

	geometry.vertices.push(new THREE.Vector3( offsetX+bladeWidth+r1,  root+bladeHeight,  offsetZ+r2));  //right top
	geometry.vertices.push(new THREE.Vector3( offsetX,             root,    offsetZ));            //bottom center
	geometry.vertices.push(new THREE.Vector3( offsetX-bladeWidth+r3,  root+bladeHeight,  offsetZ+r4));  //left top

	geometry.faces.push(new THREE.Face3(
		geometry.vertices.length-3, 
		geometry.vertices.length-2, 
		geometry.vertices.length-1,
	));

	geometry.faceVertexUvs[0].push([
		new THREE.Vector2(1,1),
		new THREE.Vector2(0,1),
		new THREE.Vector2(0,0)
	]);
	geometry.uvsNeedUpdate = true;
}
const maxDist = 0.50;
for(let i = 0; i < 5; i++) {
	addBlade(geometry, ((Math.random() -0.5)*2)*maxDist, ((Math.random() -0.5)*2)*maxDist)
}
//addBlade(geometry, 0, 0);
cachedGrassGeom = new THREE.BufferGeometry().fromGeometry( geometry );

function createGrass(state, id) {
	const mesh = new THREE.Mesh(
    	cachedGrassGeom,
    	grassMaterial
    );
    mesh.customDepthMaterial = customDepthMaterial;

    mesh.rotation.y = Math.random() * 3.1415;

    LOADER.loadTextureOnce('/game_fp/textures/flower1.png', function(tex) {
    	grassMaterial.map = tex;
    	grassMaterial.needsUpdate = true;
    	customDepthMaterial.map = tex;
    	customDepthMaterial.needsUpdate = true;
    });
    return mesh;
}

let tree = new TREE.Tree({
    generations : 4,        // # for branch' hierarchy
    length      : 5.0,      // length of root branch
    uvLength    : 20.0,     // uv.v ratio against geometry length (recommended is generations * length)
    radius      : 0.3,      // radius of root branch
    radiusSegments : 5,     // # of radius segments for each branch geometry
    heightSegments : 3      // # of height segments for each branch geometry
});

let treeGeometry = TREE.TreeGeometry.build(tree);
treeGeometry = new THREE.BufferGeometry().fromGeometry( treeGeometry );

function createTree(state, id) {
	let mesh = new THREE.Mesh(
	    treeGeometry, treeMaterial
	);	
	mesh.position.y -= 3.25;
	mesh.rotation.y = Math.random() * 3.1415;
    LOADER.loadTextureOnce('/game_fp/textures/treebark1.jpeg', function(tex) {
    	treeMaterial.map = tex;
    	treeMaterial.needsUpdate = true;
    });
    return mesh;
}

const loaders = {
	//"camera": loadCamera,
	//"animatedMesh": loadGLTF,
	//"library": loadGLTF,
	"sphere": createSphere,
	"box": createBox,
	"heightField": createWorld,
	"tree": createTree,
	"grass": createGrass,
	"rock": createRock,
	"brick": createBox,
	"cone": createCone,
	"capsule": createCapsule,
	"3dText": create3DTextState,
	"light": createThreeLight,
	"axis": createDebugAxis,
	"torusknot": createTorusKnot
}

export {loaders, createLight, createPointLight, createDebugAxis, makeTextTexture}
