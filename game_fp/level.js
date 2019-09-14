import * as ROT from './lib/rot.js';  // dungeon generation library
import * as LOADER from './renderer/loader.js'; 
import * as ENGINE from './engine.js';
import * as THREE from './lib/three.module.js';
import * as MESHUTILS from './mesh_utils.js';
import * as RIGIFY from './rigify.js';
import { jointData } from './joint_data.js';

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

	//const cube = new THREE.BoxBufferGeometry( 1, 1, 1 );
	const cube = new THREE.TorusKnotBufferGeometry( 1, .2 );
	//const buffer = new THREE.BufferGeometry().fromGeometry(cube);
	//const triangles = toTriangles(cube);
	const triangles = toTrianglesFromBuffer(cube);
	console.log("Triangles", triangles, cube.toJSON());
	entities["textTriangleMesh"] = { 
		entity: {x: 0, y: 3, z: 0}, 
		render: { type: "torusknot", radius: 1, tube: .5 }, 
		//render: { type: "box", x: .5, y: .5, z: .5 }, 
		physics: {x: 0, y: 3, z: 0, shape: { type: "concave", triangles: triangles }, mass: 0, staticObject: true} 
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

function springTest() {
	const points1 = generateRandomPoints(12);
	const points2 = generateRandomPoints(12);

	createEntity({ 
		entity: {x: 0, y: 3, z: 0}, 
		render: { type: "convex", points: points1 }, 
		physics: {x: 0, y: 3, z: 0, shape: { type: "convex", points: points1 }, mass: 0, staticObject: true},
	}, "testConvexMesh0");
	createEntity({ 
		entity: {x: 0, y: .5, z: 0}, 
		render: { type: "convex", points: points2 }, 
		physics: {x: 0, y: .5, z: 0, shape: { type: "convex", points: points2 }, mass: 1},
	}, "testConvexMesh1");	
	createEntity({ 
		constraint: {
			bodyA: "testConvexMesh0", localA: [0,-.15,0], 
			bodyB: "testConvexMesh1", localB: [0, .15,0],
			type: "6DOF", disableCollision: false,
			options: { distance: 5.0, spring: true, stiffness: 50.0, damping: 2 }
		}
	}, "springConst1");	

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
			particle: {maxAge: 1000 },
			stats: {hitCooldown: 5}
		}, "testConvexMesh"+i);
		i+=1;
	}, 300);

	for(let eid in entities) {
		createEntity(entities[eid], eid);
	}
	return defaultState;
}

function level8() {
	const meshName = 'free/free_mesh_standard.dae';
	//const meshName = 'nonfree/weight_painted_princess.gltf';
	const pairs = jointData['princessRigify'].pairs;
	const pairs2 = jointData['princessRigify'].pairs2;
	const offsets = {
		'char1': {x: 0, y: 0, z:0},
		'char2': {x: 0, y: 0, z:0}
	};
	
	/*const meshName = 'jessica.glb';
	const pairs = jointData['xnalara'].pairs;
	const pairs2 = jointData['xnalara'].pairs2;*/

	LOADER.loadRigify(meshName).then(collada => {
	//LOADER.loadGLTF(meshName).then(collada => {
	//LOADER.loadDAE(meshName).then(collada => {
		const skinnedMeshList = RIGIFY.findSkinnedMesh(collada.scene);  // Gather all skinned mesh
		// join all meshes together into one
		let armature = skinnedMeshList[0];
		for(let i = 1; i < skinnedMeshList.length; i++) {
			armature.geometry = MESHUTILS.mergeGeometry(armature.geometry, skinnedMeshList[i].geometry);
		}

		const ragdolls = {}
		//const names = ['char1', 'char2'];
		const names = ['char1'];
		const defaultMat = {skinning: true};
		names.forEach(namePrefix=>{
			ragdolls[namePrefix] = RIGIFY.spawnRagdoll(
				namePrefix, armature, pairs, pairs2
			);
			for(let eid in ragdolls[namePrefix]) {
				createEntity(ragdolls[namePrefix][eid], eid);
			}
			const finalCharacter = {
				"entity": {x: 0, y: 0, z: 0}, 
				"render": { 
					type: "animatedMesh", filename: meshName, ignoreOffset: true,
					materials: [ 
						{...defaultMat, name: "body", diffusePath: "free/baked_skin_final.png", transparent: false},
						{...defaultMat, name: "arms", diffusePath: "nonfree/princess_fbx_test.images/RyChiyo_arms_1004.jpg"}, 
						{...defaultMat, name: "lashes", color: "0x000000", diffusePath: "../models/eyelash1.png", transparent: true}, 
						{...defaultMat, name: "generic", color: "0x3333AA", roughness: 0.9 },
						//{...defaultMat, name: "generic", diffusePath: "free/baked_skin_final.png", transparent: false},
						{...defaultMat, roughness: 0.9, name: "eyes", diffusePath: "../models/brownlight_eye.png"}, 
						{...defaultMat, name: "eyemoisture", roughness: 0.01, transparent: true, opacity: 0.25, metalness: 1.0},
						{...defaultMat, name: "toenails", color: "0x000000", roughness: 0.01}, 
						{...defaultMat, color: "0x221111", name: "innermouth"}, 
						{...defaultMat, color: "0x221111", name: "pupil"}, 
						{...defaultMat, color: "0x221111", name: "tonge", diffusePath: "../models/tongue01_diffuse.png"},
						{...defaultMat, name: "lashes", color: "0x000000", diffusePath: "../models/eyebrow010.png", transparent: true}
					]
				},
				"physBone": {
					boneConstraints: pairs.map(
						(boneData) => { return {id: namePrefix+".bone."+boneData[0], boneName: boneData[0]}; }
					)
				},
			};
			createEntity(finalCharacter, namePrefix+'.characterMesh');
		});

		createEntity({
			"entity": {x: 0, y: 3, z: 5 },
			"render": { type: "light", lightType: "point", intensity: 300000 }
		}, "point1");

		createEntity({
			"entity": {x: -3, y: 1, z: -2 },
			"render": { type: "light", lightType: "point", intensity: 300000 }
		}, "point2");
	});

	return defaultState;
}


const mainLevel = level8;
const levels = {
	level1: level1,
	level2: level2,
	level3: level3,
	level4: level4,
	level5: level5,
	level6: level6,
	level7: level7,
	level8: level8,
	springTest: springTest
}

export { createHeightMap, mainLevel, levels }
