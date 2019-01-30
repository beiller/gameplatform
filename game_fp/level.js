import * as ROT from './lib/rot.js';

function level1(systems) {
	var initialState = {
		"events": {

		},
		"state": {
			"camera1": {
				"input": { "controllerId": "0" },  // needs input to toggle modes
				"entity": {x: 0, y: 4, z: 2, rotation: {x: -0.95, y: 0.0, z: 0.0}},
				"camera": {fov: 60.0, type: 'follow', entityName: 'character1' },
				"render": {type: "camera"},
			},
			/*"thisisafuckingroom?": {
				"entity": {x: 0, y: 1.25, z: 0},
				"render": {
					type: "animatedMesh", filename: "/environments/room2.gltf", scale: 1.0
				}
			},*/
			"groundplane1": {
				"entity": {x: 0, y: -0.5, z: 0},
				"render": { type: "heightField" },
				"physics": {
					mass: 0, x: 0, y: -0.5, z: 0, staticObject: true, neverSleep: true,
					shape: {
						type: "heightField", x: 250, y: 0.25, z: 250, margin: 0.01 
					}
				}
			},
			/*"sphere1": {
				"entity": {x: -5, y: -9, z: -5 },
				"render": { type: "sphere", radius: 10},
				"physics": {x: -5, y: -9, z: -5, 
					shape: {type: "sphere", radius: 10 },
					mass: 0, staticObject: true
				}
			},*/
			"sword": {
				"entity": {x: 0, y: 15, z: 0 },
				"render": { 
					type: "animatedMesh", filename: "/uunp_test/body.json", jsonType: "item", lookup: "firesword"
				},
				"physics": {x: 0, y: 15, z: 0, 
					//shape: {type: "sphere", radius: .1 },
					shape: {
						type: "box", y: 0.15
					},
					mass: 0.5
				}
			},
			"severedFuckingHead": {
				"entity": {x: 0, y: 15, z: 0 },
				"render": { 
					type: "animatedMesh", filename: "/uunp_test/body.json", jsonType: "item", lookup: "miku_outfit1"
				},
				"physics": {x: 0, y: 15, z: 0, 
					//shape: {type: "sphere", radius: .1 },
					shape: {
						type: "box"
					},
					mass: 0.5
				}
			},
			"character1": {
				"entity": {x: 0, y: 0, z: 0 },
				"collision": { type: "ouchie" },
				"magic": null,
				/*"animation": { animationName: 'XP32_Dance', playingAnimation: true, 
					animations: {
						special: 'XP32_Dance',
						run: 'XP32_CombatRun',
						idle: 'XP32_Combatiddle',
						idle: 'XP32_CombatAttack2'
					}
				},
				"render": { 
					type: "animatedMesh", filename: "asdfake.json", jsonType: "character", lookup: "uunp_test"
				},*/
				"animation": { animationName: 'DE_Dance', playingAnimation: true },
				"render": { 
					type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.285
				},
				"input": { "controllerId": "0" },
				"motion": {fx: 0, fy: 0, fz: 0},
				"physics": {x: 0, y: 2.8, z: 0, 
					//shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
					shape: {type: "capsule", radius: 0.3, margin: 0.00001},
					mass: 45.35, damping: 0.9, lockRotation: true
				},
				"stats": {health: 100, maxHealth: 100}
			}
		}
	};
	var numTiles = 0;
	for(var x = 0; x < numTiles; x++) {
		for(var y = 0; y < numTiles; y++) {
			initialState['state']["ground"+x+"-"+y] = {
				"entity": {x: (x*10)-(numTiles*10/2), y: 0, z: (y*10)-(numTiles*10/2)},
				"render": { 
					type: "animatedMesh", filename: "grass_tile.glb"
				},
				"physics": {
					x: (x*10)-(numTiles*10/2), y: 0, z: (y*10)-(numTiles*10/2),
					mass: 0, staticObject: true,
					shape: {
						type: "box", x: 5, y: 0.0001, z: 5, margin: 0.00001 
					}
				}
			}	
		}
	}
	var numCharacters = 3;
	for(var i = 0; i < numCharacters; i++) {
		var xPos = (Math.random()-0.5)*2*20;
		var zPos = (Math.random()-0.5)*2*20;
		initialState['state']["character"+(i+999)] = {
			"entity": {x: xPos, y: 0, z: zPos },
			"animation": { animationName: 'DE_Dance', playingAnimation: true },
			"render": { 
				type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.285
			},
			"collision": { type: "ouchie" },
			"ai": { x: 1.0, y: 0.0 },
			"motion": {fx: 0, fy: 0, fz: 0},
			"physics": {x: xPos, y: 0.8, z: zPos, 
				shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
				mass: 45.35, damping: 0.9, lockRotation: true
			},
			"stats": {health: 100, maxHealth: 100}
		}
	}

	const tileFunctions = {
		'1': function(x, z, offsetx, offsetz) { return generateTile(x, z, offsetx, offsetz, "tree", false) },
		'2': function(x, z, offsetx, offsetz) { return generateTile(x, z, offsetx, offsetz, "grass", true) },
		'3': function(x, z, offsetx, offsetz) { return generateTile(x, z, offsetx, offsetz, "rock", false) },
		'4': function(x, z, offsetx, offsetz) { return generateTile(x, z, offsetx, offsetz, "brick", false) },
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

	initialState.systems = systems;
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

function generateTile(x, z, offsetx, offsetz, type, noContact) {
	return {
		"entity": {x: x-offsetx, y: 0, z: z-offsetz },
		"render": { type: type, x: 1.0, y: 1.0, z: 1.0 },
		"physics": {x: x-offsetx, y: 0, z: z-offsetz, 
			shape: {type: "box", x: .5, y: .5, z: .5, margin: 0.00001 },
			mass: 0, staticObject: true, noContact: noContact
		}
	}
}

const FLOOR_TILE = '0';
const WALL_TILE = '4'

function generateAFuckingGrid3(w, h) {

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
	console.log(DATA);
	console.log(map);
	for(let i = 0; i < DATA.length; i++) {
		DATA[i] = DATA[i].join('');
	}
	return DATA;
}

function add(a,b) { return a+b; }
function getScalarDiv(scalar){
	function divScalar(a,b) { 
		return a / scalar; 
	}
	return divScalar;
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
function createHeightMap(w, h) {
	let heightMap = Array(h).fill().map(() => Array(w).fill(0));
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
		[2, 4, 6, 8],
		[1, 3, 5, 7],
		[2, 4, 5, 7],
		[1, 3, 6, 8],
		[1, 3, 5, 6, 7, 8],
		[2, 3, 6, 7, 8],
		[3, 4, 5, 6, 7, 8]
	];
	for (let i=0; i<iter; i++) {
		if(!map) {
			map = new ROT.Cellular(w, h, options);
			map.randomize(0.0025);
		} else {
			map.setOptions({
				...options, born: randomChoice(borns)
			})
			map.create();
		}
		mapOper(heightMap, map._map, add);
	}
	mapOper(heightMap, map._map, getScalarDiv(iter));
	return heightMap;
}

function generateAFuckingGrid4(w, h) {
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
	const mapTranslate = {
		1: FLOOR_TILE, 0: WALL_TILE
	}
	map.connect(null, 1);
	for(let i = 0; i < map._map.length; i++) {
		let row = [];
		for(let j = 0; j < map._map[i].length; j++) {
			row.push(mapTranslate[map._map[i][j]]);
		}
		DATA.push(row.join(''))
		
	}
	return DATA;
}



export { level1, createHeightMap }