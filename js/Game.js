define([
	"lib/three", "lib/zepto", "Character", "physics/Physics",
	"entity/DynamicEntity", "entity/Camera", "Loader"
], 
function(
		THREE, $, Character, Physics, DynamicEntity, Camera, Loader
	) {
	function Game(gameSettings) {
	    if ( gameSettings === undefined ) gameSettings = {};
	    
	    this.disableCull = gameSettings.disableCull === true;
		this.enableSSS = gameSettings.enableSSS === true;
		this.settings = gameSettings;
	
	    this.container = null;
	
	    this.camera = null;
	    this.cubeCamera = null;
	    this.renderer = null;
	    this.scene = null;
	
	    this.controls = null;
	    this.clock = null;
	
	    this.jsonloader = null;
	    this.loaderBusy = false;
	
	    this.timescale = 1.0;
	
	    this.characters = {};
	    this.skinshaders = [];
	
	    this.dynamics = [];
	
	    this.meshCache = {};
	    this.textureCache = {};
	
	    this.cubemapRendered = false;
	    
	    this.debugPhysics = false;
	    
	    this.physicsWorld = new Physics();
	}
	Game.prototype.makeTextSprite = function( message, parameters ) {
	    if ( parameters === undefined ) parameters = {};
	    var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "MainFont";
	    var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 48;
	    var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
	    var borderColor = parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	    var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
	    //var spriteAlignment = THREE.SpriteAlignment.topLeft;
	    var canvas = document.createElement('canvas');
	    canvas.width = 512;
	    canvas.height = 256;
	    canvas.lineWidth = 1;
	    var context = canvas.getContext('2d');
	    context.font = fontsize + 'px ' + fontface;
	
	    // get size data (height depends only on font size)
	    var metrics = context.measureText( message );
	    var textWidth = metrics.width;
	
	    //console.log(textWidth, ' textWidth');
	
	    // background color
	    context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
	        + backgroundColor.b + "," + backgroundColor.a + ")";
	    // border color
	    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
	        + borderColor.b + "," + borderColor.a + ")";
	    context.textAlign = "center";
	    context.lineWidth = borderThickness;
	    //roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
	    // 1.4 is extra height factor for text below baseline: g,j,p,q.
	    // text color
	    //context.strokeStyle = "rgba(0, 0, 0, 1.0)";
	    context.strokeText( message, canvas.width/2, fontsize + 5);
	    //context.fillStyle = "rgba(1.0, 0, 0, 1.0)";
	    context.fillText( message, canvas.width/2, fontsize + 5);
	
	    // canvas contents will be used for a texture
	    var texture = new THREE.Texture(canvas);
	    texture.needsUpdate = true;
	    var spriteMaterial = new THREE.SpriteMaterial(
	        { map: texture }
	    );
	    var sprite = new THREE.Sprite( spriteMaterial );
	    sprite.scale.set(2,1,1.0);
	    return sprite;
	};
	Game.prototype.displayText = function(position, text, timeout) {
	    var scope = this;
	    var clock = new THREE.Clock( true );
	    setTimeout(function() {
	        var sprite = scope.makeTextSprite(text, {backgroundColor: { r:255, g:0, b:0, a:0.5 },borderColor:{ r:0, g:0, b:0, a:1.0 }});
	        sprite.position.copy(position);
	        //sprite.position.y = ((Math.sin(1.2) * 15) - 21) * 0.5;
	        scope.scene.add(sprite);
	        var interval = setInterval(function() {
	            var e = clock.getElapsedTime();
	            //sprite.position.y = ((Math.sin((e*1.2)+1.2) * 15) - 21) * 0.5;
	            sprite.position.y = sprite.position.y + (e * e * 0.003);
	            sprite.position.x += 0.017;
	        }, 1000 / 60);
	        setTimeout(function(){
	            clearInterval(interval);
	            scope.scene.remove(sprite);
	            sprite.material.map.dispose();
	        }, timeout);
	    }, 100);
	};
	Game.prototype.setupLighting = function() {
			// ref for lumens: http://www.power-sure.com/lumens.htm
			var bulbLuminousPowers = {
				"110000 lm (1000W)": 110000,
				"3500 lm (300W)": 3500,
				"1700 lm (100W)": 1700,
				"800 lm (60W)": 800,
				"400 lm (40W)": 400,
				"180 lm (25W)": 180,
				"20 lm (4W)": 20,
				"Off": 0
			};
			// ref for solar irradiances: https://en.wikipedia.org/wiki/Lux
			var hemiLuminousIrradiances = {
				"0.0001 lx (Moonless Night)": 0.0001,
				"0.002 lx (Night Airglow)": 0.002,
				"0.5 lx (Full Moon)": 0.5,
				"3.4 lx (City Twilight)": 3.4,
				"25 lx (Shade)": 25,
				"50 lx (Living Room)": 50,
				"100 lx (Very Overcast)": 100,
				"350 lx (Office Room)": 350,
				"400 lx (Sunrise/Sunset)": 400,
				"1000 lx (Overcast)": 1000,
				"18000 lx (Daylight)": 18000,
				"50000 lx (Direct Sun)": 50000,
			};
			
			var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
			var bulbLight = new THREE.SpotLight( 0xffee88, 1, 100, 2 );
			bulbLight.intensity = bulbLuminousPowers["1700 lm (100W)"];
			bulbMat = new THREE.MeshStandardMaterial( {
				emissive: 0xffffee,
				emissiveIntensity: 1,
				color: 0x000000
			});
			bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
			bulbLight.position.set( 0.5, 0, 5 );
			bulbLight.target.position.set( 0, -2.5, 0 );
			bulbLight.castShadow = true;
			bulbLight.shadow.mapSize = new THREE.Vector2( 4096, 4096 );
			bulbLight.angle = 10.0;
			bulbLight.shadow.camera.fov = 10.0;
			bulbLight.shadow.camera.near = 1;
			bulbLight.shadow.camera.far = 5;
			bulbLight.distance = 10;
			bulbLight.shadow.bias = 0.00001;

			/*var shadowCameraHelper = new THREE.CameraHelper( bulbLight.shadow.camera );
			this.scene.add( shadowCameraHelper );
			var lightHelper = new THREE.SpotLightHelper( bulbLight );
			this.scene.add( lightHelper );*/

			this.scene.add( bulbLight );
			this.scene.add( bulbLight.target );
			this.bulbLight = bulbLight;
			
			hemiLight = new THREE.HemisphereLight( 0xddeeff, 0x0f0e0d, 0.02 );
			hemiLight.intensity = hemiLuminousIrradiances["25 lx (Shade)"];
			this.scene.add( hemiLight );

	};


	Game.prototype.initRendering = function() {
		this.renderer = new THREE.WebGLRenderer( { antialias: this.settings.enableAA } );
	    this.clock = new THREE.Clock;
	
	    this.container = document.createElement( 'div' );
	    document.body.appendChild( this.container );
	
	    this.scene = new THREE.Scene();

	    this.camera = new Camera(null, this, 37.8, window.innerWidth/window.innerHeight, 0.3, 100);

	    this.setupLighting();
	
	    this.jsonloader = new THREE.JSONLoader();

	    this.loader = new Loader();
	
		this.renderer.physicallyCorrectLights = true;
		
		this.renderer.gammaInput = true;
		this.renderer.gammaOutput = true;
		this.renderer.shadowMap.enabled = true;
		this.renderer.toneMapping = THREE.ReinhardToneMapping;
		this.exposureSetting = 8.0;
	    this.renderer.setClearColor( 0x050505 );
	    this.renderer.setPixelRatio( window.devicePixelRatio );
	    this.renderer.setSize( window.innerWidth, window.innerHeight );
	    this.renderer.autoClear = false;
	    this.renderer.shadowMap.enabled = this.settings.enableShadows;
	    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	
	    this.container.appendChild( this.renderer.domElement );
	    
	    this.cubeCamera = new THREE.CubeCamera( 1, 1000, 32 );
	    //this.cubeCamera.renderTarget.texture.minFilter = THREE.LinearFilter;
	    this.scene.add( this.cubeCamera );
	
	    var game = this;
	    var onWindowResize = function() {
	        game.camera.mesh.aspect = window.innerWidth / window.innerHeight;
	        game.camera.mesh.updateProjectionMatrix();
	        game.renderer.setSize( window.innerWidth, window.innerHeight );
	    };
	    window.addEventListener( 'resize', onWindowResize, false );
	};
	Game.prototype.loadEnvironment = function(envMapPath, onComplete) {
	    var game = this;
	    this.loader.loadTexture(envMapPath).then(function(texture) {
	        var mesh = new THREE.Mesh(new THREE.SphereGeometry(50, 60, 40), new THREE.MeshBasicMaterial({map: texture}));
	        mesh.scale.x = -1.0;
	        game.scene.add(mesh);
	        if(onComplete !== undefined) onComplete(mesh);
	    });
	    //var geometry = new THREE.PlaneGeometry( 50, 5, 1, 1 );
	    var geometry = new THREE.BoxGeometry(100, 0.5, 6);
		var material = new THREE.MeshPhongMaterial( { color: 0xaaaaaa } );
		var floor = new THREE.Mesh( geometry, material );
		floor.position.y = -4.0;
		//floor.material.side = THREE.DoubleSide;
		floor.castShadow = this.settings.enableShadows;
        floor.receiveShadow = this.settings.enableShadows;
		this.scene.add( floor );
	};
	Game.prototype.loadSSSMaterial = function(geometry, diffusePath, specularPath, normalPath, onComplete) {
	    var game = this;
	    this.loadTextureFile(diffusePath, function(diffuseTexture) {
	        game.loadTextureFile(specularPath, function(specularTexture) {
	            game.loadTextureFile(normalPath, function(normalTexture) {
	                var object = new THREE.SkinnedMesh( geometry );
	                var options = {"disableSSSRenderFrame": !game.enableSSS};
	                var sss = new SkinShaderPass(game.renderer, game.camera, geometry, object, diffuseTexture, specularTexture, normalTexture, options);
	                object.material = sss.shader;
	                //object.visible = false;
	                game.scene.add(object);
	                game.skinshaders.push(sss);
	                if(onComplete !== undefined) onComplete(object, sss);
	            });
	        });
	    });
	};
	Game.prototype.loadPhysBones = function(character) {
		//return null;

		var spinedof = 0.01;

		var boneMap = [
			//{ bone: "root", type: "KINEMATIC", radius: 0.02, options: { localOffset:[0,0,0.02] } },
			{ bone: "ORG-spine", type: "KINEMATIC", radius: 0.08, options: { 
				tailBone:"DEF-spine.001",
				rotationLimitsLow:  [-0.5,-0.5,-0.5],
				rotationLimitsHigh: [ 0.5, 0.5, 0.5]
			} },
			{ bone: "DEF-spine", type: "KINEMATIC", radius: 0.08, connect_body: "ORG-spine", options: { 
				localOffset:[0,0,0.001],
				rotationLimitsLow:  [-0.00,-0.00,-0.00],
				rotationLimitsHigh: [ 0.00, 0.00, 0.00], 
				noContact: true
			} },

			{ bone: "DEF-spine.001", type: "KINEMATIC", radius: 0.08, connect_body: "ORG-spine", options: { 
				tailBone:"DEF-spine.002",
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof]
			} },
			{ bone: "DEF-spine.002", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-spine.001", options: { 
				tailBone:"DEF-spine.003",
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof]
			} },
			{ bone: "DEF-spine.003", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-spine.002", options: { 
				tailBone:"DEF-spine.004",
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof]
			} },
			{ bone: "DEF-spine.004", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-spine.003", options: { 
				tailBone:"DEF-spine.005",
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof]
			} },
			{ bone: "DEF-spine.005", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-spine.004", options: { 
				tailBone:"DEF-spine.006",
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof]
			} },
			{ bone: "head", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-spine.005", options: { 
				localOffset:[0,0,0.15],
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof]
			} },
			{ bone: "DEF-spine.006", type: "KINEMATIC", radius: 0.08, connect_body: "head", options: { 
				localOffset:[0,0,0.001],
				rotationLimitsLow:  [-0.00,-0.00,-0.00],
				rotationLimitsHigh: [ 0.00, 0.00, 0.00], 
				noContact: true
			} },
		];
		function createLR(side) {
			boneMap.push.apply(boneMap, [
				/*{ bone: "DEF-f_index.03."+side, type: "KINEMATIC", radius: 0.02, options: { localOffset:[0,0,0.02] } },
				{ bone: "DEF-f_middle.03."+side, type: "KINEMATIC", radius: 0.02, options: { localOffset:[0,0,0.02] } },
				{ bone: "DEF-f_ring.03."+side, type: "KINEMATIC", radius: 0.02, options: { localOffset:[0,0,0.02] } },
				{ bone: "DEF-f_pinky.03."+side, type: "KINEMATIC", radius: 0.02, options: { localOffset:[0,0,0.02] } },

				{ bone: "DEF-f_index.02."+side, type: "KINEMATIC", radius: 0.02, options: { tailBone:"DEF-f_index.03."+side } },
				{ bone: "DEF-f_middle.02."+side, type: "KINEMATIC", radius: 0.02, options: { tailBone:"DEF-f_middle.03."+side } },
				{ bone: "DEF-f_ring.02."+side, type: "KINEMATIC", radius: 0.02, options: { tailBone:"DEF-f_ring.03."+side } },
				{ bone: "DEF-f_pinky.02."+side, type: "KINEMATIC", radius: 0.02, options: { tailBone:"DEF-f_pinky.03."+side } },*/
				
				/*
					???
				
				{ bone: "DEF-lower_glute."+side, type: "DYNAMIC", radius: 0.08, connect_body: "ORG-spine", options: { 
					localOffset:[0,0,0.07],
					rotationLimitsLow:  [-0.01,-0.01,-0.01],
					rotationLimitsHigh: [ 0.01, 0.01, 0.01]
				} },
				{ bone: "DEF-upper_glute."+side, type: "DYNAMIC", radius: 0.08, connect_body: "ORG-spine", options: { 
					localOffset:[0,0,0.07],
					rotationLimitsLow:  [-3.14, .0,-3.14],
					rotationLimitsHigh: [ 3.14, .0, 3.14]
				} },
				{ bone: "DEF-hip_glute."+side, type: "DYNAMIC", radius: 0.08, connect_body: "ORG-spine", options: { 
					localOffset:[0,0,0.07],
					rotationLimitsLow:  [ .0,-0.25, .0],
					rotationLimitsHigh: [ .0, 0.25, .0]
				} },
				*/


				/*
					ARMS!!!!!
				*/
				{ bone: "DEF-shoulder."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-spine.003", options: { 
					tailBone:"DEF-upper_arm."+side,
					rotationLimitsLow:  [-0.1,-0.1,-0.1],
					rotationLimitsHigh: [ 0.1, 0.1, 0.1]
				} },
				{ bone: "DEF-upper_arm."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-shoulder."+side, options: { 
					tailBone:"DEF-upper_arm."+side+".001",
					rotationLimitsLow:  [-15.14,-15.14,-.50],
					rotationLimitsHigh: [ 15.14, 15.14, .50]
				} },
				{ bone: "DEF-upper_arm."+side+".001", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-upper_arm."+side, options: { 
					tailBone:"DEF-forearm."+side,
					rotationLimitsLow:  [ 0,0,0 ],
					rotationLimitsHigh: [ 0,0,0 ]
				} },
				{ bone: "DEF-forearm."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-upper_arm."+side+".001", options: { 
					tailBone:"DEF-forearm."+side+".001",
					rotationLimitsLow:  [-0.00,-0.00,-0.00],
					rotationLimitsHigh: [ 3.14, 0.00, 0.00]
				} },
				{ bone: "DEF-forearm."+side+".001", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-forearm."+side, options: { 
					tailBone:"DEF-hand."+side,
					rotationLimitsLow:  [-0.0,-0.0, -0.0],
					rotationLimitsHigh: [ 0.0, 0.0,  0.0]
				} },
				{ bone: "ORG-hand."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-forearm."+side+".001", options: { 
					tailBone:"DEF-f_middle.01."+side,
					rotationLimitsLow:  [-0.1,-0.1, -0.1],
					rotationLimitsHigh: [ 0.1, 0.1,  0.1]
				} },


				{ bone: "ORG-breast."+side, type: "DYNAMIC", radius: 0.08, connect_body: "DEF-spine.003", options: { 
					tailBone:"DEF-breast."+side+".001",
					//localOffset:[0,0,0.07] ,
					rotationLimitsLow:  [-0.25,-0.25,-0.25],
					rotationLimitsHigh: [ 0.25, 0.25, 0.25],
					spring: true
				} },
				/*{ bone: "DEF-breast."+side+".001", type: "DYNAMIC", radius: 0.02, connect_body: "DEF-breast."+side, options: { 
					localOffset:[0,0,0.02] ,
					rotationLimitsLow:  [-0.1,-0.05,-0.1],
					rotationLimitsHigh: [ 0.2, 0.25, 0.2],
				} },*/

				/*
					LEGS!!!
				*/
				{ bone: "DEF-thigh."+side, type: "KINEMATIC", radius: 0.02, connect_body: "ORG-spine", options: { 
					tailBone:"DEF-thigh."+side+".001" ,
					rotationLimitsLow:  [-0.1,-0.0,-0.1],
					rotationLimitsHigh: [ 0.1, 0.0, 0.1],
				} },
				{ bone: "DEF-thigh."+side+".001", type: "KINEMATIC", radius: 0.02, connect_body: "DEF-thigh."+side, options: { 
					tailBone:"DEF-shin."+side ,
					rotationLimitsLow:  [0, -0.5, 0],
					rotationLimitsHigh: [0,  0.5, 0],
				} },
				{ bone: "DEF-shin."+side, type: "KINEMATIC", radius: 0.02, connect_body: "DEF-thigh."+side+".001", options: { 
					tailBone:"DEF-shin."+side+".001" ,
					rotationLimitsLow:  [-1.5,-0.00,-0.00],
					rotationLimitsHigh: [ 0.01, 0.00, 0.00],
				} },
				{ bone: "DEF-shin."+side+".001", type: "KINEMATIC", radius: 0.02, connect_body: "DEF-shin."+side, options: { 
					tailBone:"DEF-foot."+side ,
					rotationLimitsLow:  [-0,-0.50,-0.00],
					rotationLimitsHigh: [ 0, 0.50, 0.00],
				} },
				{ bone: "DEF-foot."+side, type: "KINEMATIC", radius: 0.02, connect_body: "DEF-shin."+side+".001", options: { 
					tailBone:"DEF-toe."+side ,
					rotationLimitsLow:  [-1.0,-0.010,-0.010],
					rotationLimitsHigh: [ 1.0, 0.010, 0.010],
				} },
				{ bone: "DEF-toe."+side, type: "KINEMATIC", radius: 0.02, connect_body: "DEF-foot."+side, options: { 
					localOffset:[0,0,0.05] ,
					rotationLimitsLow:  [-0.5,-0.010,-0.010],
					rotationLimitsHigh: [ 0.5, 0.010, 0.010],
				} }
			]);
		};
		createLR("L");
		createLR("R");


		if(character.findBone("DEF-spine.006")) {
			boneMap.forEach(function(e) {
				//DEBUG!!!!
				//e.type = "KINEMATIC";
				//END DEBUG!!!!
				if(e.bone) e.bone = character.findBone(e.bone); 
				if(e.options && e.options.tailBone) e.options.tailBone = character.findBone(e.options.tailBone);
				character.createPhysic(e, character.armature);
			});
		}

	    return null;
	
	};
	Game.prototype.removeCharacter = function(character) {
		character.remove();
		this.scene.remove(character.mesh);
		var to_delete = null;
		var scope = this;
		Object.keys(this.characters).forEach(function(character_name) {
			if(scope.characters[character_name] === character) {
				to_delete = character_name;
			}
		});
		if(to_delete) {
			delete this.characters[to_delete];
		}
	};
	Game.prototype.loadCharacter = function(jsonFileName, options, onComplete) {
	    var characterMass = 49.0; //50 KG
	    var game = this;
	    var position = options.position || [0,5,0];
	    if(!options.name) return;
	
	    this.loadJsonMesh(jsonFileName, function( geometry, materials ) {
	        if(!geometry.boundingSphere)
	            geometry.computeBoundingSphere();
	        console.log(materials);
	        var radius = geometry.boundingSphere.radius;
	        if(options.sss) {
	            /*game.loadSSSMaterial(geometry, options.diffusePath, options.specularPath, options.normalPath, function(mesh, sss) {
	                //create Character object
	                mesh.position.set(position[0], position[1], position[2]);
	                mesh.frustumCulled = !game.disableCull;
	                var character = new Character(mesh, game, game.addCharacterPhysics(radius, characterMass, position), options.name, null, sss.object);
	                game.characters[options.name] = character;
	                if(options.scale) {
	                    mesh.scale.x = mesh.scale.y = mesh.scale.z = options.scale;
	                }
	                game.loadPhysBones(character);
	                if(onComplete !== undefined) onComplete(character);
	            });*/
	        } else {
	        	var main_material = game.parseMaterial(options);
		        var mesh = new THREE.SkinnedMesh(geometry, main_material);
		        mesh.frustumCulled = !game.disableCull;
		        mesh.castShadow = game.settings.enableShadows;
		        mesh.receiveShadow = game.settings.enableShadows;
				var body = game.physicsWorld.addCharacterPhysics(geometry.boundingSphere.radius, characterMass, position);
				if(game.debugPhysics) {
					var geometry = new THREE.SphereGeometry( 1, 64, 64 );
					var material = new THREE.MeshPhongMaterial( { color: 0xaaaaaa, wireframe: true } );
					body.debugMesh = new THREE.Mesh( geometry, material );
					game.scene.add(body.debugMesh);
				}

				var character = new Character(mesh, game, body, options.name);
				character.addEventListener("COLLIDE", function(event) { 
					console.log("Character collided with", event); 
					if(event.collisionPoint[1] - character.body.getPositionY() < 0.0000) {
						character.onGround = true;
					}
				});
				game.characters[options.name] = character;
				game.scene.add( character.mesh );
				game.loadPhysBones(character);
				function timeout(mseconds) {
					return new Promise(function(resolve, reject) {
						setTimeout(resolve, mseconds);
					});
				}

				console.log("Animations:", character.animations)

				if("touch_self1" in character.animations && false) {
					function animation_loop() {
						timeout(5000).then(function() {
							console.log("ACTION1");
							character.playAnimation("touch_self1", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION2");
							character.playAnimation("touch_self2", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION3");
							character.playAnimation("touch_self3", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION3");
							character.playAnimation("touch_self3", {"timeScale": 1.5});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION3");
							character.playAnimation("touch_self3", {"timeScale": 2});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4", {"timeScale": 1.2});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self5", {"timeScale": 1});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self5", {"timeScale": 2});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4", {"timeScale": 2.5});
							return timeout(1200);
						}).then(function(){
							console.log("ACTION5");
							character.playAnimation("touch_self5", {"crossFade": true });
							animation_loop();
						});
					}
					animation_loop();
				}
				if("walk" in character.animations && false) {
					function animation_loop() {
						timeout(5000).then(function() {
							console.log("ACTION1");
							character.playAnimation("walk", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION2");
							character.playAnimation("punch", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION3");
							character.playAnimation("kick", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION5");
							character.playAnimation("idle", {"crossFade": true });
							animation_loop();
						});
					}
					animation_loop();
				}

				if(onComplete !== undefined) onComplete(character);
	        }
	    });
	};
	Game.prototype.loadJsonMesh = function(jsonFileName, loadedMesh, normalGeometry) {
		normalGeometry = normalGeometry === undefined ? false : normalGeometry;
	    if(this.meshCache[jsonFileName] !== undefined) {
	    	var newMaterials = [];
	    	if(!this.meshCache[jsonFileName].materials) {
	    		newMaterials = null;
	    	} else if(this.meshCache[jsonFileName].materials && !this.meshCache[jsonFileName].materials.clone) {
	    		var oldMaterials = this.meshCache[jsonFileName].materials;
	    		oldMaterials.forEach(function(m) {
	    			newMaterials.push(m.clone());
	    		});
	    	} else if(this.meshCache[jsonFileName].materials && this.meshCache[jsonFileName].materials.clone) {
	    		newMaterials = this.meshCache[jsonFileName].materials.clone();
	    	}
	        loadedMesh(this.meshCache[jsonFileName].geometry, newMaterials);
	    } else {
	    	//hack to implement sleep-wait
	    	var scope = this;
	    	if(scope.loaderBusy) {
	    		setTimeout(function() {scope.loadJsonMesh(jsonFileName, loadedMesh, normalGeometry);}, 500);	
	    		return;
	    	}
	        scope.loaderBusy = true;
	        jsonFileNameNoCache = jsonFileName + '?cache=' + new Date().getTime();
	        scope.jsonloader.load(jsonFileNameNoCache, function(geometry, materials) {
	        	if(!normalGeometry) {
					var bufferGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
					//THREE.js issue# 6869
			    	bufferGeometry.animations = geometry.animations;
			    	bufferGeometry.bones = geometry.bones;
			        scope.meshCache[jsonFileName] = {geometry: bufferGeometry, materials: materials};
			        geometry.dispose();
			        loadedMesh(bufferGeometry, materials);
				} else {
					scope.meshCache[jsonFileName] = {geometry: geometry, materials: materials};
					loadedMesh(geometry, materials);
				} 
				scope.loaderBusy = false;
	        });
	    }
	};
	Game.prototype.parseMaterial = function(options, num_slots) {
		var game = this;
    	if("material" in options) {
    		if(options["material"].constructor === Array) {
    			var material = new THREE.MultiMaterial(options["material"].map(this.createMaterial));
    		} else {
    			var material = this.createMaterial(options["material"]);
    		}
    	} else {
    		var material = this.createMaterial();
    	}
    	return material;
	};
	Game.prototype.createMaterial = function(materialOptions) {
		if(materialOptions) {
			console.log(materialOptions);
			var map = {
				'normalScale' : THREE.Vector2(200.0, 200.0),
				'bumpScale': materialOptions.bumpScale || 0.0025,
				'color': materialOptions.color ? new THREE.Color( parseInt(materialOptions.color, 16) ) : new THREE.Color( 0xFFFFFF ),
				'transparent': materialOptions.transparent ? materialOptions.transparent : false,
				'opacity': materialOptions.opacity || 1.0,
				'metalness': materialOptions.metalness || 0,
				'metalness': 'metalness' in materialOptions ? materialOptions.metalness : 0.0,
				'roughness': 'roughness' in materialOptions ? materialOptions.roughness : 1.0,
				'skinning': true,
				'envMapIntensity': 25.0,
				//'refractionRatio': 'refractionRatio' in materialOptions ? materialOptions.refractionRatio : 0.9999,
				//'reflectivity': 'reflectivity' in materialOptions ? materialOptions.reflectivity : 0.0,
			};
			if(game.cubeCamera) {
				map['envMap'] = game.cubeCamera.renderTarget.texture;
			}
			console.log("Roughness", map.roughness);
			if('specular' in map || 'specularPath' in map) {
				console.log("Warning: using specular data when we are physical based.");
			}
			var material = new THREE.MeshStandardMaterial(map);
			var loader = new Loader();
			var setMaterial = function(texturePath, slotName) {
				loader.loadTexture(texturePath).then(function(tex) {
					material[slotName] = tex;
					material.needsUpdate = true;
				});
			}
			var slots = ["map", "specularMap", "normalMap", "alphaMap", "bumpMap", "roughnessMap"];
			var optionValues = ["diffusePath", "specularPath", "normalPath", "alphaPath", "bumpPath", "roughnessPath"];
			slots.forEach(function(slot, i) {
				if(optionValues[i] in materialOptions) {
					setMaterial(materialOptions[optionValues[i]], slot);
				}
			});
		} else {
			var map = {
				'skinning': true
			};
			var material = new THREE.MeshStandardMaterial(map);
		}
		return material;
	};
	Game.prototype.loadClothing = function(jsonFileName, parent, options, onComplete) {
	    this.loadItem(jsonFileName, parent, options, onComplete);
	};
	Game.prototype.loadPhysItem = function(jsonFileName, character, options, onComplete) {
		this.loadItem(jsonFileName, character, options, onComplete);
	};
	Game.prototype.loadItem = function(jsonFileName, parent, options, onComplete) {
	    var game = this;
	    if(!options) options = {};
	    var loadedMesh = function(geometry, materials) {
	    	var material = game.parseMaterial(options);
	        var skinnedMesh = new THREE.SkinnedMesh(geometry, material);
	        skinnedMesh.frustumCulled = !game.disableCull;
	        skinnedMesh.castShadow = game.settings.enableShadows;
	        skinnedMesh.receiveShadow = game.settings.enableShadows;
	        if(onComplete) onComplete(skinnedMesh);
	    };
	    this.loadJsonMesh(jsonFileName, loadedMesh);
	};
	Game.prototype.loadStaticObject = function(jsonFileName, shape, position, onComplete) {
	    var game = this;
	    this.loadJsonMesh( jsonFileName, function ( geometry, materials ) {
	        var mesh = new THREE.Mesh(geometry, new THREE.MultiMaterial(materials));
	        mesh.position.set(position[0], position[1], position[2]);
	        mesh.castShadow = game.settings.enableShadows;
	        mesh.receiveShadow = game.settings.enableShadows;
	        game.scene.add(mesh);
	        game.physicsWorld.addStaticPhysics(shape, mesh, position);
	        if (onComplete) onComplete(mesh);
	    });
	};
	Game.prototype.loadDynamicObject = function(jsonFileName, options, onComplete) {
	    if(!options) options = {};
	    var mass = options.mass || 10.0;
	    var position = options.position || [0,1,0];
	    var game = this;
	    this.loadJsonMesh( jsonFileName, function ( geometry, materials ) {
	        var mesh = new THREE.Mesh(geometry, new THREE.MultiMaterial(materials));
	        position = [mesh.position.x, mesh.position.y, mesh.position.z];
	        var physEnabled = options.enabled !== undefined ? options.enabled : true;
	        var body = game.physicsWorld.addObjectPhysics(mesh, mass, position);
		    var len = mesh.geometry.boundingBox.max.sub(mesh.geometry.boundingBox.min);
	        var dynamic = new DynamicEntity(mesh, game, body);
	        dynamic.meshOffset = [len.x/2.0, len.y/2.0, len.z/2.0];
	        dynamic.sleep = !physEnabled;
	        game.dynamics.push(dynamic);
	        mesh.castShadow = game.settings.enableShadows;
	        mesh.receiveShadow = game.settings.enableShadows;
	        game.scene.add(mesh);
	        if (onComplete) onComplete(dynamic);
	    });
	};
	Game.prototype.animate = function(skipPhysics, skipAnimation) {
	    this.camera.update();
	
	    var delta = Math.min(0.1, (this.clock.getDelta() * this.timescale));

	    if(!skipPhysics) {
	        this.physicsWorld.step(delta);
	    }

	    if(!skipAnimation) {
		    for(var i in this.characters) {
		        this.characters[i].update(delta);
		    }
		}
		

	    this.dynamics.forEach(function(dynamic) {
	        dynamic.update(delta);
	    });

	    

	    //this.render();
	};
	Game.prototype.updateCubeMap = function() {
	    for(var i in this.characters) {
	        this.characters[i].mesh.visible=false;//(delta);
	    }
		this.renderer.clear();
	    this.cubeCamera.updateCubeMap( this.renderer, this.scene );
	    this.cubemapRendered = true;
	    //this.renderer.toneMappingExposure = Math.pow( 0.31, this.exposureSetting );
	    for(var i in this.characters) {
	        this.characters[i].mesh.visible=true;//(delta);
	    }
	};
	Game.prototype.render = function() {
	    this.renderer.clear();
	    this.renderer.render( this.scene, this.camera.mesh );
	};
	Game.prototype.getCharacter = function(characterName) {
	    return this.characters[characterName];
	};
	return Game;
});
