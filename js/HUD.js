define(["lib/three", "lib/zepto", "Game"], function(THREE, $, Game) {
	function HUD(game) {
		this.game = game;
		this.init();
	}
	HUD.prototype = {
		loadInventory: function() {
			var character = this.game.characters.eve;
			var invWindow = $(".inventory-menu");
			var scope = this;
			invWindow.html("");
			character.inventory.forEach(function(inventoryItem) {
				var button = $("<a href='#' class='button'></a>");
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
				var button = $("<a href='#' class='button'></a>");
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
			var character = this.game.characters.eve;
			var invWindow = $(".inventory-menu");
			var scope = this;
			invWindow.html("");
			character.animations.forEach(function(animation) {
				var button = $("<a href='#' class='button'></a>");
				button.html(animation.name).on('click', function(e) {
					e.stopPropagation();
					character.playAnimation(animation.name, {"crossFade": true });
				});
				invWindow.append(button);
			});
		},

		showLootMenu: function(container) {
			var invWindow = $(".loot-menu");
			var scope = this;
			invWindow.html("<h1>LOOT!</h1>");
			container.inventory.forEach(function(inventoryItem) {
				var button = $("<a href='#' class='button'></a>");
				button.html(inventoryItem.name).on('click', function(e) {
					console.log("Looted item " + inventoryItem.name);
					e.stopPropagation();
					container.removeItem(inventoryItem);
					scope.game.characters.eve.addItem(inventoryItem);
					scope.showLootMenu(container);
				});
				invWindow.append(button);
			});
			if (container.equipment !== undefined) {
				for (var slot in container.equipment) {
					(function(inventoryItem) {
						var button = $("<a href='#' class='button'></a>");
						button.html(inventoryItem.name).on('click', function(e) {
							console.log("Looted item " + inventoryItem.name);
							e.stopPropagation();
							container.unequip(inventoryItem.slot);
							container.removeItem(inventoryItem);
							scope.game.characters.eve.addItem(inventoryItem);
							scope.showLootMenu(container);
						});
						invWindow.append(button);
					})(container.equipment[slot]);
				}
			}

			this.loadInventory();
		},

		init: function() {
			var scope = this;
			var uiWindow = $(".topright");
			var toggleInventory = $('<a href="#" class="button btn-openinventory">Toggle Inventory</a>');
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

			var toggleAnimations = $('<a href="#" class="button btn-openinventory">Toggle Animations</a>');
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
			uiWindow.append(toggleAnimations);


			var loadLevelFunction = function(levelFileName) {
				if(window.game) {
					document.body.removeChild(window.game.container); 
				}
				Game.loadLevel(levelFileName).then(function(game) {
					window.game = game;
					scope.game = game;
				});
			};
			uiWindow.append(
				$('<a href="#" class="button btn-loadlevel1">Load Level 1</a>').on('click', function(e) {
					loadLevelFunction("js/data/level1.json");
				})
			);
			uiWindow.append(
				$('<a href="#" class="button btn-loadlevel2">Load Level 2</a>').on('click', function(e) {
					loadLevelFunction("level2/level2.json");
				})
			);

			var exposureControl = $('<input id="intNumber" type="range" min="1" max="20" step="0.1" />').on('change', function(e) {
				e.stopPropagation();
				console.log("Setting exposure: " + this.valueAsNumber);
				game.renderer.toneMappingExposure = Math.pow(0.31, 1.0 * this.valueAsNumber);
				return false;
			});
			uiWindow.append(exposureControl);

			function createSliderControl(min, max, step, materialPropertyName) {
				uiWindow.append($('<h3>' + materialPropertyName + '</h3>'));
				var control = $('<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" />').on('change', function(e) {
					e.stopPropagation();
					console.log("Setting material property " + materialPropertyName + ": " + this.valueAsNumber);
		    		if(scope.game.characters.eve.armature.material.constructor === Array) {
						for(i in scope.game.characters.eve.armature.material) {
							scope.game.characters.eve.armature.material[i][materialPropertyName] = this.valueAsNumber;
							scope.game.characters.eve.armature.material[i].needsUpdate = true;
						}
		    		} else {
						scope.game.characters.eve.armature.material[materialPropertyName] = this.valueAsNumber;
						scope.game.characters.eve.armature.material.needsUpdate = true;
		    		}
					return false;
				});
				uiWindow.append(control);
			}
			//createSliderControl(0, 1, 0.05, 'metalness');
			createSliderControl(0, 1, 0.05, 'roughness');
			createSliderControl(0, 500, 0.05, 'envMapIntensity');


			var updateCubeMap = $('<a href="#" class="button">Update Cube</a>').on('click', function(e) {
				e.stopPropagation();
				scope.game.updateCubeMap();
				return false;
			});
			uiWindow.append(updateCubeMap);
			$(window).on('mousemove', function(e) {
				if(!scope.game || !scope.game.characters) {
					return;
				}
				var me = scope.game.characters.eve;
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
				if (found === null) {
					$(".loot-menu").css('visibility', 'hidden');
				} else {
					$(".loot-menu").css('visibility', 'visible');
					scope.showLootMenu(found);
				}
				return false;
			});
		}
	};
	return HUD;
});