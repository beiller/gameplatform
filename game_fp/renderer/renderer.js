import * as THREE from '../lib/three.module.js';
import * as Effects from '../Effects.js';
import * as MESH_UTILS from '../mesh_utils.js';
import * as LOADER from './loader.js';
import * as OBJECTS from './objects.js';

var GLOBAL_CAMERA = null;
var GLOBAL_SCENE = null;
var GLOBAL_RENDERER = null;
var GLOBAL_ORBIT_CONTROLS = null;
var DEBUG_PHYSICS = false;

var hdrCubeRenderTarget = null

var loadedObjects = {};
var physicsDebugObjects = {};
var healthBarSprites = {};

var getAnimationMixer = null;
var getAnimationClip = null;

const settings = {
	enableShadows: true,
	shadowResolution: 1024,
	enableAA: false
};

// TODO deduplicate this
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
const customDepthMaterial = new THREE.MeshDepthMaterial( {
	depthPacking: THREE.RGBADepthPacking, alphaTest: 0.25
});
//end TODO

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

const meshInstance = {  //not really instanced but large static
	grass: new THREE.Mesh(new THREE.BufferGeometry(), grassMaterial),
	rock: new THREE.Mesh(new THREE.BufferGeometry(), rockMaterial),
	tree: new THREE.Mesh(new THREE.BufferGeometry(), treeMaterial),
};
meshInstance.grass.customDepthMaterial = customDepthMaterial;
for(let i in meshInstance) {
	meshPostProcess(meshInstance[i]);
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

function updateCubeMaps(hdrCubeRenderTarget) {
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
		//if it is light type
		if(loadedObjects[id] && !loadedObjects[id].geometry && 'libraryType' in state && state.libraryType == 'light') {
			const light = OBJECTS.createLight({x:0, y:0, z:0}, OBJECTS.createPointLight);
			loadedObjects[id].add(light);
		}
	} else {
		// this path is followed when we loading a gltf character with animation
		loadedObjects[id] = gltf.scene;
	}
	updateCubeMaps(hdrCubeRenderTarget);
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
	if(state.type == 'camera') {
		loadedObjects[id] = GLOBAL_CAMERA;
	} else if(state.type == 'animatedMesh' || state.type == 'library') {
		function loaderCallback( gltf ) {
			dataCallback(gltf, state, id);
		}
		LOADER.loadMeshFile(loaderCallback, state);
	} else {
		loadedObjects[id] = OBJECTS.loaders[state.type](state, id, eventHandler, gameState);
	}
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
		state = {
			...state,
			currentAnimation: gameState.animation[id].animationName
		};
	}
	if(state.currentAnimation !== gameState.animation[id].animationName) {
		getAnimationClip(id, state.currentAnimation).stop();

		const clip = getAnimationClip(id, gameState.animation[id].animationName);
		let loop = THREE.LoopRepeat;
		if('animationLoop' in gameState.animation[id] && gameState.animation[id].animationLoop === false) {
			loop = THREE.LoopOnce;
			clip.clampWhenFinished = true;
		}
		clip.loop = loop;
		clip.play();
		state = {
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
		//return state;
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
		//return state;
	}
	if('exposure' in state && GLOBAL_RENDERER.toneMappingExposure != state.exposure) {
		GLOBAL_RENDERER.toneMappingExposure = state.exposure;
	}
	return state;
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
	    ).add(OBJECTS.createDebugAxis());
	}
	if(state.shape.type == 'sphere') {
		return new THREE.Mesh(
	    	new THREE.SphereGeometry(state.shape.radius * 1.001, 8, 8), 
	    	physicsDebugMaterial
	    ).add(OBJECTS.createDebugAxis());
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
	    return new THREE.Object3D().add(m1).add(m2).add(m3).add(OBJECTS.createDebugAxis());
	}
	if(state.shape.type == 'cone') {
		return new THREE.Mesh(
	    	new THREE.ConeGeometry(state.shape.radius, state.shape.height), 
	    	physicsDebugMaterial
	    ).add(OBJECTS.createDebugAxis());
	}
	return new THREE.Object3D().add(OBJECTS.createDebugAxis());
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
		updateCubeMaps(hdrCubeRenderTarget);
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

	if('animation' in gameState && id in gameState.animation) {
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
	if('stats' in gameState && id in gameState.stats && gameState.stats[id].health) {
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

	LOADER.loadEXRMap(GLOBAL_RENDERER).then(function(rt) { 
		hdrCubeRenderTarget = rt;
		updateCubeMaps(rt);
	});
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
const loadMeshFile = LOADER.loadMeshFile;

export { renderObject, init, updateCamera, renderFunction, loadMeshFile, loadedObjects };
