import * as ROT from './lib/rot.js';
import * as LOADER from './Loader.js';

function level2(systems) {
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
			"Floor1": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Floor"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Floor2": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Floor001"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Ceiling": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Ceiling"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Cube.010": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Cube010"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Cube.011": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Cube011"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Cube.012": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Cube012"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Cube.006": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Cube006"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Cube.007": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Cube007"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Cube.009": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Cube009"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Cabinet": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Cabinet"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Shelves": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Shelves"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Table": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Table"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Bed": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Bed"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
			"Window": {"render": {
				type: "animatedMesh", filename: "/game_fp/bedroom.gltf", objectName: "Window"},
				"physics": {"shape": {type: "box"}, staticObject: true}
			},
      "light1": {
				"entity": {x: 1.1, y: 0.8, z: 1 },
				"render": { type: "light", lightType: "spot"}
			},
			/*
			"mytext1": {
				"entity": {x: 2, y: 1, z: 0 },
				"render": { type: "3dText", string: "LEVEL 2 BBB", size: 1.0, height: 0.5, colorIntHex: 0xFFAAAA },
				//"physics": {x: 2, y: 1, z: 0, shape: { type: "sphere", radius: 0.5 }, mass: 0.25 }
			},*/
			"character1": {
				"entity": {x: 1, y: 0, z: 1 },
				"collision": { type: "ouchie" },
				"magic": null,
				"animation": { animationName: 'DE_Dance', playingAnimation: true },
				"render": { 
					type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.285
				},
				"input": { "controllerId": "0" },
				"motion": {fx: 0, fy: 0, fz: 0},
				"physics": {x: 0, y: 2.8, z: 0, 
					//shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
					shape: {type: "capsule", radius: 0.3, margin: 0.001},
					mass: 45.35, damping: 0.9, lockRotation: true
				},
				"stats": {health: 100, maxHealth: 100}
			},
			//{"Floor001":{"render":{"type":"box","x":6,"y":0.3042885959148407,"z":4},"entity":{"x":0.905022382736206,"y":-0.15214426815509796,"z":3.414414405822754},"physics":{"x":0.905022382736206,"y":-0.15214426815509796,"z":3.414414405822754,"shape":{"type":"box","x":3,"y":0.15214429795742035,"z":2},"staticObject":true}},"Cube012":{"render":{"type":"box","x":1.9999998807907104,"y":0.2759135961532593,"z":0.3183137774467468},"entity":{"x":-0.28178319334983826,"y":2.2402524948120117,"z":1.4860122203826904},"physics":{"x":-0.28178319334983826,"y":2.2402524948120117,"z":1.4860122203826904,"shape":{"type":"box","x":0.9999999403953552,"y":0.13795679807662964,"z":0.1591568887233734},"staticObject":true}},"Cube011":{"render":{"type":"box","x":2,"y":2,"z":0.4333510994911194},"entity":{"x":-1.4481676816940308,"y":1.2000000476837158,"z":1.4860122203826904},"physics":{"x":-1.4481676816940308,"y":1.2000000476837158,"z":1.4860122203826904,"shape":{"type":"box","x":1,"y":1,"z":0.2166755497455597},"staticObject":true}},"Cube010":{"render":{"type":"box","x":2,"y":2,"z":1.2334866523742676},"entity":{"x":2.1243646144866943,"y":1.2000000476837158,"z":1.4860121011734009},"physics":{"x":2.1243646144866943,"y":1.2000000476837158,"z":1.4860121011734009,"shape":{"type":"box","x":1,"y":1,"z":0.6167433261871338},"staticObject":true}},"Cube009":{"render":{"type":"box","x":2.0000011920928955,"y":2,"z":1.9716289043426514},"entity":{"x":0.9671789407730103,"y":1.2000000476837158,"z":-2.6508753299713135},"physics":{"x":0.9671789407730103,"y":1.2000000476837158,"z":-2.6508753299713135,"shape":{"type":"box","x":1.0000005960464478,"y":1,"z":0.9858144521713257},"staticObject":true}},"Cube008":{"render":{"type":"box","x":2,"y":2,"z":1.2334866523742676},"entity":{"x":2.1243646144866943,"y":1.2000000476837158,"z":1.4860121011734009},"physics":{"x":2.1243646144866943,"y":1.2000000476837158,"z":1.4860121011734009,"shape":{"type":"box","x":1,"y":1,"z":0.6167433261871338},"staticObject":true}},"Cube007":{"render":{"type":"box","x":2,"y":2,"z":2},"entity":{"x":3.9743552207946777,"y":1.2000000476837158,"z":-0.5846450328826904},"physics":{"x":3.9743552207946777,"y":1.2000000476837158,"z":-0.5846450328826904,"shape":{"type":"box","x":1,"y":1,"z":1},"staticObject":true}},"Cube006":{"render":{"type":"box","x":2,"y":2,"z":2},"entity":{"x":-2.1699776649475098,"y":1.2000000476837158,"z":-0.5846450328826904},"physics":{"x":-2.1699776649475098,"y":1.2000000476837158,"z":-0.5846450328826904,"shape":{"type":"box","x":1,"y":1,"z":1},"staticObject":true}},"Cabinet2":{"render":{"type":"box","x":0.6000001430511475,"y":1.252000093460083,"z":0.3380000591278076},"entity":{"x":-1.9091260433197021,"y":1.4515674114227295,"z":-1.1718273162841797},"physics":{"x":-1.9091260433197021,"y":1.4515674114227295,"z":-1.1718273162841797,"shape":{"type":"box","x":0.30000007152557373,"y":0.6260000467300415,"z":0.1690000295639038},"staticObject":true}},"Cabinet1001":{"render":{"type":"box","x":0.6000001430511475,"y":1.252000093460083,"z":0.3380000591278076},"entity":{"x":-1.9091260433197021,"y":1.4515674114227295,"z":-0.1777823269367218},"physics":{"x":-1.9091260433197021,"y":1.4515674114227295,"z":-0.1777823269367218,"shape":{"type":"box","x":0.30000007152557373,"y":0.6260000467300415,"z":0.1690000295639038},"staticObject":true}},"Lamp_base":{"render":{"type":"box","x":0.16961689293384552,"y":0.2001979798078537,"z":0.16961689293384552},"entity":{"x":1.3160440921783447,"y":0.7802493572235107,"z":1.0345840454101562},"physics":{"x":1.3160440921783447,"y":0.7802493572235107,"z":1.0345840454101562,"shape":{"type":"box","x":0.08480844646692276,"y":0.10009898990392685,"z":0.08480844646692276},"staticObject":true}},"Cabinet1":{"render":{"type":"box","x":0.6000001430511475,"y":0.5060001015663147,"z":0.5779998302459717},"entity":{"x":1.363416314125061,"y":0.40699994564056396,"z":1.1089673042297363},"physics":{"x":1.363416314125061,"y":0.40699994564056396,"z":1.1089673042297363,"shape":{"type":"box","x":0.30000007152557373,"y":0.25300005078315735,"z":0.28899991512298584},"staticObject":true}},"Shelves1001":{"render":{"type":"box","x":1,"y":2.0149998664855957,"z":0.2799999415874481},"entity":{"x":0.11804932355880737,"y":0.9925000667572021,"z":-2.355612277984619},"physics":{"x":0.11804932355880737,"y":0.9925000667572021,"z":-2.355612277984619,"shape":{"type":"box","x":0.5,"y":1.0074999332427979,"z":0.13999997079372406},"staticObject":true}},"Shelves1":{"render":{"type":"box","x":1,"y":2.0149998664855957,"z":0.2799999415874481},"entity":{"x":-0.9075522422790527,"y":0.9925000667572021,"z":-2.361953020095825},"physics":{"x":-0.9075522422790527,"y":0.9925000667572021,"z":-2.361953020095825,"shape":{"type":"box","x":0.5,"y":1.0074999332427979,"z":0.13999997079372406},"staticObject":true}},"VenetianFrame":{"render":{"type":"box","x":1.0019999742507935,"y":0.05999999865889549,"z":0.041999999433755875},"entity":{"x":3.6581482887268066,"y":2.362978458404541,"z":-0.6012752056121826},"physics":{"x":3.6581482887268066,"y":2.362978458404541,"z":-0.6012752056121826,"shape":{"type":"box","x":0.5009999871253967,"y":0.029999999329447746,"z":0.020999999716877937},"staticObject":true}},"Ceiling":{"render":{"type":"box","x":6,"y":0.2055821418762207,"z":4},"entity":{"x":0.905022382736206,"y":2.502791166305542,"z":-0.5846450328826904},"physics":{"x":0.905022382736206,"y":2.502791166305542,"z":-0.5846450328826904,"shape":{"type":"box","x":3,"y":0.10279107093811035,"z":2},"staticObject":true}},"Floor":{"render":{"type":"box","x":6,"y":0.3042885959148407,"z":4},"entity":{"x":0.905022382736206,"y":-0.15214426815509796,"z":-0.5846450328826904},"physics":{"x":0.905022382736206,"y":-0.15214426815509796,"z":-0.5846450328826904,"shape":{"type":"box","x":3,"y":0.15214429795742035,"z":2},"staticObject":true}},"Cube001":{"render":{"type":"box","x":2.4392621517181396,"y":0.038535576313734055,"z":1.4576870203018188},"entity":{"x":2.756119966506958,"y":0.2054486870765686,"z":0.11275021731853485},"physics":{"x":2.756119966506958,"y":0.2054486870765686,"z":0.11275021731853485,"shape":{"type":"box","x":1.2196310758590698,"y":0.019267788156867027,"z":0.7288435101509094},"staticObject":true}},"Cube002":{"render":{"type":"box","x":0.05934826657176018,"y":0.5536746382713318,"z":0.055234137922525406},"entity":{"x":3.5073280334472656,"y":0.2979169487953186,"z":1.3129181861877441},"physics":{"x":3.5073280334472656,"y":0.2979169487953186,"z":1.3129181861877441,"shape":{"type":"box","x":0.02967413328588009,"y":0.2768373191356659,"z":0.027617068961262703},"staticObject":true}},"Cube003":{"render":{"type":"box","x":0.05934826657176018,"y":0.5536746382713318,"z":0.055234137922525406},"entity":{"x":2.0463438034057617,"y":0.2979169487953186,"z":1.3129181861877441},"physics":{"x":2.0463438034057617,"y":0.2979169487953186,"z":1.3129181861877441,"shape":{"type":"box","x":0.02967413328588009,"y":0.2768373191356659,"z":0.027617068961262703},"staticObject":true}},"Cube004":{"render":{"type":"box","x":0.05934826657176018,"y":0.5536746382713318,"z":0.055234137922525406},"entity":{"x":2.0463438034057617,"y":0.2979169487953186,"z":-1.0909779071807861},"physics":{"x":2.0463438034057617,"y":0.2979169487953186,"z":-1.0909779071807861,"shape":{"type":"box","x":0.02967413328588009,"y":0.2768373191356659,"z":0.027617068961262703},"staticObject":true}},"Cube005":{"render":{"type":"box","x":0.05934826657176018,"y":0.5536746382713318,"z":0.055234137922525406},"entity":{"x":3.5073280334472656,"y":0.2979169487953186,"z":-1.0909779071807861},"physics":{"x":3.5073280334472656,"y":0.2979169487953186,"z":-1.0909779071807861,"shape":{"type":"box","x":0.02967413328588009,"y":0.2768373191356659,"z":0.027617068961262703},"staticObject":true}},"Cube":{"render":{"type":"box","x":2.2552340030670166,"y":0.18599674105644226,"z":1.4913216829299927},"entity":{"x":2.756119966506958,"y":0.33199599385261536,"z":0.11275018751621246},"physics":{"x":2.756119966506958,"y":0.33199599385261536,"z":0.11275018751621246,"shape":{"type":"box","x":1.1276170015335083,"y":0.09299837052822113,"z":0.7456608414649963},"staticObject":true}}}
			"Floor001":{
				//"render":{"type":"box","x":8,"y":0.3,"z":6},
				//"entity":{"x":0,"y":-0.75,"z":0},
				"physics":{"x":0,"y":0,"z":0,
					"shape":{"type":"box","x":8,"y":0.0,"z":8},"staticObject":true
				}
			}
		}
	};

	initialState.systems = systems;
	return initialState;
}

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
				"render": { type: "heightField" },
				"physics": {
					mass: 0, x: 0, y: 0, z: 0, staticObject: true, neverSleep: true,
					shape: {
						type: "heightField", x: 60, z: 60, margin: 0.5,
						terrainWidthExtents: 150, terrainDepthExtents: 150,
						//heightMapData: createHeightMap(60, 60, 15)
						heightMapData: createDungeon(60, 60, -5)
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
				"render": { 
					type: "animatedMesh", filename: "/uunp_test/body.json", jsonType: "item", lookup: "firesword"
				},
				"physics": {x: 1, y: 9, z: 0, 
					//shape: {type: "sphere", radius: .1 },
					shape: {
						type: "box", y: 0.15
					},
					mass: 0.25
				}
			},
			"icestaff1": {
				"entity": {x: 0, y: 9, z: 0 },
				"render": { 
					type: "animatedMesh", filename: "/uunp_test/body.json", jsonType: "item", lookup: "icestaff"
				},
				"physics": {x: 0, y: 9, z: 0, shape: { type: "box" }, mass: 0.25 }
			},
			/*"mytext1": {
				"entity": {x: 2, y: 1, z: 0 },
				"render": { type: "3dText", string: "Hello", size: 1.0, height: 0.5, colorIntHex: 0xFFAAAA },
				"physics": {x: 2, y: 1, z: 0, shape: { type: "sphere", radius: 0.5 }, mass: 0.25 }
			},*/
			"monster1123": {
				"entity": {x: 0, y: 0, z: 0 },
				"animation": { animationName: 'XP32_CombatBlock', playingAnimation: true },
				"render": { 
					type: "animatedMesh", filename: "asdfake.json", jsonType: "character", lookup: "necker"
				},
				"physics": {x: 0, y: 2.8, z: 0, 
					//shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
					shape: {type: "capsule", radius: 0.3, margin: 0.001},
					mass: 45.35, damping: 0.9, lockRotation: true
				}
			},
			"character1": {
				"entity": {x: 0, y: 0, z: 0 },
				"collision": { type: "ouchie" },
				"magic": null,
				"animation": { animationName: 'DE_Dance', playingAnimation: true },
				"render": { 
					type: "animatedMesh", filename: "DefenderLingerie00.glb", scale: 0.285
				},
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

	var numCharacters = 2;
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
			"ai": { x: 1.0, y: 0.0, mode: 1 },
			"motion": {fx: 0, fy: 0, fz: 0},
			"physics": {x: xPos, y: 0.8, z: zPos, 
				shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
				mass: 45.35, damping: 0.9, lockRotation: true
			},
			"stats": {health: 100, maxHealth: 100}
		}
	}

	var numMonsters = 2;
	for(var i = 0; i < numMonsters; i++) {
		var xPos = (Math.random()-0.5)*2*20;
		var zPos = (Math.random()-0.5)*2*20;
		initialState['state']["character"+(i+1999)] = {
			"entity": {x: xPos, y: 0, z: zPos },
			"animation": { animationName: 'XP32_NormalIddle', playingAnimation: true,
				animations: {
					special: 'XP32_CombatBlock',
					run: 'XP32_NormalRun',
					idle: 'XP32_NormalIddle',
					dead: 'arest',
					attack: 'XP32_CombatAttack'
				}
			},
			"render": { 
				type: "animatedMesh", filename: "asdfake.json", jsonType: "character", lookup: "necker"
			},
			"collision": { type: "ouchie" },
			"ai": { x: 1.0, y: 0.0, mode: 2 },
			"motion": {fx: 0, fy: 0, fz: 0},
			"physics": {x: xPos, y: 0.8, z: zPos, 
				shape: {type: "capsule", radius: 0.4, height: 0.9, margin: 0.00001},
				mass: 45.35, damping: 0.9, lockRotation: true
			},
			"stats": {health: 500, maxHealth: 500}
		}
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
	const num = [150, 250, 1000];

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



export { level1, createHeightMap, level2 }