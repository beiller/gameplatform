import * as THREE from './lib/three.module.js';
import * as Effects from './Effects.js';
import * as Loader from './Loader.js';

var GLOBAL_CAMERA = null;
var GLOBAL_SCENE = null;
var GLOBAL_RENDERER = null;
var GLOBAL_ORBIT_CONTROLS = null;
var DEBUG_PHYSICS = true;

var loadedObjects = {};
var physicsDebugObjects = {};
var loaderCallbackFunction = null;
var hdrCubeRenderTarget = null;

var getAnimationMixer = null;
var getAnimationClip = null;

function updateCubeMaps() {
	if(!hdrCubeRenderTarget) return;

    function setEnv(ob, envMap) {
    	if('children' in ob && ob.children.length > 0) {
    		for(var c in ob.children) {
    			setEnv(ob.children[c], envMap);
    		}
    	}
    	if('material' in ob) {
    		ob.material["envMap"] = envMap;
    		ob.material["envMapIntensity"] = 10000.0;
    		ob.material["needsUpdate"] = true;
    	}
    }
    for(var k in loadedObjects) {
    	setEnv(loadedObjects[k], hdrCubeRenderTarget.texture);
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
			//let shader = THREE.ShaderLib.cube;
			//shader.uniforms.tCube.value = hdrCubeRenderTarget;
	        var mesh = new THREE.Mesh(
	        	new THREE.SphereGeometry(50, 60, 40), 
	        	new THREE.MeshStandardMaterial(
	        		{
	        			envMap: hdrCubeRenderTarget.texture,
	        			envMapIntensity: 15000.0,
	        			side: THREE.BackSide,
	        			roughness: 0,
	        			metalness: 1,
	        			refractionRatio: -1.0
	        		}
	        	)
	        );
	        GLOBAL_SCENE.add(mesh);
	        
	        //GLOBAL_SCENE.background = hdrCubeMap;  // TODO not quite working in my version of threejs
	        updateCubeMaps();

			resolve(pmremCubeUVPacker.CubeUVRenderTarget);
		} );
	});
};

const loaders = {
	"camera": loadCamera,
	"animatedMesh": loadGLTF,
	"sphere": createSphere
}

var cachedSphereGeometry = new THREE.SphereGeometry(1.0, 12, 12);
function createSphere(state, id) {
	loadedObjects[id] = new THREE.Mesh(
    	cachedSphereGeometry,
    	new THREE.MeshStandardMaterial(
    		{
    			envMap: hdrCubeRenderTarget.texture,
    			roughness: 0.5,
    		}
    	)
    );
    loadedObjects[id].scale.set(state.radius, state.radius, state.radius);
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
	loadedObjects[id] = gltf.scene;
}
function loadGLTF(state, id) {
	function loaderCallback( gltf ) {
		dataCallback(gltf, state, id);
	}
	Loader.loadGLTF(state.filename, loaderCallback);
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
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
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
    var spriteMaterial = new THREE.SpriteMaterial(
        { map: texture, lights: false }
    );
    var sprite = new THREE.Sprite( spriteMaterial );
    sprite.scale.set(2,1,1.0);
    return sprite;
};

function createRectLight(pos) {
	const width = .5;
	const height = .5;
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
		setupShadows(bulbLight);
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
		setupShadows(bulbLight);
	}
	bulbLight.angle = 150.0;
	return bulbLight;
}
function createDirectionLight(pos, settings) {
	var light = new THREE.DirectionalLight( 0xffee88, 1.75 );
	light.position.set( pos[0], pos[1], pos[2] );

	if(settings.enableShadows) {
		setupShadows(light);
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
function setupShadows(light) {
	
	light.castShadow = true;
	light.shadow.mapSize = new THREE.Vector2( scope.settings.shadowResolution, scope.settings.shadowResolution );
	
	light.shadow.camera.fov = 1.0;
	light.shadow.camera.near = 0.1;
	light.shadow.camera.far = 6;
	light.shadow.bias = 0.00075;
	light.shadow.radius = 1;
}
function createLight(pos, tar) {
	
	//var bulbLight = createRectLight(pos);
	//var bulbLight = createPointLight(pos);
	var bulbLight = createDirectionLight(pos, tar);
	
	//bulbLight.intensity = bulbLuminousPowers["75 lm (15W)"];
	bulbLight.intensity = 50000;
	bulbLight.distance = 100;
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

    setupLighting();

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

function setupLighting() {
	//this.spot1 = createLight([0.5, 0, -4], [0, -2.5, 0]);
	//this.spot2 = createLight([0.5, 0, 2], [0, -2.5, 0]);
	return createLight([2, 1, 4], [0,0,0]);
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
    //var healthRatio = this.characterStats.health / this.characterStats.maxHealth;
    sprite.scale.set( 2.0, 0.1, 0.5);
    sprite.position.set(0, 7, 0);
    sprite.material.color = new THREE.Color( 0x00FF00 );
    //this.armature.add(sprite);
    //this.healthBarMesh = sprite;
    return sprite;
};

function loadAssets(state, id) {
	loaders[state.type](state, id);
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

function updateObject(entity, threeObject) {
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
	getAnimationMixer(id).update(0.016);
	return state;
}

function updateCamera(state, id, eventHandler, gameState) {
	/*var e = eventHandler.getEvent("camera", "all");
	if(e) {
		return {...state, ...e};
	}*/
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
			GLOBAL_ORBIT_CONTROLS.target.copy(loadedObjects[state.entityName].position);
			GLOBAL_ORBIT_CONTROLS.target.y += 1.5;
		}
		GLOBAL_ORBIT_CONTROLS.update();
		return state;
	}
	return state;
}

function create3DText(string, size, height, colorIntHex, x, y, z) {
	var textGeo = new THREE.TextGeometry(string, {
		size: size,
		height: height
	});
	var  color = new THREE.Color(colorIntHex);
	var  textMaterial = new THREE.MeshStandardMaterial({ emissive: color });
	var  text = new THREE.Mesh(textGeo, textMaterial);
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
	return axis.add(X).add(Y).add(Z);
	//return axis;
}

var previousEntity = {};
function renderObject(state, id, eventHandler, gameState) {
	
	if(!GLOBAL_CAMERA || !GLOBAL_SCENE) return state;  // we have not yet been initialized

	if(!(id in loadedObjects)) {
		if(state.loading) {
			return state;
		}
		let newState = {...state, ...{loading: true}};
		loadAssets(newState, id);
		if(DEBUG_PHYSICS) {
			if(id in gameState.physics && 'shape' in gameState.physics[id]) {
				var state = gameState.physics[id];
				var material = new THREE.MeshStandardMaterial({ 
		    		wireframe: true, emissive: new THREE.Color(0xFFFFFF)
		    	});

				if(state.shape.type == 'box') {
					physicsDebugObjects[id] = new THREE.Mesh(
				    	new THREE.BoxGeometry( 
				    		state.shape.x * 2.001, 
				    		state.shape.y * 2.001, 
				    		state.shape.z * 2.001
				    	),
				    	material
				    ).add(createDebugAxis());
				    GLOBAL_SCENE.add(physicsDebugObjects[id]);
				}
				if(state.shape.type == 'sphere') {
					physicsDebugObjects[id] = new THREE.Mesh(
				    	new THREE.SphereGeometry(state.shape.radius * 1.001, 12, 12), 
				    	material
				    ).add(createDebugAxis());
				    GLOBAL_SCENE.add(physicsDebugObjects[id]);
				}
			}
		}
		return newState;
	}
	if((id in loadedObjects) && state.loading) {
		updateCubeMaps();
		GLOBAL_SCENE.add(loadedObjects[id]);
		return {...state, ...{loading: false}};
	}
	//compare states of deps (memory address compare)
	if(!(id in previousEntity) || previousEntity[id] !== gameState.entity[id]) {
		updateObject(gameState.entity[id], loadedObjects[id]);
		previousEntity[id] = gameState.entity[id];
	}

	if(DEBUG_PHYSICS && id in physicsDebugObjects) {
		updateObject(gameState.physics[id], physicsDebugObjects[id]);
	}

	/*var e = eventHandler.getEvent("render", id);
	if(e && 'doIt' in e) {
		loadedObjects[id].children[1].visible = !loadedObjects[id].children[1].visible;
		return state;
	}*/
	if(id in gameState.input && gameState.input[id].buttons[1] === true && loadedObjects[id].children.length > 0) {
		loadedObjects[id].children[1].visible = !loadedObjects[id].children[1].visible;
		return state;
	}

	if(id in gameState.animation) {
		if(!('animations' in state)) {
			var animationNames = loadedObjects[id].children[0].animations.map(x=>x.name);
			return {
				...state,
				animations: animationNames
			}
		}
		state = animateObject(state, id, gameState);
	}
	if(id in gameState.stats) {
		if(!('healthBarSprite' in state)) {
			let sprite = createHealthBar();
			loadedObjects[id].add(sprite);
			return {...state, healthBarSprite: sprite.id };
		}
		var healthRatio = Math.max(0.0001, gameState.stats[id].health / gameState.stats[id].maxHealth);
		//loadedObjects[state.healthBarSprite].scale.x = healthRatio;
		GLOBAL_SCENE.getObjectById( state.healthBarSprite, true ).scale.x = healthRatio;
	}
	return state;
}

function init(initialState) {
	GLOBAL_CAMERA = null;
	GLOBAL_SCENE = null;
	GLOBAL_RENDERER = null;
	GLOBAL_ORBIT_CONTROLS = null;
	loadedObjects = {};
	physicsDebugObjects = {};
	loaderCallbackFunction = null;
	hdrCubeRenderTarget = null;
	getAnimationMixer = createCache(createMixer);
	getAnimationClip = createCache(createClip);

	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 100);
	GLOBAL_CAMERA = camera;
	GLOBAL_SCENE = scene;

	var settings = {};
	var sceneData = initRendering(scene, settings, camera);
	sceneData.gameState = initialState;
	var light = setupLighting();
	scene.add(light);
	var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 2.0 );
	var bulbMat = new THREE.MeshStandardMaterial( {
		emissive: 0xffffee,
		emissiveIntensity: 1,
		color: 0x000000
	});
	var mesh = new THREE.Mesh( bulbGeometry, bulbMat );
	mesh.castShadow = false;
	mesh.receiveShadow = false;
	scene.add(mesh);
	loadEXRMap();

	const render = createRenderFunction(sceneData, scene, camera);
	function renderFunction() {
		render();
		for(var objectId in loadedObjects) {
			if(!(objectId in window.gameState.state.render)) {
				console.log("Deleting mesh", objectId);
				
				GLOBAL_SCENE.remove(loadedObjects[objectId]);
				delete loadedObjects[objectId];
				if(objectId in physicsDebugObjects) {
					GLOBAL_SCENE.remove(physicsDebugObjects[objectId]);
					delete physicsDebugObjects[objectId];
				}
			}
		}
		requestAnimationFrame(renderFunction);
	}
	requestAnimationFrame(renderFunction);
}

export { renderObject, init, updateCamera };
