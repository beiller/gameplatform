import * as ROT from './lib/rot.js';  // dungeon generation library
import * as LOADER from './renderer/loader.js'; 
import * as ENGINE from './engine.js';

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

function level3() {
	LOADER.loadGLTF("zoey.glb").then(gltf => {
		console.log(gltf);
		const armature = gltf.scene.children[1].children[0].skeleton;
		const shape = "capsule"; 
		const radius = 0.115; 
		const height = 0.14;
		const mass = 1.0; 
		for(let i = 0; i < armature.bones.length; i++) {	
			const bone = armature.bones[i];
			const vec3 = bone.position.clone();
			const quat = bone.quaternion.clone();
			bone.getWorldPosition(vec3);
			bone.getWorldQuaternion(quat);
			const xPos = vec3.x; 
			const yPos = vec3.y; 
			const zPos = vec3.z; 
			createEntity({
				"entity": {},
				"render": {type: shape, radius: radius, height: height},
				"physics": {x: xPos, y: yPos, z: zPos, 
					rotation: {x: quat.x, y: quat.y, z: quat.z, w: quat.w},
					shape: {type: shape, radius: radius, height: height }, mass: mass
				}
			});
		}
		/*createEntity({
			"entity": {x: 0, y: 0, z: 0}, "render": { type: "animatedMesh", filename: "zoey.glb", ignoreOffset: true }
		}, 'AAAAA');*/
	});

	return {
		"state": {
			"camera1": {
				"input": { "controllerId": "0" },  // needs input to toggle modes
				"entity": {x: 0, y: 4, z: 2, rotation: {x: -0.95, y: 0.0, z: 0.0}},
				"camera": {fov: 60.0, type: 'follow', entityName: 'character1' },
				"render": {type: "camera"},
			},
			"floor": {
				"entity": {x: 0, y: -5, z: 0},
				"render": {type: "box", x: 10, y: 1, z: 10},
				"physics": {x: 0, y: -5, z: 0, shape: {type: "box", x: 10, y: 1, z: 10}, mass: 5, staticObject: true}
			}
		}
	};
}

const mainLevel = level3;

export { createHeightMap, mainLevel }
