define(["three", "zepto"], function(THREE, $) {
	function HUD(game) {
		this.game = game;
		this.init();
	}
	HUD.prototype = {
		loadInventory: function() {
			var character = this.game.characters['eve'];
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
					scope.game.characters['eve'].addItem(inventoryItem);
					scope.showLootMenu(container);
				});
				invWindow.append(button);
			});
			if(container.equipment !== undefined) {
				for(var slot in container.equipment) {
					(function(inventoryItem){
						var button = $("<a href='#' class='button'></a>");
						button.html(inventoryItem.name).on('click', function(e) {
							console.log("Looted item " + inventoryItem.name);
							e.stopPropagation();
							container.unequip(inventoryItem.slot);
							container.removeItem(inventoryItem);
							scope.game.characters['eve'].addItem(inventoryItem);
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
			$(".btn-openinventory").on('click', function(e) {
				e.stopPropagation();
				var invWindow = $(".inventory-menu");
				if(invWindow.css('visibility') == 'hidden') {
					invWindow.css('visibility', 'visible');
				} else {
					invWindow.css('visibility', 'hidden');
				}
				scope.loadInventory();
				return false;
			});
			$(window).on('mousemove', function(e) {
				var me = game.characters['eve'];
				var found = null;
				var best_dist = 100.0;
				for(var char_id in game.characters) {
					(function(character) {
						if(character != me) {
							var dist = character.getDistance(me);
							if(dist < 1.0 && dist < best_dist) {
								best_dist = dist;
								found = character;
							}
						}
					})(game.characters[char_id]);
				}
				if(found === null) {
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