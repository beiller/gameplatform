import * as THREE from './three.module.js';
import * as Effects from './Effects.js';
import * as Loader from './Loader.js';

//welcome!

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
	
	//renderer.toneMappingExposure = Math.pow(0.31, 8.0);  // if you want to see
	renderer.toneMappingExposure = Math.pow(0.31, 1.0);
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

function render_fn(sceneData, scene, camera, useSSAO) {
	function render() {
		for(var i in sceneData.animationMixers) {
			sceneData.animationMixers[i].update(0.01);
		}
		// OK garbage collection will destroy the following line beware
		sceneData.gameState = nextState(sceneData.gameState);

	    sceneData.renderer.clear();
	    if(useSSAO) {
	    	sceneData.effectComposer.render();
	    } else {
	    	sceneData.renderer.render( scene, camera );
	    }
	    //setTimeout(function() {
	    	requestAnimationFrame(render);
		//}, 1500);
	};
	return render;
}

function applyEntity(state, id) {
	return state;
}

function applyMove(state, id) {
	return state;
}

function applyAnimation(state, id) {
	return state;
}

function applyRenderGlobals(object3dList, animationMixerList, scene) {
	return function applyRender(state, id) {
		let newState = { ...state }; 
		if(newState.spawnItem) {
			console.log("Spawning", newState);
			scene.add(object3dList[id]);
			object3dList[id].position.set(newState.x, newState.y, newState.z);
			newState = { ...newState, spawnItem: false };
		}
		if(newState.animation) {
			animationMixerList[id].update(0.01);
		}
		//object3dList[id].position.set(state.x, state.y, state.z);
	}
}

// returns a new object with the values at each key mapped using mapFn(value)
function objectMap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(object[key], key)
        return result
    }, {})
}

var events = [];

function emitEvent(systemName, id, state) {
	events.push({system: systemName, state: state, id: id});
}

function nextState(gameState) {
	let newGameState = {"systems": {...gameState.systems}, "state": {}};
	for(var i in events) {
		var event = events[i];
		newGameState["state"][event.id] = {...newGameState["state"][event.id], ...event.state};
	}
	events = [];

	for(var i in gameState.systems) {
		var system = gameState.systems[i];
		var newState = objectMap(newGameState.state, system.func);
		newGameState.state = newState;
	}
	return newGameState;
}

function main() {
	var object3dList = {};
	var animationMixerList = {};
	var scene = new THREE.Scene();

	var initialState = {
		"systems": [
			{ name: "entity", func: applyEntity },
			{ name: "move", func: applyMove },
			{ name: "animation", func: applyAnimation },
			{ name: "render", func: applyRenderGlobals(object3dList, animationMixerList, scene) },
		],
		"state": {}
	};
	
	var camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 100);
	camera.targetQuaternion = new THREE.Quaternion();
	object3dList["camera1"] = camera;
	emitEvent("entity", "camera1", {
		x: 0, y: 3, z: 15
	});
	emitEvent("render", "camera1", { spawnItem: true });

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
	function loaderCallback( gltf ) {
		emitEvent("entity", "character1", {
			x: 0, y: 0, z: 0
		});

		var characterMesh = gltf.scene.children[1];
		characterMesh.animations = gltf.animations;
		var mixer = new THREE.AnimationMixer( characterMesh );
		sceneData.animationMixers.push(mixer);
		object3dList["character1"] = gltf.scene;
		mixer.clipAction( 'DE_Shy' ).play();
		animationMixerList["character1"] = mixer;
		emitEvent("animation", "character1", { animation: 'DE_Shy' });
		emitEvent("render", "character1", { spawnItem: true });


		/*spawn(sceneData.gameState, function() { 
			scene.add(gltf.scene);
			return {"myGameObject1": {...defaultMoveState, object: gltf.scene }};
		});*/
		//scene.add( gltf.scene );
		/*gltf.animations; // Array<THREE.AnimationClip>
		gltf.scene; // THREE.Scene
		gltf.scenes; // Array<THREE.Scene>
		gltf.cameras; // Array<THREE.Camera>
		gltf.asset; // Object*/
		console.log(gltf.scenes);//[0].play();
	}
	Loader.loadGLTF("asdf", loaderCallback);

	requestAnimationFrame(render_fn(sceneData, scene, camera));

	return sceneData;
}

var sceneData = main();
console.log('hello world');

function debugInfo() {
	console.log(sceneData);
}
window.emitEvent = emitEvent;
export { emitEvent }