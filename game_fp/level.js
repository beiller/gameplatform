import * as ROT from './lib/rot.js';  // dungeon generation library
import * as LOADER from './renderer/loader.js'; 
import * as ENGINE from './engine.js';
import * as THREE from './lib/three.module.js';
import * as MESHUTILS from './mesh_utils.js';

const legacyChars = {
	"animation": { animationName: 'idle', playingAnimation: true,
		animations: {
			special: 'block',
			run: 'walk',
			idle: 'idle',
			dead: 'fall_backwards',
			attack: 'attack'
		}
	}
}
const renderLookup = {
	type: "animatedMesh", filename: "asdfake.json", jsonType: "character", lookup: "marie_rose_v2"
}
const marie = {
	...legacyChars, "render": { ...renderLookup, lookup: "marie_rose_v2" },
}
const sarah = {
	...legacyChars, "render": { ...renderLookup, lookup: "sarah" },
}
const cicero = {
	...legacyChars, "render": { ...renderLookup, lookup: "cicero" },
}
const defender = {
	"animation": {},
	"render": { 
		type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.265
	},
}
const zoey = {
	"animation": { animationName: 'idle', playingAnimation: true,
		animations: {
			special: 'walk',
			run: 'walk',
			idle: 'idle',
			dead: 'dead',
			attack: 'attack'
		}
	},
	"render": { 
		type: "animatedMesh", filename: "zoey.glb"
	},
}
const jessica = {
	"animation": { animationName: 'idle', playingAnimation: true,
		animations: {
			special: 'mbate',
			run: 'walk',
			idle: 'idle',
			dead: 'dead',
			attack: 'attack'
		}
	},
	"render": { type: "animatedMesh", filename: "jessica.glb" }
}

function generateCharacter(xPos, yPos) {
	var xPos = xPos || (Math.random()-0.5)*2*20;
	var zPos = yPos || (Math.random()-0.5)*2*20;
	return {
		...zoey,
		"entity": {x: xPos, y: 0, z: zPos },
		"collision": { type: "ouchie" },
		"ai": { x: 1.0, y: 0.2, mode: 2 },
		"input": { },
		"magic": null,
		"motion": {fx: 0, fy: 0, fz: 0},
		"physics": {x: xPos, y: 0.8, z: zPos, 
			shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
			mass: 45.35, damping: 0.9, lockRotation: true
		},
		"stats": {health: 10, maxHealth: 10}
	}
}

function toTriangles(geometry) {
	const vertices = geometry.vertices;
	const triangles = [];
	let i = 0;
	for ( i = 0; i < geometry.faces.length; i++ ) {
		const face = geometry.faces[i];
		if (!( 'd' in face )) {
			triangles.push([
				{ x: vertices[face.a].x, y: vertices[face.a].y, z: vertices[face.a].z },
				{ x: vertices[face.b].x, y: vertices[face.b].y, z: vertices[face.b].z },
				{ x: vertices[face.c].x, y: vertices[face.c].y, z: vertices[face.c].z }
			]);
		} else if ( 'd' in face ) {  // The face is a quad
			triangles.push([
				{ x: vertices[face.a].x, y: vertices[face.a].y, z: vertices[face.a].z },
				{ x: vertices[face.b].x, y: vertices[face.b].y, z: vertices[face.b].z },
				{ x: vertices[face.d].x, y: vertices[face.d].y, z: vertices[face.d].z }
			]);
			triangles.push([
				{ x: vertices[face.b].x, y: vertices[face.b].y, z: vertices[face.b].z },
				{ x: vertices[face.c].x, y: vertices[face.c].y, z: vertices[face.c].z },
				{ x: vertices[face.d].x, y: vertices[face.d].y, z: vertices[face.d].z }
			]);

		}
	}
	return triangles;
}
function toTrianglesFromBuffer(geometry) {
	const triangles = [];
	const triangle = [null, null, null];
	for ( let i = 0; i < geometry.index.count; i += 3 ) { 
		for(let j = 0; j < 3; j++) {
			const x = geometry.attributes.position.array[geometry.index.array[i+j]];
			const y = geometry.attributes.position.array[geometry.index.array[i+j]+1];
			const z = geometry.attributes.position.array[geometry.index.array[i+j]+2];
			triangle[j] = {x: x, y: y, z: z};
		}
		triangles.push([...triangle]);
	}
	return triangles;
}

function level2() {
	var initialState = {
		"state": {
			"camera1": {
				"input": { "controllerId": "0" },  // needs input to toggle modes
				"entity": {x: 0, y: 4, z: 2, rotation: {x: -0.95, y: 0.0, z: 0.0}},
				"camera": {fov: 60.0, type: 'follow', entityName: 'character1' },
				"render": {type: "camera"},
			},
			/*"character1": {
				...jessica,
				"entity": { x: 1, y: 0.2, z: 2 },
				"collision": { type: "ouchie" },
				"magic": null,
				"input": { "controllerId": "0" },
				"motion": {fx: 0, fy: 0, fz: 0},
				"physics": {x: 1, y: 0.2, z: 2, 
					shape: {type: "capsule", radius: 0.3, margin: 0.001},
					mass: 45.35, damping: 0.9, lockRotation: true
				},
				"stats": {health: 50, maxHealth: 50}
			},*/
			"character1": {
				...jessica,
				"entity": { x: 1, y: 0.8, z: 2 },
				"animation": {...jessica.animation, animationName: 'dog_give'}
			},
			"character3": {
				...jessica,
				"entity": { x: 1, y: 0.8, z: 2 },
				"animation": {...jessica.animation, animationName: 'dog_recv'}
			}
		}
	};

	// we load each of these objects and use a square bounding box for it (to create floors/walls/etc)
	// that is why it is per object. If we did the entire thing it wouldnt be explorable
	const groups = [
		"Floor", "Ceiling", "Cube009", "Cube007", "Cube013", "Cube015", "Cube001", "Cube000", "Cube008", "Cube011", "Cube012", "Cube010",
		"Cube006", "Cabinet", "Cabinet001", "Shelves", "Shelves001", "Bed", "Bed001", "Table", "Table001", "Window", "Window001", "Window002"
	];
	for(let i in groups) {
		const group = groups[i];
		initialState.state[group] = {
			"render": {type: "animatedMesh", filename: "/game_fp/bedroom.gltf.glb", objectName: group},
			"physics": {"shape": {type: "box"}, staticObject: true}
		}
	}
	// a hacky way to import lights from a gltf exported file
	initialState.state["Point"] = {
		"render": {type: "animatedMesh", filename: "/game_fp/bedroom.gltf.glb", objectName: "Point", libraryType: "light"},
		"physics": {"shape": {type: "box", x: .1, y: .1, z: .1}, staticObject: true}
	}

	var numCharacters = 0;
	for(var i = 0; i < numCharacters; i++) {
		initialState['state']["character"+(i+999)] = generateCharacter(1,2);
	}

	return initialState;
}

function level1() {
	var initialState = {
		"state": {
			"camera1": {
				"input": { "controllerId": "0" },  // needs input to toggle modes
				"entity": {x: 0, y: 0, z: 0, rotation: {x: -0.95, y: 0.0, z: 0.0}},
				"camera": {fov: 60.0, type: 'follow', entityName: 'character1', offsetY: 0.6, offsetZ: 1.6, exposure: Math.pow(0.31, 7) },
				"render": {type: "camera"},
			},
			"groundplane1": {
				"render": { type: "heightField" },
				"physics": {
					mass: 0, x: 0, y: 0, z: 0, staticObject: true, neverSleep: true,
					shape: {
						type: "heightField", x: 20, z: 20, margin: 0.5,
						terrainWidthExtents: 50, terrainDepthExtents: 50,
						heightMapData: createHeightMap(20, 20, 15)
						//heightMapData: createDungeon(60, 60, -5)
						//heightMapData: generateAFuckingGrid3(60, 60, -5)
					}
				}
			},
      "light1": {
				"entity": {x: -5, y: -9, z: -5 },
				"render": { type: "light", lightType: "spot" }
			},
			"sword": {
				"entity": {x: 1, y: 9, z: 0 },
				"render": { type: "animatedMesh", filename: "/uunp_test/body.json", jsonType: "item", lookup: "firesword" },
				"physics": {x: 1, y: 9, z: 0, shape: { type: "box", y: 0.15 }, mass: 0, noContact: true, kinematic: true},
				"constraint": {},
			},
			"icestaff1": {
				"entity": {x: 0, y: 9, z: 0 },
				"render": { type: "animatedMesh", filename: "/uunp_test/body.json", jsonType: "item", lookup: "icestaff" },
				"physics": {x: 0, y: 9, z: 0, shape: { type: "box" }, mass: 0.25 }
			},
			"character1": {
				...jessica,
				"entity": {x: 0, y: 0, z: 0 },
				"collision": { type: "ouchie" },
				"magic": null,
				"input": { "controllerId": "0" },
				"motion": {fx: 0, fy: 0, fz: 0},
				"physics": {x: 0, y: 2.8, z: 0, 
					//shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
					shape: {type: "capsule", radius: 0.3, margin: 0.001},
					mass: 45.35, damping: 0.9, lockRotation: true
				},
				"stats": {health: 100, maxHealth: 100}
			}
		}
	};

	var numCharacters = 4;
	for(var i = 0; i < numCharacters; i++) {
		initialState['state']["character"+(i+999)] = generateCharacter();
	}

	const tileFunctions = {
		'1': function(x, z, offsetx, offsetz) { return generateTile(x, 0, z, offsetx, offsetz, "tree", false) },
		'2': function(x, z, offsetx, offsetz) { return generateTile(x, 0, z, offsetx, offsetz, "grass", true) },
		'3': function(x, z, offsetx, offsetz) { return generateTile(x, 0, z, offsetx, offsetz, "rock", false) },
		'4': function(x, z, offsetx, offsetz) { return generateTile(x, 0, z, offsetx, offsetz, "brick", false) },
	}

	//gridmap = gridmap.split(',');
	/*const gridmap = generateAFuckingGrid3(70, 70);
	for(let z = 0; z < gridmap.length; z++) {
		for(let x = 0; x < gridmap[z].length; x++) {
			const tileHeight = parseInt(gridmap[z].charAt(x)) + 1;
			const offsetx = gridmap[0].length*0.5;
			const offsetz = gridmap.length*0.5;
			if(gridmap[z].charAt(x) in tileFunctions) {
				initialState['state'][generateId()] = tileFunctions[gridmap[z].charAt(x)](x, z, offsetx, offsetz);
			}
		}
	}*/
	const heightData = initialState.state["groundplane1"].physics.shape.heightMapData;
	const width = initialState.state["groundplane1"].physics.shape.x;
	const depth = initialState.state["groundplane1"].physics.shape.z;
	const widthExtents = initialState.state["groundplane1"].physics.shape.terrainWidthExtents;
	const depthExtents = initialState.state["groundplane1"].physics.shape.terrainDepthExtents;

	const widthInterval = widthExtents / width;
	const depthInterval = depthExtents / depth;

	const types = ["tree", "rock", "grass"];
	const num = [25, 75, 100];

	for(let t = 0; t < types.length; t++) {
		for(let k = 0; k < num[t]; k++) {
			const randomIndex = parseInt(Math.random() * (width * depth));
			const x = parseInt(randomIndex % width);
			const y = heightData[randomIndex];
			const z = parseInt(randomIndex / width);
			initialState['state'][generateId()] = generateTile(
				x * widthInterval - (widthExtents / 2), 
				y, 
				z * depthInterval - (depthExtents / 2), 
				0, 0, types[t], types[t] == "grass");
		}
	}

	return initialState;
}

function generateAFuckingGrid(width, height) {
	let rows = [];
	for(let z = 0; z < height; z++) {
		let cols = []
		for(let x = 0; x < width; x++) {
			if(Math.random() > 0.975) {
				cols.push('1')
			} else if(Math.random() > 0.3) {
				cols.push('2')
			} else if(Math.random() > 0.92) {
				cols.push('3')
			} else {
				cols.push('0')
			}
		}
		rows.push(cols.join());
	}
	return rows;
}

function generateId() {
	return "tile"+(Math.random() * 100.0);
}

function generateTile(x, y, z, offsetx, offsetz, type, noContact) {
	return {
		"entity": {x: x-offsetx, y: y, z: z-offsetz },
		"render": { type: type, x: 1.0, y: 1.0, z: 1.0 },
		"physics": {x: x-offsetx, y: y, z: z-offsetz, 
			shape: {type: "box", x: .5, y: .5, z: .5, margin: 0.00001 },
			mass: 0, staticObject: true, noContact: noContact
		}
	}
}



function generateAFuckingGrid3(w, h, height) {
	const FLOOR_TILE = 1;
	const WALL_TILE = 0;
	function createRoom(sizeX, sizeY) {
		const roomData = [Array(sizeX).fill(WALL_TILE)];
		for(let i = 0; i < sizeY-2; i++) {
			const line = Array(sizeX).fill(WALL_TILE);
			line[0] = line[sizeX-1] = WALL_TILE;
			roomData.push(line);
		}
		roomData.push(Array(sizeX).fill(WALL_TILE));
		return roomData;
	}
	function drawBox(mapData, startX, endX, startY, endY, fill) {
		for(let i = startX; i <= endX; i++) {
			for(let j = startY; j <= endY; j++) {
				//console.log("Setting x="+i+", y="+j, fill);
				mapData[j][i] = fill;
			}
		}
	}
	let DATA = createRoom(w, h);
	var map = new ROT.Digger(w, h, {
		roomWidth: [6, 16],
		roomHeight: [6, 16],
		corridorLength: [3, 6],
		dugPercentage: 0.4,
		timeLimit: 5000
    });
	map.create();
	for(let i = 0; i < map._rooms.length; i++) {
		drawBox(DATA, map._rooms[i]._x1, map._rooms[i]._x2, map._rooms[i]._y1, map._rooms[i]._y2, FLOOR_TILE);
		for(let j in map._rooms[i]._doors) {			
			const arr = j.split(',');
			drawBox(DATA, parseInt(arr[0]), parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[1]), FLOOR_TILE);
		}
	}
	for(let i = 0; i < map._corridors.length; i++) {
		drawBox(
			DATA, 
			Math.min(map._corridors[i]._startX, map._corridors[i]._endX),
			Math.max(map._corridors[i]._startX, map._corridors[i]._endX),
			Math.min(map._corridors[i]._startY, map._corridors[i]._endY),
			Math.max(map._corridors[i]._startY, map._corridors[i]._endY),
			FLOOR_TILE
		);
	}

	let finalData = [];
	for(let i = 0; i < DATA.length; i++) {
		for(let j = 0; j < DATA.length; j++) {
			finalData.push(DATA[j][i] * height);
		}
	}
	return finalData;
}


function add(a,b) { return a+b; }
function div(a,b) { return a/b; }
function getScalarFn(fn1, scalar) {
	function scalarFn(a,b) {
		return fn1(a, scalar);
	}
	return scalarFn;
}
function mapOper(map1, map2, fn) {
	if(!fn) fn = add;
	for(let i = 0; i < map1.length; i++) {
		for(let j = 0; j < map1[0].length; j++) {
			map1[i][j] = fn(map1[i][j], map2[i][j]);
		}
	}
}
function randomChoice(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}
function createHeightMap(width, depth, height) {
	let heightMap = Array(depth).fill().map(() => Array(width).fill(0));
	const options = { 
		born: [1, 3, 5, 6, 7, 8], //{int[]} [options.born] List of neighbor counts for a new cell to be born in empty space
		survive: [4, 5, 6, 7, 8], //{int[]} [options.survive] List of neighbor counts for an existing  cell to survive
		topology: 8, //{int} [options.topology] Topology 4 or 6 or 8
		connected: true //connect loose pieces
	};
	let map = null;
	const iter = 80;
	function setRandomPixels(probability) {
	    for (let i = 0; i < map._width; i++) {
			for (let j = 0; j < map._height; j++) {
				map._map[i][j] = Math.random() < probability ? 1 : map._map[i][j];
			}
	    }
	}
	const borns = [
		[1, 2, 4, 6, 8],
		[1, 3, 5, 7],
		[1, 2, 4, 5, 7],
		[1, 3, 6, 8],
		[1, 3, 5, 6, 7, 8],
		[1, 2, 3, 6, 7, 8],
		[1, 3, 4, 5, 6, 7, 8]
	];
	for (let i=0; i<iter; i++) {
		if(!map) {
			map = new ROT.Cellular(width, depth, options);
			map.randomize(0.0025);
		} else {
			map.setOptions({
				...options, born: randomChoice(borns)
			})
			map.create();
		}
		mapOper(heightMap, map._map, add);
	}
	mapOper(heightMap, map._map, getScalarFn(div, iter));
	let idx = 0;
	let finalData = [];
	
	for(let i = 0; i < heightMap.length; i++) {
		for(let j = 0; j < heightMap.length; j++) {
			finalData.push(heightMap[j][i] * height - height);
		}
	}
	return finalData;
}

function createDungeon(w, h, height) {
	/* create a connected map where the player can reach all non-wall sections */
	var map = new ROT.Cellular(w, h, { 
		born: [5, 6, 7, 8], //{int[]} [options.born] List of neighbor counts for a new cell to be born in empty space
		survive: [4, 5, 6, 7, 8], //{int[]} [options.survive] List of neighbor counts for an existing  cell to survive
		topology: 8, //{int} [options.topology] Topology 4 or 6 or 8
		connected: true //connect loose pieces
	});

	/* cells with 1/2 probability */
	map.randomize(0.5);

	/* make a few generations */
	for (var i=0; i<4; i++) map.create();

	let DATA = [];
	map.connect(null, 1);
	for(let i = 0; i < map._map.length; i++) {
		let row = [];
		for(let j = 0; j < map._map[i].length; j++) {
			row.push(map._map[i][j]);
		}
		DATA.push(row)
		
	}
	//return DATA;
	let finalData = [];
	
	for(let i = 0; i < DATA.length; i++) {
		for(let j = 0; j < DATA.length; j++) {
			finalData.push(DATA[j][i] * height);
		}
	}
	return finalData;
}

function generateHeight( width, depth, minHeight, maxHeight ) {
	/*
		Generate 1d heightmap of width*depth, in a Math.sin pattern (used for debug)
	*/
    var size = width * depth;
    //var data = new Array( size );
    var data = []; //Array.from(Array(depth), () => new Array(width));
    var hRange = maxHeight - minHeight;
    var w2 = width / 2;
    var d2 = depth / 2;
    var phaseMult = 12;
	var p = 0;
    for ( var j = 0; j < depth; j ++ ) {
    	for ( var i = 0; i < width; i ++ ) {
    		var radius = Math.sqrt(
    			Math.pow( ( i - w2 ) / w2, 2.0 ) +
    			Math.pow( ( j - d2 ) / d2, 2.0 ) );
			var height = ( Math.sin( radius * phaseMult ) + 1 ) * 0.5  * hRange + minHeight;
			data[p] = height;
			p++;
		}
    }
    return data;
}

function createEntity(entity, id) {
	if(!id) id = 'baddy'+(Math.random() * 100);
	ENGINE.queueCommand(function(gameState) {
		ENGINE.createEntity(gameState, id, entity);
	});
}

function calculateRigidBodyLength(armature, boneName1, boneName2) {
	const bone1 = armature.getBoneByName(boneName1);
	const bone2 = armature.getBoneByName(boneName2);
	const vec3_end = bone1.position.clone();
	const vec3_temp = bone2.position.clone();
	bone1.getWorldPosition(vec3_temp);
	bone2.getWorldPosition(vec3_end);
	return Math.abs(vec3_temp.sub(vec3_end).length());
}

const vec3_1 = new THREE.Vector3();
const vec3_2 = new THREE.Vector3();
const vec3_3 = new THREE.Vector3();
const qua4_1 = new THREE.Quaternion();
const qua4_2 = new THREE.Quaternion();
const mat4_1 = new THREE.Matrix4();
const mat4_2 = new THREE.Matrix4();

function getRigidBodyWorldCoordinates(armature, boneName) {
	armature.update();
	const boneIndex = findBoneIndex(boneName, armature.bones);
	//recover full THREE stuff from the inverses sent to GPU
	// this seems to be the only accurate method. Simpler is best and portability is key
	mat4_1.getInverse(armature.boneInverses[boneIndex]); 
	mat4_1.decompose(vec3_1, qua4_1, vec3_2);
	return [vec3_1.clone(), qua4_1.clone()];
}
function calculateLocalConnectionFromWorld(physicsStateA, physicsStateB, x, y, z) {
	return {
		localA: getLocalCoordiantes(physicsStateA, x, y, z),
		localB: getLocalCoordiantes(physicsStateB, x, y, z)
	}
}

function getLocalCoordiantes(physicsState, x, y, z) {
	const vecA = new THREE.Vector3(physicsState.x, physicsState.y, physicsState.z);
	const rA = physicsState.rotation;
	const quaA = new THREE.Quaternion(rA.x, rA.y, rA.z, rA.w);
	const vecWorld = new THREE.Vector3(x, y, z);
	const scale = new THREE.Vector3(1,1,1);
	const m1 = new THREE.Matrix4().compose(vecA, quaA, scale);
	m1.getInverse(m1.clone());
	return vecWorld.applyMatrix4(m1).toArray();
}

function searchTree(tree, predicate, results) {
	if(!results) { results = []; }
	if(!predicate) { predicate = obj => true }
	const gather = (obj) => {if(predicate(obj)) { results.push(obj) }}
	tree.traverse(gather);
	return results;
}

function findSkinnedMesh(root) {
	return searchTree(root, obj => 'skeleton' in obj);
}


//-=-=-=-=--=-=-=- Map of Rigid Bodies -=-=-=-=--=-=-=-
const twoPI = Math.PI;
const PI2 = Math.PI / 4;
const PI4 = Math.PI / 8;
const EPS = 0.05;
const ARMLEG_TWIST = Math.PI * 0.20;
const THIGH_BEND = Math.PI;
const THIGH_ROTATE = Math.PI/2;
const SPINE_BEND = 0.5;
const SPINE_TWIST = 0.15;
const COLLAR = Math.PI / 8;
const SHLDR = Math.PI;
const KNEE = Math.PI;
const ELBOW = Math.PI;
const FOOT_BEND = Math.PI * 0.35;
const FOOT_TWIST = Math.PI * 0.15;
const HAND_BEND = Math.PI * 0.5;
const HAND_TWIST = Math.PI * 0.15;
const CHEST = 0.25;

const jointData = {
	'xnalara': {
		pairs: [
		["Armature_pelvis", 0.1],
		["Armature_spine_lower", "Armature_spine_upper"],
		["Armature_spine_upper", 0.2],
		["Armature_head_neck_lower", "Armature_head_neck_upper"],
		["Armature_head_neck_upper", 0.1],
		//head?
		["Armature_leg_thighL", "Armature_leg_kneeL"],
		["Armature_leg_kneeL", "Armature_leg_ankleL"],
		["Armature_leg_ankleL", "Armature_leg_toesL"],
		["Armature_leg_toesL", 0.1],

		["Armature_leg_thighR", "Armature_leg_kneeR"],
		["Armature_leg_kneeR", "Armature_leg_ankleR"],
		["Armature_leg_ankleR", "Armature_leg_toesR"],
		["Armature_leg_toesR", 0.1],

		["Armature_arm_shoulder_1L", "Armature_arm_shoulder_2L"],
		["Armature_arm_shoulder_2L", "Armature_arm_elbowL"],
		["Armature_arm_elbowL", "Armature_arm_wristL"],
		["Armature_arm_wristL", 0.1],
		["Armature_arm_shoulder_1R", "Armature_arm_shoulder_2R"],
		["Armature_arm_shoulder_2R", "Armature_arm_elbowR"],
		["Armature_arm_elbowR", "Armature_arm_wristR"],
		["Armature_arm_wristR", 0.1]
		],

		// -=-=-=-=--=-=-=- Map of Joints -=-=-=-=--=-=-=-
		pairs2: [
		["Armature_spine_lower", "Armature_pelvis", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_spine_upper", "Armature_spine_lower", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_head_neck_lower", "Armature_spine_upper", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_head_neck_upper", "Armature_head_neck_lower", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_arm_shoulder_1L", "Armature_spine_upper"],
		["Armature_arm_shoulder_2L", "Armature_arm_shoulder_1L", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_arm_elbowL", "Armature_arm_shoulder_2L", [-PI2, EPS, EPS], [EPS, EPS, EPS]],
		["Armature_arm_wristL", "Armature_arm_elbowL", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_arm_shoulder_1R", "Armature_spine_upper"],
		["Armature_arm_shoulder_2R", "Armature_arm_shoulder_1R", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_arm_elbowR", "Armature_arm_shoulder_2R", [EPS, EPS, EPS], [EPS, EPS, PI2]],
		["Armature_arm_wristR", "Armature_arm_elbowR", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_leg_thighL", "Armature_pelvis", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_leg_kneeL", "Armature_leg_thighL", [EPS, -PI4, EPS], [PI2, PI4, EPS]],
		["Armature_leg_ankleL", "Armature_leg_kneeL", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_leg_toesL", "Armature_leg_ankleL", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_leg_thighR", "Armature_pelvis", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_leg_kneeR", "Armature_leg_thighR", [EPS, -PI4, EPS], [PI2, PI4, EPS]],
		["Armature_leg_ankleR", "Armature_leg_kneeR", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_leg_toesR", "Armature_leg_ankleR", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]]
		]
	},
	'princess': {
		pairs: [
		["RootNode_pelvis", 0.05],
		["RootNode_abdomenLower", "RootNode_abdomenUpper"],
		["RootNode_abdomenUpper", "RootNode_chestLower"],
		["RootNode_chestLower", "RootNode_chestUpper"],
	
		["RootNode_rPectoral", 0.2],
		["RootNode_lPectoral", 0.2],
	
		["RootNode_chestUpper", "RootNode_neckLower"],
		["RootNode_neckLower", "RootNode_neckUpper"],
		["RootNode_neckUpper", "RootNode_head"],
		["RootNode_head", 0.15],
	
		["RootNode_rCollar", "RootNode_rShldrBend"],
		["RootNode_rShldrBend", "RootNode_rShldrTwist"],
		["RootNode_rShldrTwist", "RootNode_rForearmBend"],
		["RootNode_rForearmBend", "RootNode_rForearmTwist"],
		["RootNode_rForearmTwist", "RootNode_rHand"],
		["RootNode_rHand", 0.1],
		["RootNode_lCollar", "RootNode_lShldrBend"],
		["RootNode_lShldrBend", "RootNode_lShldrTwist"],
		["RootNode_lShldrTwist", "RootNode_lForearmBend"],
		["RootNode_lForearmBend", "RootNode_lForearmTwist"],
		["RootNode_lForearmTwist", "RootNode_lHand"],
		["RootNode_lHand", 0.1],
	
		["RootNode_rThighBend", "RootNode_rThighTwist"],
		["RootNode_rThighTwist", "RootNode_rShin"],
		["RootNode_rShin", "RootNode_rFoot"],
		["RootNode_rFoot", "RootNode_rMetatarsals"],
		["RootNode_rMetatarsals", 0.12],
	
		["RootNode_lThighBend", "RootNode_lThighTwist"],
		["RootNode_lThighTwist", "RootNode_lShin"],
		["RootNode_lShin", "RootNode_lFoot"],
		["RootNode_lFoot", "RootNode_lMetatarsals"],
		["RootNode_lMetatarsals", 0.12],
		],
		pairs2: [
		["RootNode_abdomenLower", "RootNode_pelvis", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_abdomenUpper", "RootNode_abdomenLower", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_chestLower", "RootNode_abdomenUpper", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_chestUpper", "RootNode_chestLower", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_neckLower", "RootNode_chestUpper", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],
		["RootNode_neckUpper", "RootNode_neckLower", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],
		["RootNode_head", "RootNode_neckUpper", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],
	
		["RootNode_rPectoral", "RootNode_chestLower", [-CHEST, -CHEST, -CHEST], [CHEST, CHEST, CHEST]],
		["RootNode_lPectoral", "RootNode_chestLower", [-CHEST, -CHEST, -CHEST], [CHEST, CHEST, CHEST]],
	
		["RootNode_rCollar", "RootNode_chestUpper", [-COLLAR, -COLLAR, -COLLAR], [COLLAR, COLLAR, COLLAR]],
		["RootNode_rShldrBend", "RootNode_rCollar", [-SHLDR, -EPS, -SHLDR], [SHLDR, EPS, SHLDR]],
		["RootNode_rShldrTwist", "RootNode_rShldrBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_rForearmBend", "RootNode_rShldrTwist", [-EPS, -EPS, -EPS], [EPS, EPS, ELBOW]],
		["RootNode_rForearmTwist", "RootNode_rForearmBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_rHand", "RootNode_rForearmTwist", [-HAND_BEND, -HAND_TWIST, -HAND_TWIST], [HAND_BEND, HAND_TWIST, HAND_TWIST]],
	
		["RootNode_lCollar", "RootNode_chestUpper", [-COLLAR, -COLLAR, -COLLAR], [COLLAR, COLLAR, COLLAR]],
		["RootNode_lShldrBend", "RootNode_lCollar", [-SHLDR, -EPS, -SHLDR], [SHLDR, EPS, SHLDR]],
		["RootNode_lShldrTwist", "RootNode_lShldrBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_lForearmBend", "RootNode_lShldrTwist", [-EPS, -EPS, -ELBOW], [EPS, EPS, EPS]],
		["RootNode_lForearmTwist", "RootNode_lForearmBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_lHand", "RootNode_lForearmTwist", [-HAND_BEND, -HAND_TWIST, -HAND_TWIST], [HAND_BEND, HAND_TWIST, HAND_TWIST]],
	
		["RootNode_rThighBend", "RootNode_pelvis", [-THIGH_BEND, -EPS, -THIGH_ROTATE], [EPS, EPS, THIGH_ROTATE]],
		["RootNode_rThighTwist", "RootNode_rThighBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_rShin", "RootNode_rThighTwist", [-EPS, -ARMLEG_TWIST, -EPS], [KNEE, ARMLEG_TWIST, EPS]],
		["RootNode_rFoot", "RootNode_rShin", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
		["RootNode_rMetatarsals", "RootNode_rFoot", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
	
		["RootNode_lThighBend", "RootNode_pelvis", [-THIGH_BEND, -EPS, -THIGH_ROTATE], [EPS, EPS, THIGH_ROTATE]],
		["RootNode_lThighTwist", "RootNode_lThighBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_lShin", "RootNode_lThighTwist", [-EPS, -ARMLEG_TWIST, -EPS], [KNEE, ARMLEG_TWIST, EPS]],
		["RootNode_lFoot", "RootNode_lShin", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
		["RootNode_lMetatarsals", "RootNode_lFoot", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]]
	]
	}
};

const defaultState = {
	"state": {
		"camera1": {
			"input": { "controllerId": "0" },  // needs input to toggle modes
			"entity": {x: 0, y: 4, z: 2, rotation: {x: -0.95, y: 0.0, z: 0.0}},
			"camera": {fov: 60.0, type: 'follow', entityName: 'character1' },
			"render": {type: "camera"},
		},
		"floor": {
			"entity": {x: 0, y: -1, z: 0},
			"render": {type: "box", x: 10, y: 1, z: 10},
			"physics": {x: 0, y: -1, z: 0, shape: {type: "box", x: 10, y: 1, z: 10}, mass: 5, staticObject: true}
		}
	}
};


function level3() {
	return defaultState;
}


function level4() {
	const JOIN_TYPE="6DOF";
	const NUM_CHAINS=30;
	const shapeInfo1 = { type: "capsule", radius: 0.25, height: 1.0 };
	const shapeInfo2 = { type: "box", x: 0.25, y: 0.5, z: 0.25 };
	const baseEntity1 = {"entity": {}, render: { ...shapeInfo1 } };
	const baseEntity2 = {"entity": {}, render: { ...shapeInfo2 } };

	const entities = {
		"sphere0": { ...baseEntity1, "physics": {x: 1, y: 0, z: 0, shape: shapeInfo1, mass: 1, friction: 5.0} }
	};
	for(var i = 1; i < NUM_CHAINS; i++) {
		entities['sphere'+i] = { ...baseEntity1, "physics": {x: 1, y: i, z: 0, shape: shapeInfo1, mass: 1, friction: 5.0} };
		entities['constraint'+i] = {
			"constraint": {
				type: JOIN_TYPE, bodyA: 'sphere'+(i-1), bodyB: 'sphere'+i,
				localA: [0, 0.5, 0], localB: [0, -0.5, 0], options: {
					disableCollision: true, quaternionA: [0,0,0,1], quaternionB: [0,0,0,1]
				}
			}
		};
	}

	entities["box0"] = { ...baseEntity2, "physics": {x: -1, y: 0, z: 0, shape: shapeInfo2, mass: 1} };
	for(var i = 1; i < NUM_CHAINS; i++) {
		entities['box'+i] = { ...baseEntity2, "physics": {x: -1, y: i, z: 0, shape: shapeInfo2, mass: 1} };
		entities['constraint-box'+i] = {
			"constraint": {
				type: JOIN_TYPE, bodyA: 'box'+(i-1), bodyB: 'box'+i,
				localA: [0, 0.5, 0], localB: [0, -0.5, 0], options: {
					disableCollision: true, quaternionA: [0,0,0,1], quaternionB: [0,0,0,1]
				}
			}
		};
	}

	const cube = new THREE.BoxBufferGeometry( 1, 1, 1 );
	//const cube = new THREE.TorusKnotBufferGeometry( 1, .2, 100, 16 );
	//const buffer = new THREE.BufferGeometry().fromGeometry(cube);
	//const triangles = toTriangles(cube);
	const triangles = toTrianglesFromBuffer(cube);
	console.log("Triangles", triangles, cube.toJSON());
	entities["textTriangleMesh"] = { 
		entity: {}, 
		//render: { type: "torusknot", radius: 1, tube: .2 }, 
		render: { type: "box", x: .5, y: .5, z: .5 }, 
		physics: {x: 0, y: 3, z: 0, shape: { type: "concave", triangles: triangles }, mass: 1} 
	};

	entities["particles1"] = { entity: {}, GPUparticles: {} };

	for(let eid in entities) {
		createEntity(entities[eid], eid);
	}

	return defaultState;
}

// Triangle Mesh Test (Fail)
function level5() {
	const shapeInfo1 = { type: "capsule", radius: 0.25, height: 1.0 };
	const shapeInfo2 = { type: "box", x: 0.25, y: 0.5, z: 0.25 };
	const baseEntity1 = {"entity": {}, render: { ...shapeInfo1 } };
	const baseEntity2 = {"entity": {}, render: { ...shapeInfo2 } };
	const entities = {
		"sphere0": { 
			...baseEntity1, 
			"physics": {x: 0, y: 0, z: 0, shape: shapeInfo1, mass: 1, friction: 5.0} 
		}
	};

	const cube = new THREE.SphereGeometry(.2, 10, 10);
	const triangles = toTriangles(cube);
	for(let i = 0; i < 50; i++) {
		const r1 = (Math.random()-0.5)*2;
		const r2 = (Math.random()-0.5)*2;
		const r3 = (Math.random()-0.5)*4;
		entities["textTriangleMesh"+i] = { 
			entity: {}, 
			render: { type: "sphere", radius: .2 }, 
			physics: {x: r1, y: 4+r3, z: r2, shape: { type: "concave", triangles: triangles }, mass: 1, friction: 5.0} 
		};
	}

	for(let eid in entities) {
		createEntity(entities[eid], eid);
	}

	return defaultState;
}


// Convex Mesh Test (Pass!)
function generateRandomPoints(numPoints, minList, maxList) {
	if(!minList) { minList = [-.5,-.5,-.5]; }
	if(!maxList) { maxList = [ .5, .5, .5]; }
	const newPoints = [];
	for(let i = 0; i < numPoints; i++) {
		const r1 = Math.random() * (maxList[0] - minList[0]) + minList[0];
		const r2 = Math.random() * (maxList[1] - minList[1]) + minList[1];
		const r3 = Math.random() * (maxList[2] - minList[2]) + minList[2];
		newPoints.push({x: r1, y: r2, z: r3});
	}
	return newPoints;
}
function level6() {
	const entities = {};
	for(let i = 0; i < 50; i++) {
		const r1 = (Math.random()-0.5)*2;
		const r2 = (Math.random()-0.5)*2;
		const r3 = (Math.random()-0.5)*4+4;
		const points = generateRandomPoints(100);
		entities["testConvexMesh"+i] = { 
			entity: {}, 
			render: { type: "convex", points: points }, 
			physics: {x: r1, y: r3, z: r2, shape: { type: "convex", points: points }, mass: 1, friction: 5.0} 
		};
	}
	for(let eid in entities) {
		createEntity(entities[eid], eid);
	}
	return defaultState;
}

function level7() {
	const entities = {};
	let i = 0;
	// TODO make a generator system instead of this
	// reasoning: when window is not focused this continues even though game is paused
	setInterval(function() {  
		const r1 = (Math.random()-0.5)*2;
		const r2 = (Math.random()-0.5)*2;
		const r3 = (Math.random()-0.5)*4+4;
		const points = generateRandomPoints(16);
		createEntity({ 
			entity: {}, 
			render: { type: "convex", points: points }, 
			physics: {x: r1, y: r3, z: r2, shape: { type: "convex", points: points }, mass: 1, friction: 5.0},
			particle: {maxAge: 250 },
			stats: {hitCooldown: 5}
		}, "testConvexMesh"+i);
		i+=1;
	}, 150);

	for(let eid in entities) {
		createEntity(entities[eid], eid);
	}
	return defaultState;
}

function vectorizeBuffer(buffer) {
	const vect = [];
	const consMap = {1: s=>s, 2: THREE.Vector2, 3: THREE.Vector3, 4: THREE.Vector4}
	const cons = consMap[buffer.itemSize];
	for(let i = 0; i < buffer.count; i++) {
		vect.push(new cons().fromBufferAttribute(buffer, i))
	} 
	return vect;
}
function findBoneIndex(boneName, bonesList) {
	let boneIndex = 0
	for(boneIndex = 0; boneIndex < bonesList.length; boneIndex++) {
		if(bonesList[boneIndex].name == boneName) {
			break;
		}
	}
	if(boneIndex === 0) { throw('Unable to find bone ' + boneName)}
	return boneIndex;
}
function gatherVertices(boneIndex, skinIndex, skinWeight, position, minimumQueryWeight) {
	let shinVertices = [];
	let vertexCache = {};
	for(let i = 0; i < skinIndex.length; i++) {
		const hashKey = position[i].x + "," + position[i].y + "," + position[i].z;
		if(!(hashKey in vertexCache)) {
			if(skinIndex[i].x == boneIndex && skinWeight[i].x > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			} else if(skinIndex[i].y == boneIndex && skinWeight[i].y > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			} else if(skinIndex[i].z == boneIndex && skinWeight[i].z > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			} else if(skinIndex[i].w == boneIndex && skinWeight[i].w > minimumQueryWeight) {
				shinVertices.push(position[i]);
				vertexCache[hashKey] = true;
			}
		}
	}
	return shinVertices;
}

function getRandomSubarray(arr, size) {
    var shuffled = arr.slice(0), i = arr.length, temp, index;
    while (i--) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(0, size);
}

/*
	Given a GLFT file (character-like)
	Requires that glft has a SkinnedMesh and 1 armature

	Will output rigid bodies matching the makeup given in "pairs"
*/
function createCubeMesh(skinnedMesh, namePrefix, pairs) {
	const armature = skinnedMesh.skeleton;
	//const shape = "capsule"; 
	const shape = "box"; 
	const radius = 0.035; 
	const mass = 0.05; 
	const entities = {};
	for(let i = 0; i < pairs.length; i++) {	
		const boneName = pairs[i][0];
		if(namePrefix+".bone."+boneName in entities) { continue; }
		/*
			Create the rigid body
		*/
		let length = 0.1;
		if(typeof pairs[i][1] == 'number') {
			length = pairs[i][1];
		} else {
			length = calculateRigidBodyLength(armature, pairs[i][0], pairs[i][1]);
		}
		const coordinates = getRigidBodyWorldCoordinates(armature, pairs[i][0]);
		const vec3 = coordinates[0];
		const quat = coordinates[1];
		vec3.add(vec3_3.set(0, length / 2.0, 0).applyQuaternion(quat));
		const positioning = {x: vec3.x, y: vec3.y, z: vec3.z, rotation: {x: quat.x, y: quat.y, z: quat.z, w: quat.w} };
		entities[namePrefix+".bone."+pairs[i][0]] = {
			"entity": {...positioning},
			//"render": {type: shape, radius: radius, height: length, ignoreOffset: true, x: radius, y: length/2, z: radius},
			"physics": {...positioning,
				shape: {type: shape, radius: radius, height: length, x: radius, y: length/2, z: radius }, mass: mass,
				damping: .99,
				boneOffsetX: 0, boneOffsetY: -length/2, boneOffsetZ: 0
			}
		};
		//DEBUG
		//entities[namePrefix+".bone."+boneName].physics.staticObject = true;
		/*entities[namePrefix+".debugBoneAxis."+boneName] = { 
			entity: {...positioning}, render: { type: "axis", ignoreOffset: true }, 
		};*/
		//END DEBUG
	}
	return entities;
}
	
/*
	Given a GLFT file (character-like)
	Requires that glft has a SkinnedMesh and 1 armature

	Will output rigid bodies matching the mesh using convex hull
*/
function createConvexHullMesh(skinnedMesh, namePrefix, pairs) {		
	const MAX_VERTICES = 75;
	const bonesList = skinnedMesh.skeleton.bones;
	const position = vectorizeBuffer(skinnedMesh.geometry.attributes.position);
	const skinIndex = vectorizeBuffer(skinnedMesh.geometry.attributes.skinIndex);
	const skinWeight = vectorizeBuffer(skinnedMesh.geometry.attributes.skinWeight);

	//create a convex hull for each bone
	const returnEntities = {};
	for(let i = 0; i < pairs.length; i++) {	
		const boneName = pairs[i][0];
		if(namePrefix+".bone."+boneName in returnEntities) { continue; }

		console.log('Building', boneName);
		const boneIndex = findBoneIndex(boneName, bonesList);
		let boneVertexList = gatherVertices(boneIndex, skinIndex, skinWeight, position, 0.4)

		if(boneVertexList.length > 3) { // need at least 4 vtx for convex hull
			if(boneVertexList.length > MAX_VERTICES) { // limit to MAX_VERTICES vertex count
				boneVertexList = getRandomSubarray(boneVertexList, MAX_VERTICES);
			}
			const coordinates = getRigidBodyWorldCoordinates(skinnedMesh.skeleton, boneName);
			const vec3 = coordinates[0];
			const quat = coordinates[1];
			const localPoints = boneVertexList.map((p)=>{
				return p.clone().sub(vec3).applyQuaternion(quat.clone().inverse());
			});
			const cP = new THREE.Vector3(0,0,0); //center point
			localPoints.forEach(e=>cP.add(e));
			cP.divideScalar(localPoints.length); // average of all points
			const shiftedPoints = localPoints.map(p=>p.clone().sub(cP));
			const points = shiftedPoints.map( (v)=>{return {x: v.x, y: v.y, z: v.z}} );

			vec3.add(cP.clone().applyQuaternion(quat));
			
			const positioning = {x: vec3.x, y: vec3.y, z: vec3.z, rotation: {x: quat.x, y: quat.y, z: quat.z, w: quat.w} };
			returnEntities[namePrefix+".bone."+boneName] = { 
				entity: {...positioning}, 
				//render: { type: "convex", points: points, ignoreOffset: true }, 
				physics: {
					...positioning, 
					shape: { type: "convex", points: points }, mass: .05, friction: 5.0,
					boneOffsetX: -cP.x, boneOffsetY: -cP.y, boneOffsetZ: -cP.z
				}
			};
		}
		console.log('Done', boneName);
	}
	return returnEntities
}


/*
A function that connects rigid bodies given existing rigid
bodies with a name prefix
params
	entites: object containing the rigid body descriptions
	armature: THREE.Skeleton instane
	namePrefix: namePrefix given to the entities and to these constraints
*/
function connectRigidBodies(entities, armature, namePrefix, pairs2) {
	const newEntities = {...entities};
	for(let i = 0; i < pairs2.length; i++) {	
		/*
			Connect joints
		*/
		const entity1 = entities[namePrefix+".bone."+pairs2[i][0]];
		if(!entity1) throw("Unable to find bone: "+pairs2[i][0]);
		const entity2 = entities[namePrefix+".bone."+pairs2[i][1]];
		if(!entity2) throw("Unable to find bone: "+pairs2[i][1]);
		const bone1 = armature.getBoneByName(pairs2[i][0]);
		const bone2 = armature.getBoneByName(pairs2[i][1]);
		const coords = getRigidBodyWorldCoordinates(armature, bone1.name);
		const b1 = coords[0];
		const locals = calculateLocalConnectionFromWorld(
			entity1.physics, entity2.physics, b1.x, b1.y, b1.z
		)

		const defaultLim = Math.PI;
		const lim = 20;
		let low = [-defaultLim / lim, -defaultLim / lim, -defaultLim / lim];
		let high = [defaultLim / lim, defaultLim / lim, defaultLim / lim];
		if(pairs2[i][2]) {
			low = pairs2[i][2].map(x=>x * 0.5);
		}
		if(pairs2[i][3]) {
			high = pairs2[i][3].map(x=>x * 0.5);
		}
		const q1 = bone1.quaternion.clone()
		bone1.getWorldQuaternion(q1);
		const q2 = bone2.quaternion.clone()
		bone2.getWorldQuaternion(q2);

		newEntities[namePrefix+".constraint."+pairs2[i][0]] = {
			"constraint": {
				type: "6DOF",
				bodyA: namePrefix+".bone."+pairs2[i][0],
				bodyB: namePrefix+".bone."+pairs2[i][1],
				localA: locals.localA,
				localB: locals.localB,
				options: {
					quaternionA: [q1.x, q1.y, q1.z, -q1.w],
					quaternionB: [q2.x, q2.y, q2.z, -q2.w],
					disableCollision: true,
					rotationLimitsLow : low,
					rotationLimitsHigh : high
				}
			}
		};
	}
	return newEntities;
}

function pinConstriants(entities, namePrefix, pins) {
	for(let i in pins) {
		const constraint = namePrefix+".constraint."+pins[i];
		if(!(constraint in entities)) {
			console.warn("Unable to find entity: ", namePrefix+".constraint."+pins[i])
			continue;
		}
		
		const pin = namePrefix+".pin."+pins[i];
		const bone = namePrefix+".bone."+pins[i];
		const localA = entities[constraint].constraint.localA;
		const x = entities[bone].physics.x + localA[0];
		const y = entities[bone].physics.y + localA[1];
		const z = entities[bone].physics.z + localA[2];
		entities[pin] = {
			"render": {type: "axis", ignoreOffset: true}, "entity": {x: x, y: y, z: z},
			"physics": {x: x, y: y, z: z, shape: {type: "sphere", radius: 0.025 }, mass: 0, noContact: true, kinematic: true},
			"constraint": {
				type: "6DOF", bodyA: bone, localA: localA,
				options: {
					disableCollision: true,
					rotationLimitsLow : [-0,-0,-0],
					rotationLimitsHigh : [0, 0, 0],
					spring: true, stiffness: 50.0
					//equilibriumPoint: localToWorldEquilibrium
				}
			},
			"particle": {maxAge: 500}
		}
	}

	try {
		entities[namePrefix+".constraint.RootNode_rPectoral"].constraint.options['spring'] = true;
		entities[namePrefix+".constraint.RootNode_rPectoral"].constraint.options['stiffness'] = 20.0;
		entities[namePrefix+".constraint.RootNode_lPectoral"].constraint.options['spring'] = true;
		entities[namePrefix+".constraint.RootNode_lPectoral"].constraint.options['stiffness'] = 20.0;
	} catch(e) { console.warn(e); }

	return entities;
}


function level8() {
	/*const meshName = 'nonfree/princess.glb';
	const pairs = jointData['princess'].pairs;
	const pairs2 = jointData['princess'].pairs2;*/
	
	const meshName = 'jessica.glb';
	const pairs = jointData['xnalara'].pairs;
	const pairs2 = jointData['xnalara'].pairs2;

	let pins = [];
	for(let i = 0; i < pairs.length; i++) {
		pins.push(pairs[i][0]);
	}
	pins = getRandomSubarray(pins, 2);
	//const pins = [];
	
	LOADER.loadGLTF(meshName).then(gltf => {
		const skinnedMeshList = findSkinnedMesh(gltf.scene);  // Gather all skinned mesh
		// join all meshes together into one
		let armature = skinnedMeshList[2];
		for(let i = 3; i < skinnedMeshList.length; i++) {
			try{
				armature.geometry = MESHUTILS.mergeGeometry(armature.geometry, skinnedMeshList[i].geometry);
			} catch(e) {
				console.log(e);
			}
		}

		const namePrefix = "character1";
		//let entities = createConvexHullMesh(armature, namePrefix, pairs);
		let entities = createCubeMesh(armature, namePrefix, pairs);
		entities = connectRigidBodies(entities, armature.skeleton, namePrefix, pairs2);
		entities = pinConstriants(entities, namePrefix, pins);

		for(let eid in entities) {
			createEntity(entities[eid], eid);
		}
		
		createEntity({
			"entity": {x: 0, y: 0, z: 0}, 
			"render": { type: "animatedMesh", filename: meshName, ignoreOffset: true },
			"constraint": {
				boneConstraints: pairs.map(
					(boneData) => { return {id: namePrefix+".bone."+boneData[0], boneName: boneData[0]}; }
				)
			},
		}, namePrefix+'.characterMesh');
	});
	return defaultState;
}

const mainLevel = level7;
const levels = {
	level1: level1,
	level2: level2,
	level3: level3,
	level4: level4,
	level5: level5,
	level6: level6,
	level7: level7,
	level8: level8
}

export { createHeightMap, mainLevel, levels }
