requirejs.config({
	baseUrl : 'js',
    shim: {
        'lib/zepto': {
            exports: '$'
        },
        'lib/cannon': {
            exports: 'CANNON'
        }
    }
});

function loadJSON(path, success, error) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function()
    {
	if (xhr.readyState === XMLHttpRequest.DONE) {
	    if (xhr.status === 200) {
	        if (success)
	            success(JSON.parse(xhr.responseText));
	    } else {
	        if (error)
	            error(xhr);
	    }
	}
    };
    path += '?cache=' + new Date().getTime();
    xhr.open("GET", path, true);
    xhr.send();
}


// Start the main app logic.
requirejs(
	[
	'Game', 'HUD', 'lib/three', 'controller/AIController', 'controller/UserController'
	], 
function(Game, HUD, THREE, AIController, UserController) {
	function runGame(gameSettings, levelData, itemData) {
	    game = new Game(gameSettings);
	    game.initRendering();
	    game.initPhysics();
	    var objectCount = 0;
	    
	    var hud = new HUD(game);
		
	    var bricks = [];
	    for(var i = -50; i<=50; i++) {
			var randomHeight = (Math.random() - 0.5) * 0.5;
			var slope = i * 0.25;
			bricks.push({model: 'models/big_brick.json', shape: 'box', position: [2*i,-3+randomHeight+slope,0]});
	    }
	    levelData.staticObjects = bricks;
	    var id_counter = 0;
		function spawn_npc(name, player, position, controllerConstructor) {
		    if(!player) {
		        console.log('no player specified');
		        return;
		    }
		    controllerConstructor = controllerConstructor ? controllerConstructor : AIController;
		    
		    game.loadCharacter(
		            player.model,
		            {
		                name: name,
		                sss: player.sss,
		                diffusePath: player.diffusePath,
		                specularPath: player.specularPath,
		                normalPath: player.normalPath,
		                position: position,
		                scale: player.scale
		            }, function(characterObject) {
		            	characterObject.addController(new controllerConstructor(characterObject, game));
			            player.equipment.forEach(function(itemName) {
			            	characterObject.equip(itemData[itemName]);
			            });
			            if(player.inventory != undefined) {
				            player.inventory.forEach(function(itemName) {
				            	characterObject.inventory.push(itemData[itemName]);
				            });
			            }
		            }
		    );
		    
		}
	    function loadLevel(levelData, itemData) {
			//load player
			var player = levelData.characters[levelData.player.character];
			game.loadCharacter(
			        player.model,
			        {
			            name: 'eve',
			            sss: player.sss,
			            diffusePath: player.diffusePath,
			            specularPath: player.specularPath,
			            normalPath: player.normalPath,
			            position: levelData.player.position,
		                scale: player.scale
			        }, function(characterObject) {
			            characterObject.addController(new UserController(characterObject, game));
			            player.equipment.forEach(function(itemName) {
			            	characterObject.equip(itemData[itemName]);
			            });
			            if(player.inventory != undefined) {
				            player.inventory.forEach(function(itemName) {
				            	characterObject.inventory.push(itemData[itemName]);
				            });
			            }
			        }
			);
	
			levelData.staticObjects.forEach(function(element) {
			    game.loadStaticObject(element.model, element.shape, element.position);
			});
	
			levelData.npcs.forEach(function(npc) {
			    spawn_npc('monster'+id_counter, levelData.characters[npc.character], npc.position);
			    id_counter+=1;
			});
			
			setInterval(function() {
	    		spawn_npc('monster'+id_counter, levelData.characters.skeleton, [Math.random() * 200 - 100,0,0]);
	    		id_counter+=1;
	    	}, 12000);
	
	    }
	
	    game.addGroundPlane(-4);
	    /*game.loadEnvironment("textures/tropical_beach.jpg", function(mesh) {
	    	game.updateCubeMap();
	    	loadLevel(levelData, itemData);
	    });*/
	   
	   loadLevel(levelData, itemData);
	    
	    /*setInterval(function() {
		game.updateCubeMap();
	    }, 1000);*/


	    var fps = 60;
	    var interval = 1000/fps;
	    var drawTime = null;
	    var logicTime = null;
	    var frameTimer = new THREE.Clock(true);
	    var frameCount = 0;
	    var logicCount = 0;
	    function draw() {
			requestAnimationFrame(draw);
			game.render();
	    	if(frameTimer.getElapsedTime() >= 1.0) {
	    		document.getElementById("debugConsole").innerHTML = "drawFPS: " + frameCount + "<br/>logicFPS: " + logicCount;
	    		frameCount = 0;
	    		logicCount = 0;
	    		frameTimer = new THREE.Clock(true);
	    	}
	    	frameCount++;
	    }
	    var logicInterval = setInterval(function() {
	    	game.animate();
	    	logicCount++;
	    }, interval);

	    draw();
	}
	
	loadJSON("js/data/settings.json", function(gameSettings) {
		loadJSON("js/data/level1.json", function(levelData) {
			loadJSON("js/data/items.json", function(itemData) {
				runGame(gameSettings, levelData, itemData);
			});
		});
	});
});