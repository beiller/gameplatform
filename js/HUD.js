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
			var invWindow = $("#window2");
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
			var invWindow = $("#window3");
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
			var invWindow = $("#window4");
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
			var invWindow = $("#window5");
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
		},

		init: function() {
			var scope = this;
			var uiWindow = $(".topright");

			$("#window2").bind("dialogextendrestore", function(evt) {
				scope.loadInventory();
				return false;
			});

			$("#window3").bind("dialogextendrestore", function(evt) {
				scope.loadAnimations();
				return false;
			});

			$("#window4").bind("dialogextendrestore", function(evt) {
				scope.loadCharacters();
				return false;
			});

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
			uiWindow.append(
				$('<a href="#" class="button btn btn-primary btn-sm btn-loadlevel5">Request Fullscreen</a>').on('click', function(e) {
					document.body.webkitRequestFullscreen();
				})
			);

			var exposureControl = $('<span>Fstop</span><input id="intNumber" type="range" min="1" max="20" step="0.1" />').on('change', function(e) {
				e.stopPropagation();
				console.log("Setting exposure: " + this.valueAsNumber);
				game.renderer.toneMappingExposure = Math.pow(0.31, 1.0 * this.valueAsNumber);
				return false;
			});
			uiWindow.append(exposureControl);

			function createSliderControl(min, max, step, materialPropertyName, onChangeFunc) {
				uiWindow.append($('<span>' + materialPropertyName + '</span>'));
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
			createSliderControl(0.00, 10.0, 0.1, 'Animation Speed', function(e) { scope.animationSpeed = this.valueAsNumber });
			createSliderControl(0.00, 1.0, 0.05, 'Character Weight', function(e) { scope.game.characters.eve.setWeight(this.valueAsNumber);} );


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