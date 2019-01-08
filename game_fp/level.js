

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
			"thisisafuckingroom?": {
				"entity": {x: 0, y: 1.25, z: 0},
				"render": {
					type: "animatedMesh", filename: "/environments/room2.gltf", scale: 1.0
				},
				/*"physics": {
					mass: 0, x: 0, y: 0, z: 0, staticObject: true,
					shape: {
						type: "box", margin: 0.000001 
					}
				}*/
			},
			"groundplane1": {
				"entity": {x: 0, y: -10, z: 0},
				"physics": {
					mass: 0, x: 0, y: -10, z: 0, staticObject: true,
					shape: {
						type: "box", x: 250, y: 0.01, z: 250, margin: 0.000001 
					}
				}
			},
			"sphere1": {
				"entity": {x: -5, y: -9, z: -5 },
				"render": { type: "sphere", radius: 10},
				"physics": {x: -5, y: -9, z: -5, 
					shape: {type: "sphere", radius: 10 },
					mass: 0, staticObject: true
				}
			},
			"character1": {
				"entity": {x: 0, y: 0, z: 0 },
				"animation": { animationName: 'XP32_Dance', playingAnimation: true, 
					animations: {
						special: 'XP32_Dance',
						run: 'XP32_CombatRun',
						idle: 'XP32_Combatiddle'
					}
				 },
				"collision": { type: "ouchie" },
				"magic": null,
				"render": { 
					type: "animatedMesh", filename: "/uunp_test/body_ultra.json"
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
	var numTiles = 4;
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
	var numCharacters = 1;
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

	initialState.systems = systems;
	return initialState;
}


export { level1 }