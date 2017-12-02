define(["lib/three", "lib/zepto", "Game"], function(THREE, $, Game) {
	function HUD(game) {
		this.game = game;
		this.init();
		this.animationSpeed = 1.0;
		this.character = null;
	}
	HUD.prototype = {
		loadInventory: function() {
			var character = this.character;
			var invWindow = $(".inventory-menu");
			var scope = this;
			invWindow.html("");
			character.inventory.forEach(function(inventoryItem) {
				var button = $("<a href='#' class='button btn btn-primary btn-sm'></a>");
				button.html(inventoryItem.name).on('click', function(e) {
					console.log("Equipping item " + inventoryItem.name);
					e.stopPropagation();
					character.removeItem(inventoryItem);
					character.equip(inventoryItem);
					scope.loadInventory();
				});
				invWindow.append(button);
			});
			invWindow.append($("<hr />"));
			Object.keys(character.equipment).forEach(function(key, index) {
				var button = $("<a href='#' class='button btn btn-primary btn-sm'></a>");
				button.html(character.equipment[key].name).on('click', function(e) {
					console.log("Equipping item " + character.equipment[key].name);
					e.stopPropagation();
					character.unequip(key);
					scope.loadInventory();
				});
				invWindow.append(button);
			}, character.equipment);
		},

		loadAnimations: function() {
			var character = this.character;
			var invWindow = $(".inventory-menu");
			var scope = this;
			invWindow.html("");
			function createButton(name) {
				var button = $("<a href='#' class='button btn btn-primary btn-sm'></a>");
				button.html(name).on('click', function(e) {
					e.stopPropagation();
					character.playAnimation(name, {"timeScale": scope.animationSpeed});
				});
				invWindow.append(button);	
			}
			for(var n in character.animations) {
				createButton(n);
			}
		},

		loadCharacters: function() {
			var invWindow = $(".inventory-menu");
			var scope = this;
			invWindow.html("");
			function createButton(name) {
				var button = $("<a href='#' class='button btn btn-primary btn-sm'></a>");
				var scopedName = name;
				button.html(name).on('click', function(e) {
					e.stopPropagation();
					scope.game.camera.trackingCharacter = scopedName;
					scope.character = scope.game.characters[scopedName];
				});
				invWindow.append(button);	
			}
			for(var n in this.game.characters) {
				createButton(n);
			}
		},

		showLootMenu: function(container) {
			var invWindow = $(".loot-menu");
			var scope = this;
			invWindow.html("<h1>LOOT!</h1>");
			container.inventory.forEach(function(inventoryItem) {
				var button = $("<a href='#' class='button btn btn-primary btn-sm'></a>");
				button.html(inventoryItem.name).on('click', function(e) {
					console.log("Looted item " + inventoryItem.name);
					e.stopPropagation();
					container.removeItem(inventoryItem);
					scope.character.addItem(inventoryItem);
					scope.showLootMenu(container);
				});
				invWindow.append(button);
			});
			if (container.equipment !== undefined) {
				for (var slot in container.equipment) {
					(function(inventoryItem) {
						var button = $("<a href='#' class='button btn btn-primary btn-sm'></a>");
						button.html(inventoryItem.name).on('click', function(e) {
							console.log("Looted item " + inventoryItem.name);
							e.stopPropagation();
							container.unequip(inventoryItem.slot);
							container.removeItem(inventoryItem);
							scope.character.addItem(inventoryItem);
							scope.showLootMenu(container);
						});
						invWindow.append(button);
					})(container.equipment[slot]);
				}
			}

			//this.loadInventory();
		},

		init: function() {
			var scope = this;
			var uiWindow = $(".topright");
			var toggleInventory = $('<a href="#" class="button btn btn-primary btn-sm btn-openinventory">Toggle Inventory</a>');
			toggleInventory.on('click', function(e) {
				e.stopPropagation();
				var invWindow = $(".inventory-menu");
				if (invWindow.css('visibility') == 'hidden') {
					invWindow.css('visibility', 'visible');
				} else {
					invWindow.css('visibility', 'hidden');
				}
				scope.loadInventory();
				return false;
			});
			uiWindow.append(toggleInventory);

			var toggleAnimations = $('<a href="#" class="button btn btn-primary btn-sm btn-openanimations">Toggle Animations</a>');
			toggleAnimations.on('click', function(e) {
				e.stopPropagation();
				var invWindow = $(".inventory-menu");
				if (invWindow.css('visibility') == 'hidden') {
					invWindow.css('visibility', 'visible');
				} else {
					invWindow.css('visibility', 'hidden');
				}
				scope.loadAnimations();
				return false;
			});
			uiWindow.append(toggleAnimations);

			var toggleCharacter = $('<a href="#" class="button btn btn-primary btn-sm btn-opencharacters">Toggle Characters</a>');
			toggleCharacter.on('click', function(e) {
				e.stopPropagation();
				var invWindow = $(".inventory-menu");
				if (invWindow.css('visibility') == 'hidden') {
					invWindow.css('visibility', 'visible');
				} else {
					invWindow.css('visibility', 'hidden');
				}
				scope.loadCharacters();
				return false;
			});
			uiWindow.append(toggleCharacter);

			var cameraLocked = true;
			var cameraLockedButton = $('<a href="#" class="button btn btn-primary btn-sm btn-togglecam">Toggle Camera Locked</a>');
			cameraLockedButton.on('click', function(e) {
				e.stopPropagation();
				scope.game.camera.disableYLock = !scope.game.camera.disableYLock;
			});
			uiWindow.append(cameraLockedButton);

			var useSSAOButton = $('<a href="#" class="button btn btn-primary btn-sm btn-togglecam">Toggle SSAO</a>');
			useSSAOButton.on('click', function(e) {
				e.stopPropagation();
				scope.game.useSSAO = !scope.game.useSSAO;
			});
			uiWindow.append(useSSAOButton);


			var loadLevelFunction = async function(levelFileName) {
				if(window.game) {
					document.body.removeChild(window.game.container); 
					window.game = null;
					delete window["game"];
				}
				var game = await Game.loadLevel(levelFileName);
				window.game = game;
				scope.game = game;
			};
			uiWindow.append(
				$('<a href="#" class="button btn btn-primary btn-sm btn-loadlevel1">Load Level 1</a>').on('click', function(e) {
					loadLevelFunction("js/data/level1.json");
					//document.body.webkitRequestFullscreen();
				})
			);
			uiWindow.append(
				$('<a href="#" class="button btn btn-primary btn-sm btn-loadlevel2">Load Level 2</a>').on('click', function(e) {
					loadLevelFunction("level2/level2.json");
					//document.body.webkitRequestFullscreen();
				})
			);
			uiWindow.append(
				$('<a href="#" class="button btn btn-primary btn-sm btn-loadlevel4">Load Level 4</a>').on('click', function(e) {
					loadLevelFunction("level4/level4.json");
					//document.body.webkitRequestFullscreen();
				})
			);
			uiWindow.append(
				$('<a href="#" class="button btn btn-primary btn-sm btn-loadlevel5">Load Level 5</a>').on('click', function(e) {
					loadLevelFunction("level5/level5.json");
					//document.body.webkitRequestFullscreen();
				})
			);

			/*uiWindow.append(
				$('<a href="#" class="button btn-uhh">Uhhhh</a>').on('click', function(e) {
					var video = $('<video id="video" crossorigin="anonymous" style="width: 100%; height: 100%; visibility: visible;" preload="metadata" class=""><source src="https://dv.phncdn.com/videos/201602/05/67891491/720P_1500K_67891491.mp4?ttl=1501645018&amp;ri=1228800&amp;rs=1592&amp;hash=ffd376cf80ad39aae355539ce1a96381" type="video/mp4"></video>');
					$(document.body).append(video);
					var video = document.getElementById( 'video' );
					video.currentTime = 300.0;
					video.play();

					var texture = new THREE.VideoTexture( video );
					//texture.minFilter = THREE.LinearFilter;
					texture.minFilter = THREE.LinearFilter;
					texture.magFilter = THREE.LinearFilter;
					texture.format = THREE.RGBFormat;

					var geometry = new THREE.PlaneGeometry(0.215, 0.125, 12, 12);
				    var material = new THREE.MeshStandardMaterial( { 
				    	map: texture,
				    	emissiveMap: texture, side: THREE.DoubleSide, emissiveIntensity: 100.0,
				    	emissive: new THREE.Color( 0xFFFFFF ),
				    	opacity: 0.75,
				    	transparent: true
				    } );
				 
				    mesh = new THREE.Mesh(geometry, material );		
				    mesh.rotateX(1.6);
				    mesh.scale.set(-1, -1, 1);

				    var bone = game.characters.eve.findBone("eyes");

				    bone.add( mesh );
				})
			);*/


			/*var characterIndex = 0
			var characterNames = [];
			for(var characterName in scope.game.characters) {
				uiWindow.append(
					$('<a href="#" class="button">'+characterName+'</a>').on('click', function(e) {
						var next = characterNames[characterIndex];
						var tmp = scope.game.characters.eve;
						scope.game.characters.eve = next;
					})
				);
			}*/


			var exposureControl = $('<input id="intNumber" type="range" min="1" max="20" step="0.1" />').on('change', function(e) {
				e.stopPropagation();
				console.log("Setting exposure: " + this.valueAsNumber);
				game.renderer.toneMappingExposure = Math.pow(0.31, 1.0 * this.valueAsNumber);
				return false;
			});
			uiWindow.append(exposureControl);

			function createSliderControl(min, max, step, materialPropertyName, onChangeFunc) {
				uiWindow.append($('<h3>' + materialPropertyName + '</h3>'));
				var data = {
					"materialPropertyName" : materialPropertyName
				}
				var control = $('<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" />').on('change', data, onChangeFunc);
				uiWindow.append(control);
			}
			function setMaterialProperty(e) {
				e.stopPropagation();
				var materialPropertyName = e.data.materialPropertyName;
				console.log("Setting material property " + materialPropertyName + ": " + this.valueAsNumber);
	    		if(scope.character.armature.material.constructor === Array) {
					for(i in scope.character.armature.material) {
						scope.character.armature.material[i][materialPropertyName] = this.valueAsNumber;
						scope.character.armature.material[i].needsUpdate = true;
					}
	    		} else {
					scope.character.armature.material[materialPropertyName] = this.valueAsNumber;
					scope.character.armature.material.needsUpdate = true;
	    		}
				return false;
			};
			//createSliderControl(0, 1, 0.05, 'metalness');
			createSliderControl(0, 1, 0.05, 'roughness', setMaterialProperty);
			createSliderControl(0, 500, 0.05, 'envMapIntensity', setMaterialProperty);
			createSliderControl(0.00, 10.0, 0.01, 'none', function(e) { scope.animationSpeed = this.valueAsNumber });


			var updateCubeMap = $('<a href="#" class="button btn btn-primary btn-sm">Update Cube</a>').on('click', function(e) {
				e.stopPropagation();
				scope.game.updateCubeMap();
				return false;
			});
			uiWindow.append(updateCubeMap);

			$(window).on('mousemove', function(e) {
				if(!scope.character && scope.game && scope.game.characters && scope.game.characters.eve) {
					scope.character = scope.game.characters.eve;
				}
				if(!scope.game || !scope.game.characters || !scope.character) {
					return;
				}
				var me = scope.character;
				var found = null;
				var best_dist = 100.0;
				for (var char_id in scope.game.characters) {
					(function(character) {
						if (character != me) {
							var dist = character.getDistance(me);
							if (dist < 1.0 && dist < best_dist) {
								best_dist = dist;
								found = character;
							}
						}
					})(scope.game.characters[char_id]);
				}
				var itemsNear = [];
				var dynamicsNear = []
				for (var i in scope.game.dynamics) {
					(function(dynamic) {
						var dist = dynamic.getDistance(me);
						if (dist < 1.0 && dynamic.item) {
							itemsNear.push(dynamic.item);
							dynamicsNear.push(dynamic);
						}
					})(scope.game.dynamics[i]);
				}
				if (found === null) {
					$(".loot-menu").css('visibility', 'hidden');
					if(itemsNear.length > 0) {
						$(".loot-menu").css('visibility', 'visible');
						scope.showLootMenu({'inventory': itemsNear, removeItem: function() {

						}});
					}
				} else {
					$(".loot-menu").css('visibility', 'visible');
					if(itemsNear.length > 0) {
						scope.showLootMenu({'inventory': itemsNear.concat(found.equipment)});
					} else {
						scope.showLootMenu(found);
					}
				}
				return false;
			});
		}
	};
	return HUD;
});