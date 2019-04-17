import * as THREE from './lib/three.module.js';
import * as TREE from './lib/tree.js';
import * as Effects from './Effects.js';
import * as Loader from './Loader.js';
import * as MESH_UTILS from './mesh_utils.js';

var GLOBAL_CAMERA = null;
var GLOBAL_SCENE = null;
var GLOBAL_RENDERER = null;
var GLOBAL_ORBIT_CONTROLS = null;
var DEBUG_PHYSICS = false;

var loadedObjects = {};
var physicsDebugObjects = {};
var healthBarSprites = {};

var hdrCubeRenderTarget = null;

var getAnimationMixer = null;
var getAnimationClip = null;

const settings = {
	enableShadows: true,
	shadowResolution: 1024,
	enableAA: false
};

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

const textureCache = {};
const meshInstance = {  //not really instanced but large static
	grass: new THREE.Mesh(new THREE.BufferGeometry(), grassMaterial),
	rock: new THREE.Mesh(new THREE.BufferGeometry(), rockMaterial),
	tree: new THREE.Mesh(new THREE.BufferGeometry(), treeMaterial),
};
meshInstance.grass.customDepthMaterial = customDepthMaterial;
for(let i in meshInstance) {
	meshPostProcess(meshInstance[i]);
}

function loadTextureOnce(url, callback) {
	if(!(url in textureCache)) {
		textureCache[url] = 'loading'
		Loader.loadTexture(url).then(function(tex) {
	    	textureCache[url] = tex;
	    	callback(tex);
	    })	
	} else {
		if(textureCache[url] === 'loading') {
			let u = url;
			let c = callback;
			setTimeout(function() { loadTextureOnce(u, c) }, 1000);
		} else {
			callback(textureCache[url]);
		}
	}
}

/*
	Environment Map - updating all objects to set an env map
*/
function setEnvMapValues(material, envMap, intensity) {
	material["envMap"] = envMap;
	material["envMapIntensity"] = intensity;
	material["needsUpdate"] = true;	
}

function setEnv(ob, envMap, intensity) {
	if('children' in ob && ob.children.length > 0) {
		for(var c in ob.children) {
			setEnv(ob.children[c], envMap, intensity);
		}
	}
	if('material' in ob) {
		if(Array.isArray(ob.material)) {
			for(let k = 0; k < ob.material.length; k++) { setEnvMapValues(ob.material[k], envMap, intensity); }
		} else {
			setEnvMapValues(ob.material, envMap, intensity);
		}
	}
}

function updateCubeMaps() {
	if(!hdrCubeRenderTarget) return;

	const intensity = 10000.0;

    for(var k in loadedObjects) {
    	setEnv(loadedObjects[k], hdrCubeRenderTarget.texture, intensity);
    }
    const globalMaterials = [grassMaterial, rockMaterial, treeMaterial];
    for(let i in globalMaterials) {
		setEnvMapValues(globalMaterials[i], hdrCubeRenderTarget.texture, intensity);
	}
};

function loadEXRMap() {
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
			pmremGenerator.update( GLOBAL_RENDERER );

			var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker( pmremGenerator.cubeLods );
			pmremCubeUVPacker.update( GLOBAL_RENDERER );

			hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;

			hdrCubeMap.dispose();
	        updateCubeMaps();

			resolve(pmremCubeUVPacker.CubeUVRenderTarget);
		} );
	});
};

const loaders = {
	"camera": loadCamera,
	"animatedMesh": loadGLTF,
	"library": loadGLTF,
	"sphere": createSphere,
	"box": createBox,
	"heightField": createWorld,
	"tree": createTree,
	"grass": createGrass,
	"rock": createRock,
	"brick": createBox,
	"cone": createCone,
	"3dText": create3DTextState,
	"light": createThreeLight
}

function createThreeLight(state, id, eventHandler, gameState) {
	//state.lightType;
	//const light = createLight([state.x, state.y, state.z], [0,0,0], settings);
	const pos = [state.x, state.y, state.z];
	const tar = [0,0,0]
	//const light = createSpotLight(pos, tar, settings);
	const light = createRectLight(pos);
	//const light = createPointLight(pos, {...settings, enableShadows: false})
	light.intensity = 20000;
	light.distance = 1000;

	var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 2.0 );
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
	loadedObjects[id] = mesh;
	
}

function meshPostProcess(threeObject) {
	if(threeObject.geometry) {
		threeObject.castShadow = true;
		threeObject.receiveShadow = true;
	}
	if(threeObject.children.length > 0) {
		for(let i = 0; i < threeObject.children.length; i++) {
			meshPostProcess(threeObject.children[i]);
		}
	}
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
	loadedObjects[id] = mesh;
    loadTextureOnce('textures/ground_hhh316.jpg', function(tex) {
	    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	    tex.offset.set( 0, 0 );
	    tex.repeat.set( 4, 4 );
    	groundMaterial.map = tex;
    	groundMaterial.bumpMap = tex;
    	groundMaterial.bumpScale = 0.05;
    	groundMaterial.needsUpdate = true;
    })
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
	loadedObjects[id] = mesh;
	loadTextureOnce('textures/stone1.jpeg', function(tex) {
    	rockMaterial.map = tex;
    	rockMaterial.bumpMap = tex;
    	rockMaterial.bumpScale = 0.05;
    	rockMaterial.needsUpdate = true;
    });
}

var cachedSphereGeometry = new THREE.SphereGeometry(1.0, 12, 12);
function createSphere(state, id) {
	loadedObjects[id] = new THREE.Mesh(
    	cachedSphereGeometry,
    	defaultMaterial
    );
    loadedObjects[id].scale.set(state.radius, state.radius, state.radius);
}

var cachedConeGeometry = new THREE.ConeGeometry();
function createCone(state, id) {
	loadedObjects[id] = new THREE.Mesh(
    	cachedConeGeometry,
    	defaultMaterial
    );
    loadedObjects[id].scale.set(state.radius, state.height, state.radius);
}

function createBox(state, id) {
	loadedObjects[id] = new THREE.Mesh(
    	new THREE.BoxGeometry( state.x, state.y, state.z ),
    	defaultMaterial
    );
}

function create3DTextState(state, id) {
	//makeTextSprite("Z", {backgroundColor: {r: 0.9, g: 0.9, b: 1.0, a: 1.0}});
	loadedObjects[id] = makeTextSprite(state.string, {backgroundColor: {r: 0.9, g: 0.9, b: 1.0, a: 1.0}});
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

    loadedObjects[id] = mesh;
    loadedObjects[id].rotation.y = Math.random() * 3.1415;

    loadTextureOnce('textures/flower1.png', function(tex) {
    	grassMaterial.map = tex;
    	grassMaterial.needsUpdate = true;
    	customDepthMaterial.map = tex;
    	customDepthMaterial.needsUpdate = true;
    });
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
	loadedObjects[id] = mesh;
    loadTextureOnce('textures/treebark1.jpeg', function(tex) {
    	treeMaterial.map = tex;
    	treeMaterial.needsUpdate = true;
    })
}

function loadCamera(state, id) {
	loadedObjects[id] = GLOBAL_CAMERA
}

function dataCallback(gltf, state, id) {
	if('scale' in state) {
		gltf.scene.scale.set(state.scale, state.scale, state.scale);
	}
	for(var i in gltf.scene.children) {
		gltf.scene.children[i].animations = gltf.animations;
	}
	if('objectName' in state) {	
		//library mode
		for(let i in gltf.scene.children) {
			if(gltf.scene.children[i].name == state.objectName) {
				loadedObjects[id] = gltf.scene.children[i];
				break;
			}
		}
	} else {
		// this path is followed when we loading a gltf character with animation
		loadedObjects[id] = gltf.scene;
	}
	updateCubeMaps();
}

function loadGLTF(state, id) {
	function loaderCallback( gltf ) {
		dataCallback(gltf, state, id);
	}
	loadMeshFile(loaderCallback, state);
}

function loadMeshFile(callbackFn, state) {
	let extension = state.filename.split('.').pop().toLowerCase();
	if(extension === 'json') {
		Loader.loadThreeJS(state, callbackFn);
	} else {
		Loader.loadGLTF(state, callbackFn);
	}
}

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
function createPointLight(pos, settings) {
	var bulbLight = new THREE.PointLight( 0xffee88, 1, 100, 2 );
	bulbLight.position.set( pos[0], pos[1], pos[2] );
	/*var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
	var bulbMat = new THREE.MeshStandardMaterial( {
		emissive: 0xffffee,
		emissiveIntensity: 1,
		color: 0x000000
	});
	var mesh = new THREE.Mesh( bulbGeometry, bulbMat );
	mesh.castShadow = false;
	mesh.receiveShadow = false;
	bulbLight.add( mesh );*/
	if(settings.enableShadows) {
		setupShadows(bulbLight, settings);
	}
	return bulbLight;
}
function createSpotLight(pos, tar, settings) {
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
function setupShadows(light, settings) {
	
	light.castShadow = true;
	light.shadow.mapSize = new THREE.Vector2( settings.shadowResolution, settings.shadowResolution );
	
	light.shadow.camera.fov = 1.0;
	light.shadow.camera.near = 0.1;
	light.shadow.camera.far = 50.0;
	//light.shadow.bias = 0.00075;
	//light.shadow.radius = 1;
}
function createLight(pos, tar, settings) {
	
	//var bulbLight = createRectLight(pos);
	var bulbLight = createSpotLight(pos, tar, settings);
	//var bulbLight = createDirectionLight(pos, tar);
	
	//bulbLight.intensity = bulbLuminousPowers["75 lm (15W)"];
	bulbLight.intensity = 5000000;
	bulbLight.distance = 10000;
	return bulbLight;
}
function initRendering(scene, settings, camera) {
	if(settings.usePCSS) {
		// overwrite shadowmap code

		var shader = THREE.ShaderChunk.shadowmap_pars_fragment;

		shader = shader.replace(
			'#ifdef USE_SHADOWMAP',
			'#ifdef USE_SHADOWMAP' +
			document.getElementById( 'PCSS' ).textContent
		);

		shader = shader.replace(
			'#if defined( SHADOWMAP_TYPE_PCF )',
			document.getElementById( 'PCSSGetShadow' ).textContent +
			'#if defined( SHADOWMAP_TYPE_PCF )'
		);

		THREE.ShaderChunk.shadowmap_pars_fragment = shader;
	}

	var renderer = new THREE.WebGLRenderer( { antialias: settings.enableAA } );
    var container = document.createElement( 'div' );
    document.body.appendChild( container );

    // this.jsonloader = new THREE.JSONLoader();
    // this.loader = new Loader();

	renderer.physicallyCorrectLights = true;
	
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.shadowMap.enabled = true;
	renderer.toneMapping = THREE.Uncharted2ToneMapping;
	
	renderer.toneMappingExposure = Math.pow(0.31, 8.0);  // if you want to see
	//renderer.toneMappingExposure = Math.pow(0.31, 1.0);
    renderer.setClearColor( 0x050505 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.autoClear = false;
    renderer.shadowMap.enabled = settings.enableShadows;
    if(settings.softShadows) {
    	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.appendChild( renderer.domElement );
    
    var cubeCamera = new THREE.CubeCamera( 0.01, 1000, settings.cubeMapResolution || 128 );

	// Setup render pass
	var renderPass = new Effects.RenderPass( scene, camera );

	// Setup SSAO pass
	var ssaoPass = new Effects.SSAOPass( scene, camera );
	ssaoPass.renderToScreen = true;

	ssaoPass.uniforms["cameraNear"] = { value: 0.1 };
	ssaoPass.uniforms["cameraFar"] = { value: 10 };
	ssaoPass.uniforms["radius"] = { value: 64 };
	ssaoPass.uniforms["onlyAO"] = { value: 0 };
	ssaoPass.uniforms["aoClamp"] = { value: 0.0 };
	ssaoPass.uniforms["lumInfluence"] = { value: 0.1 };

	// Add pass to effect composer
	var effectComposer = new Effects.EffectComposer( renderer );
	effectComposer.addPass( renderPass );
	effectComposer.addPass( ssaoPass );

	// document.body.appendChild( WEBVR.createButton( renderer ) );

    var onWindowResize = function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );

		// Resize renderTargets
		ssaoPass.setSize( window.innerWidth, window.innerHeight );
		var pixelRatio = renderer.getPixelRatio();
		var newWidth  = Math.floor( window.innerWidth / pixelRatio ) || 1;
		var newHeight = Math.floor( window.innerHeight / pixelRatio ) || 1;
		effectComposer.setSize( newWidth, newHeight );
    };
    window.addEventListener( 'resize', onWindowResize, false );

    GLOBAL_RENDERER = renderer;

    return {
    	renderer: renderer, 
    	container: container, 
    	cubeCamera: cubeCamera, 
    	renderPass: renderPass,
    	ssaoPass: ssaoPass,
    	effectComposer: effectComposer,
    	animationMixers: []
    };
};

function setupLighting(settings) {
	//this.spot1 = createLight([0.5, 0, -4], [0, -2.5, 0]);
	//this.spot2 = createLight([0.5, 0, 2], [0, -2.5, 0]);
	return createLight([2, 5, 30], [0,0,0], settings);
}

function createRenderFunction(sceneData, scene, camera, useSSAO) {
	function render() {
	    sceneData.renderer.clear();
	    if(useSSAO) {
	    	sceneData.effectComposer.render();
	    } else {
	    	GLOBAL_RENDERER.render( GLOBAL_SCENE, GLOBAL_CAMERA );
	    }
	};
	return render;
}

function createHealthBar() {
    var sprite = new THREE.Sprite();
    sprite.scale.set( 2.0, 0.1, 0.5);
    sprite.position.set(0, 7, 0);
    sprite.material.color = new THREE.Color( 0x00FF00 );
    return sprite;
};

function loadAssets(state, id, eventHandler, gameState) {
	loaders[state.type](state, id, eventHandler, gameState);
}

function createCache(fn) {
	let cache = {}
	function getFromCache(...args) {
		let id = args.join(':');
		if(id in cache) {
			return cache[id];
		}
		return cache[id] = cache[id] || fn(...args);
	}
	return getFromCache;
}
function createMixer(id) {
	return new THREE.AnimationMixer(loadedObjects[id].children[1]);
}

function createClip(id, animationName) {
	return getAnimationMixer(id).clipAction(animationName);
}

function updateObject(renderState, entity, threeObject) {
	threeObject.position.set(entity.x, entity.y, entity.z);
	if('rotation' in entity) {
		if('w' in entity.rotation) {
			threeObject.quaternion.set( 
				entity.rotation.x, entity.rotation.y, entity.rotation.z, entity.rotation.w 
			)
		} else {
			threeObject.rotation.set( 
				entity.rotation.x, entity.rotation.y, entity.rotation.z
			)
		}
	}
	if('offsetY' in renderState && !(renderState.ignoreOffset)) {
		tempThreeVector1.set(renderState.offsetX, renderState.offsetY, renderState.offsetZ).applyQuaternion(threeObject.quaternion);
		threeObject.position.add(tempThreeVector1);
		/*ent = {
			...entity,
			x: ent.x + state.offsetX, 
			y: ent.y + state.offsetY, 
			z: ent.z + state.offsetZ
		}*/
	}
}

function animateObject(state, id, gameState) {
	if(!('currentAnimation' in state)) {
		getAnimationClip(id, gameState.animation[id].animationName).play();
		return {
			...state,
			currentAnimation: gameState.animation[id].animationName
		};
	}
	if(state.currentAnimation !== gameState.animation[id].animationName) {
		getAnimationClip(id, state.currentAnimation).stop();
		getAnimationClip(id, gameState.animation[id].animationName).play();
		return {
			...state,
			currentAnimation: gameState.animation[id].animationName
		};
	}
	getAnimationMixer(id).update(0.032);
	return state;
}

function updateCamera(state, id, eventHandler, gameState) {
	if(id in gameState.input) {
		if(gameState.input[id].buttons[2]) {
			console.log("changing camera to sexycam");
			return {...state, type: 'sexycam'}
		} else if(gameState.input[id].buttons[3]) {
			console.log("changing camera to followcam");
			return {...state, type: 'follow'}
		}
	}
	if(state.type == 'follow') {
		if(GLOBAL_ORBIT_CONTROLS) {
			GLOBAL_ORBIT_CONTROLS.dispose();
			GLOBAL_ORBIT_CONTROLS = null;
		}
		return state;
	} else {
		if(!GLOBAL_ORBIT_CONTROLS) {
			GLOBAL_ORBIT_CONTROLS = new THREE.OrbitControls( GLOBAL_CAMERA, document.getElementsByTagName('canvas')[0] );
			GLOBAL_ORBIT_CONTROLS.enableZoom = true;
			GLOBAL_ORBIT_CONTROLS.enableKeys = true;
		}
		if(state.entityName in loadedObjects) {
			//calculate delta is probablt backwards
			tempThreeVector2.copy(loadedObjects[state.entityName].position).sub(GLOBAL_ORBIT_CONTROLS.target);
			GLOBAL_ORBIT_CONTROLS.target.copy(loadedObjects[state.entityName].position);
			GLOBAL_ORBIT_CONTROLS.target.y += 1.15;
		}
		GLOBAL_ORBIT_CONTROLS.update();
		return state;
	}
	return state;
}

function createDebugAxis() {
	var axis = new THREE.AxesHelper();
	//var X = create3DText("X", 1.0, 0.5, 0xFFEEEE, 1, 0, 0);
	var X = makeTextSprite("X", {backgroundColor: {r: 1.0, g: 0.9, b: 0.9, a: 1.0}});
	var Y = makeTextSprite("Y", {backgroundColor: {r: 0.9, g: 1.0, b: 0.9, a: 1.0}});
	var Z = makeTextSprite("Z", {backgroundColor: {r: 0.9, g: 0.9, b: 1.0, a: 1.0}});
	X.position.set(1,0,0); Y.position.set(0,1,0); Z.position.set(0,0,1);
	return axis.add(X).add(Y).add(Z);
	//return axis;
}

const physicsDebugMaterial = new THREE.MeshStandardMaterial({ 
	wireframe: true, emissive: new THREE.Color(0xFFFFFF)
});
function createPhysicsDebugMesh(state) {
	if(state.shape.type == 'box') {
		return new THREE.Mesh(
	    	new THREE.BoxGeometry( 
	    		state.shape.x * 2.001, 
	    		state.shape.y * 2.001, 
	    		state.shape.z * 2.001
	    	),
	    	physicsDebugMaterial
	    ).add(createDebugAxis());
	}
	if(state.shape.type == 'sphere') {
		return new THREE.Mesh(
	    	new THREE.SphereGeometry(state.shape.radius * 1.001, 8, 8), 
	    	physicsDebugMaterial
	    ).add(createDebugAxis());
	}
	if(state.shape.type == 'capsule') {
		var r = state.shape.radius;
		var m1 = new THREE.Mesh(new THREE.SphereGeometry(r * 1.0001, 12, 6, 0, Math.PI*2, 0, Math.PI/2), physicsDebugMaterial);
		var m2 = new THREE.Mesh(new THREE.SphereGeometry(r * 1.0001, 12, 6, 0, Math.PI*2, 0, Math.PI/2), physicsDebugMaterial);
		var m3 = new THREE.Mesh(new THREE.CylinderGeometry( 
			r * 1.0001, r * 1.0001, state.shape.height, 12, 5, true 
		), physicsDebugMaterial);
	    m1.position.set(0,  state.shape.height*0.5, 0);
	    m2.position.set(0, -state.shape.height*0.5, 0);
	    m2.rotation.x = Math.PI;
	    return new THREE.Object3D().add(m1).add(m2).add(m3).add(createDebugAxis());
	}
	if(state.shape.type == 'cone') {
		return new THREE.Mesh(
	    	new THREE.ConeGeometry(state.shape.radius, state.shape.height), 
	    	physicsDebugMaterial
	    ).add(createDebugAxis());
	}
	return new THREE.Object3D().add(createDebugAxis());
}

var previousEntity = {};
var tempThreeVector1 = new THREE.Vector3();
var tempThreeVector2 = new THREE.Vector3();
var tempThreeVector3 = new THREE.Vector3();
var tempThreeVector4 = new THREE.Vector3();

function calculateBoundsDeep(object3d, min, max) {
	/*
		Deep calculate bounding box of complex objects
	*/
	if(!min) min = [-0.00001, -0.00001, -0.00001];
	if(!max) max = [ 0.00001,  0.00001,  0.00001];
	if(object3d.geometry) {
		object3d.geometry.computeBoundingBox();
		object3d.updateMatrixWorld(true);
		object3d.updateMatrix(true);
		object3d.geometry.boundingBox.min.applyMatrix4(object3d.matrix);
		object3d.geometry.boundingBox.max.applyMatrix4(object3d.matrix);
		min[0] = Math.min(min[0], object3d.geometry.boundingBox.min.x);
		min[1] = Math.min(min[1], object3d.geometry.boundingBox.min.y);
		min[2] = Math.min(min[2], object3d.geometry.boundingBox.min.z);
		max[0] = Math.max(max[0], object3d.geometry.boundingBox.max.x);
		max[1] = Math.max(max[1], object3d.geometry.boundingBox.max.y);
		max[2] = Math.max(max[2], object3d.geometry.boundingBox.max.z);
	}
	if(object3d.children.length > 0) {
		for(let i = 0; i < object3d.children.length; i++) {
			calculateBoundsDeep(object3d.children[i], min, max);
		}
	}
	return [min, max];
}

function renderObject(state, id, eventHandler, gameState) {
	
	if(!GLOBAL_CAMERA || !GLOBAL_SCENE) return state;  // we have not yet been initialized

	/*if(id in loadedObjects && id in gameState.entity) {
		var character = gameState.entity['character1']; //hack
		var entity = gameState.entity[id];
		tempThreeVector1.set(character.x - entity.x, character.y - entity.y, character.z - entity.z);
		const len = Math.abs(tempThreeVector1.length());
		if(id !== 'character1' && len > 10.0 && loadedObjects[id].visible === true) {
			loadedObjects[id].visible === false;
			return state;
		} else {
			loadedObjects[id].visible === true;
		}
	}*/
	let immediate = false;
	if(!(id in loadedObjects)) {
		if(state.loading) {
			return state;
		}
		let newState = {...state, ...{loading: true}};
		loadAssets(newState, id, eventHandler, gameState);
		if(!(id in loadedObjects)) { // For immediatly loaded geom (generated), no need to exit
			return newState;
		}
		immediate = true;
	}
	const instanceable = state.type in meshInstance;

	if(immediate || ((id in loadedObjects) && state.loading)) {
		updateCubeMaps();
		meshPostProcess(loadedObjects[id]);

		GLOBAL_SCENE.add(loadedObjects[id]);

		//Exit if we have no geometry
		if(!loadedObjects[id].geometry && !loadedObjects[id].children.length>0) {
			return {...state, loading: false};
		}

		if(loadedObjects[id].geometry) {
			loadedObjects[id].geometry.computeBoundingBox();
			let min = [99999,99999,99999];
			let max = [-99999,-99999,-99999];
			min[0] = Math.min(min[0], loadedObjects[id].geometry.boundingBox.min.x);
			min[1] = Math.min(min[1], loadedObjects[id].geometry.boundingBox.min.y);
			min[2] = Math.min(min[2], loadedObjects[id].geometry.boundingBox.min.z);
			max[0] = Math.max(max[0], loadedObjects[id].geometry.boundingBox.max.x);
			max[1] = Math.max(max[1], loadedObjects[id].geometry.boundingBox.max.y);
			max[2] = Math.max(max[2], loadedObjects[id].geometry.boundingBox.max.z);
			var bounds = [min, max];
		} else {
			var bounds = calculateBoundsDeep(loadedObjects[id]);
		}
		tempThreeVector1.fromArray(bounds[0]); //min
		tempThreeVector2.fromArray(bounds[1]); //max
		tempThreeVector3.addVectors(tempThreeVector1, tempThreeVector2).multiplyScalar(0.5); //midpoint (center mass)
		tempThreeVector4.subVectors(tempThreeVector2, tempThreeVector3) // mesh offset from center mass

		tempThreeVector3.multiplyScalar(state.scale || 1.0); // scale to setting
		tempThreeVector4.multiplyScalar(state.scale || 1.0);

		//move this to the mesh to instance
		if(instanceable) {
			const ent = gameState.entity[id];
			loadedObjects[id].position.set(ent.x, ent.y, ent.z);
			loadedObjects[id].updateMatrixWorld();
			const newGeom = loadedObjects[id].geometry.clone();
			newGeom.applyMatrix(loadedObjects[id].matrixWorld);
			if(Object.keys(meshInstance[state.type].geometry.attributes).length == 0) {
				meshInstance[state.type].geometry = newGeom;
			} else {
				meshInstance[state.type].geometry = MESH_UTILS.mergeGeometry(
					meshInstance[state.type].geometry, newGeom
				)
				GLOBAL_SCENE.remove(loadedObjects[id]);
			}
			meshInstance[state.type].geometry.computeVertexNormals();
			delete loadedObjects[id];
			loadedObjects[id] = new THREE.Object3D();
		} else {
			if(id in gameState.entity) {
				try {
					updateObject(state, gameState.entity[id], loadedObjects[id]);
				} catch(e){
					console.log(e);
				}
			}
		}

		return {
			...state, 
			loading: false,
			offsetX: -tempThreeVector3.x, offsetY: -tempThreeVector3.y, offsetZ: -tempThreeVector3.z,
			boundsX:  tempThreeVector4.x, boundsY:  tempThreeVector4.y, boundsZ:  tempThreeVector4.z,
			xpos: loadedObjects[id].position.x, ypos: loadedObjects[id].position.y, zpos: loadedObjects[id].position.z,
			xquat: loadedObjects[id].quaternion.x, yquat: loadedObjects[id].quaternion.y, 
			zquat: loadedObjects[id].quaternion.z, wquat: loadedObjects[id].quaternion.w
		};
	}

	if(instanceable) {
		return state;
	}

	if(DEBUG_PHYSICS && !(id in physicsDebugObjects)) {
		if('physics' in gameState && id in gameState.physics && 'shape' in gameState.physics[id]) {
			if('x' in gameState.physics[id].shape || 'radius' in gameState.physics[id].shape) {
				let physicsState = gameState.physics[id];
				let mesh = createPhysicsDebugMesh(physicsState);
				physicsDebugObjects[id] = mesh;
				GLOBAL_SCENE.add(mesh);
			}
		}
	}
	//compare states of deps (memory address compare)
	if(id in gameState.entity && !(id in previousEntity) || previousEntity[id] !== gameState.entity[id]) {
		let ent = gameState.entity[id];
		updateObject(state, ent, loadedObjects[id]);
		previousEntity[id] = gameState.entity[id];
	}

	if(DEBUG_PHYSICS && id in physicsDebugObjects) {
		updateObject({}, gameState.physics[id], physicsDebugObjects[id]);
	}

	if(id in gameState.input && gameState.input[id].buttons[1] === true && loadedObjects[id].children.length > 0) {
		loadedObjects[id].children[1].visible = !loadedObjects[id].children[1].visible;
		return state;
	}

	if(id in gameState.animation) {
		if(!('animations' in state)) {
			const animationNames = loadedObjects[id].children[0].animations.map(x=>x.name);
			console.log(animationNames);
			return {
				...state,
				animations: animationNames
			}
		}
		state = animateObject(state, id, gameState);
	}
	if(id in gameState.stats && gameState.stats[id].health) {
		if(!(id in healthBarSprites)) {
			let sprite = createHealthBar();
			healthBarSprites[id] = sprite;
			//GLOBAL_SCENE.add(healthBarSprites[id]);
			loadedObjects[id].add(sprite);
		}
		const healthRatio = Math.max(0.0001, gameState.stats[id].health / gameState.stats[id].maxHealth);
		healthBarSprites[id].scale.x = healthRatio;
	}
	return state;
}

var render = null;  // the render function...

function init(initialState) {
	GLOBAL_CAMERA = null;
	GLOBAL_SCENE = null;
	GLOBAL_RENDERER = null;
	GLOBAL_ORBIT_CONTROLS = null;
	loadedObjects = {};
	physicsDebugObjects = {};
	hdrCubeRenderTarget = null;
	getAnimationMixer = createCache(createMixer);
	getAnimationClip = createCache(createClip);

	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 100);
	GLOBAL_CAMERA = camera;
	GLOBAL_SCENE = scene;
	for(let i in meshInstance) {
		GLOBAL_SCENE.add(meshInstance[i]);	
	}

	var sceneData = initRendering(scene, settings, camera);
	sceneData.gameState = initialState;

	loadEXRMap();
	initSkyShader();

	render = createRenderFunction(sceneData, scene, camera);
}

function initSkyShader() {
	// Add Sky
	const sky = new THREE.Sky();
	sky.scale.setScalar( 450000 );
	GLOBAL_SCENE.add( sky );

	// Add Sun Helper
	const sunSphere = new THREE.Mesh(
		new THREE.SphereBufferGeometry( 20000, 16, 8 ),
		new THREE.MeshBasicMaterial( { color: 0xffffff } )
	);
	sunSphere.position.y = - 700000;
	sunSphere.visible = false;
	GLOBAL_SCENE.add( sunSphere );

	/// GUI

	var effectController  = {
		turbidity: 10,
		rayleigh: 2,
		mieCoefficient: 0.005,
		mieDirectionalG: 0.8,
		luminance: 1,
		inclination: 0.49, // elevation / inclination
		azimuth: 0.25, // Facing front,
		sun: ! true
	};

	var distance = 400000;

	var uniforms = sky.material.uniforms;
	uniforms[ "turbidity" ].value = effectController.turbidity;
	uniforms[ "rayleigh" ].value = effectController.rayleigh;
	uniforms[ "luminance" ].value = effectController.luminance;
	uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
	uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;

	var theta = Math.PI * ( effectController.inclination - 0.5 );
	var phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

	sunSphere.position.x = distance * Math.cos( phi );
	sunSphere.position.y = distance * Math.sin( phi ) * Math.sin( theta );
	sunSphere.position.z = distance * Math.sin( phi ) * Math.cos( theta );

	//sunSphere.visible = effectController.sun;

	uniforms[ "sunPosition" ].value.copy( sunSphere.position );
}

function renderFunction() {
	render();

	/*
		Clean up aka garbage collect unused game objects from scene
	*/
	for(var objectId in loadedObjects) {
		if(!(objectId in window.gameState.state.render)) {
			GLOBAL_SCENE.remove(loadedObjects[objectId]);
			delete loadedObjects[objectId];
			if(objectId in physicsDebugObjects) {
				GLOBAL_SCENE.remove(physicsDebugObjects[objectId]);
				delete physicsDebugObjects[objectId];
			}
			if(objectId in healthBarSprites) {
				GLOBAL_SCENE.remove(healthBarSprites[objectId]);
				delete healthBarSprites[objectId];
			}
		}
	}
}

export { renderObject, init, updateCamera, renderFunction, loadMeshFile };

