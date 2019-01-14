

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
				"entity": {x: 0, y: 0.5, z: 0},
				"render": { type: "heightField" },
				"physics": {
					mass: 0, x: 0, y: 0.5, z: 0, staticObject: true,
					shape: {
						type: "heightField", x: 250, y: 0.01, z: 250, margin: 0.000001 
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
			"character1": {
				"entity": {x: 0, y: 0, z: 0 },
				"collision": { type: "ouchie" },
				"magic": null,
				/*"animation": { animationName: 'XP32_Dance', playingAnimation: true, 
					animations: {
						special: 'XP32_Dance',
						run: 'XP32_CombatRun',
						idle: 'XP32_Combatiddle'
					}
				},
				"render": { 
					type: "animatedMesh", filename: "/uunp_test/body_ultra.json"
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
	var numCharacters = 5;
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

	function generateAFuckingGrid(width, height) {
		let rows = [];
		for(let z = 0; z < height; z++) {
			let cols = []
			for(let x = 0; x < width; x++) {
				if(Math.random() > 0.975) {
					cols.push('1')
				} else if(Math.random() > 0.8) {
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
			"entity": {x: x-offsetx, y: 1, z: z-offsetz },
			"render": { type: type, x: 1.0, y: 1.0, z: 1.0 },
			"physics": {x: x-offsetx, y: 1, z: z-offsetz, 
				shape: {type: "box", x: .5, y: .5, z: .5, margin: 0.00001 },
				mass: 0, staticObject: true, noContact: noContact
			}
		}
	}

	const tileFunctions = {
		'1': function(x, z, offsetx, offsetz) { return generateTile(x, z, offsetx, offsetz, "tree", false) },
		'2': function(x, z, offsetx, offsetz) { return generateTile(x, z, offsetx, offsetz, "grass", true) },
		'3': function(x, z, offsetx, offsetz) { return generateTile(x, z, offsetx, offsetz, "rock", false) },
	}

	//gridmap = gridmap.split(',');
	const gridmap = generateAFuckingGrid(30, 30);
	for(let z = 0; z < gridmap.length; z++) {
		for(let x = 0; x < gridmap[z].length; x++) {
			const tileHeight = parseInt(gridmap[z].charAt(x)) + 1;
			const offsetx = gridmap[0].length*0.5;
			const offsetz = gridmap.length*0.5;
			if(gridmap[z].charAt(x) in tileFunctions) {
				initialState['state'][generateId()] = tileFunctions[gridmap[z].charAt(x)](x, z, offsetx, offsetz);
			}
		}


	}

	initialState.systems = systems;
	return initialState;
}


export { level1 }