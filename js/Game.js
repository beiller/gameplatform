define([
	"lib/three", "lib/zepto", "Character", "physics/CannonPhysics", "physics/AmmoPhysics",
	"entity/DynamicEntity", "entity/PhysBone", "entity/PhysBoneConeTwist", "entity/PhysBoneHinge", "entity/Camera",
	"Loader", "OrbitControls"
], 
function(
		THREE, $, Character, Physics, AmmoPhysics, DynamicEntity, PhysBone, PhysBoneConeTwist, 
		PhysBoneHinge, Camera, Loader, OrbitControls
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
	    //this.physicsWorld = new AmmoPhysics();

	    this.orbitControls = null;
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
				"50 lx (Living Room)": 50,
				"100 lx (Very Overcast)": 100,
				"350 lx (Office Room)": 350,
				"400 lx (Sunrise/Sunset)": 400,
				"1000 lx (Overcast)": 1000,
				"18000 lx (Daylight)": 18000,
				"50000 lx (Direct Sun)": 50000,
			};
			
			var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
			bulbLight = new THREE.SpotLight( 0xffee88, 1, 100, 2 );
			bulbLight.intensity = bulbLuminousPowers["1700 lm (100W)"];
			bulbMat = new THREE.MeshStandardMaterial( {
				emissive: 0xffffee,
				emissiveIntensity: 1,
				color: 0x000000
			});
			bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
			bulbLight.position.set( 0, -1.0, 2 );
			bulbLight.castShadow = true;
			bulbLight.shadow.mapSize = new THREE.Vector2(4096, 4096);
			this.scene.add( bulbLight );
			this.bulbLight = bulbLight;
			
			hemiLight = new THREE.HemisphereLight( 0xddeeff, 0x0f0e0d, 0.02 );
			hemiLight.intensity = hemiLuminousIrradiances["1000 lx (Overcast)"];
			this.scene.add( hemiLight );

	};


	Game.prototype.initRendering = function() {
	    this.clock = new THREE.Clock;
	
	    this.container = document.createElement( 'div' );
	    document.body.appendChild( this.container );
	
	    this.scene = new THREE.Scene();

	    this.camera = new Camera(null, this, 37.8, window.innerWidth/window.innerHeight, 0.3, 100);

	    this.setupLighting();
	
	    this.jsonloader = new THREE.JSONLoader();

	    this.loader = new Loader();
	
	    this.renderer = new THREE.WebGLRenderer( { antialias: this.settings.enableAA } );
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
	    //this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	
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

	    this.orbitControls = new THREE.OrbitControls( this.camera.mesh, this.renderer.domElement );
	};
	Game.prototype.loadEnvironment = function(envMapPath, onComplete) {
	    var game = this;
	    this.loader.loadTexture(envMapPath).then(function(texture) {
	        var mesh = new THREE.Mesh(new THREE.SphereGeometry(50, 60, 40), new THREE.MeshBasicMaterial({map: texture}));
	        mesh.scale.x = -1.0;
	        game.scene.add(mesh);
	        if(onComplete !== undefined) onComplete(mesh);
	    });
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
		try {
		    this.dynamics.push(
		    	this.physicsWorld.createPhysBone("breast_R", "spine02", character, PhysBone)
		    );
		    this.dynamics.push(
		    	this.physicsWorld.createPhysBone("breast_L", "spine02", character, PhysBone)
		    );
		} catch(e) {
			console.log("Could not find breast_R bone.");
		}
	    
	    /*var c1 = new PhysBoneConeTwist("spine05", "spine04", this, character);
	    var c2 = new PhysBoneConeTwist("spine04", "spine03", this, character, c1);
		var c3 = new PhysBoneConeTwist("spine03", "spine02", this, character, c2);
		this.dynamics.push(c1);
		this.dynamics.push(c2);
		this.dynamics.push(c3);
		
		
		var c0 = new PhysBoneConeTwist("clavicle_R", "shoulder01_R", this, character);
		var c1 = new PhysBoneConeTwist("shoulder01_R", "upperarm01_R", this, character, c0);
	    var c2 = new PhysBoneConeTwist("upperarm01_R", "upperarm02_R", this, character, c1);
		var c3 = new PhysBoneConeTwist("upperarm02_R", "lowerarm01_R", this, character, c2);
		var c4 = new PhysBoneConeTwist("lowerarm01_R", "lowerarm02_R", this, character, c3);
		this.dynamics.push(c0);
		this.dynamics.push(c1);
		this.dynamics.push(c2);
		this.dynamics.push(c3);
		this.dynamics.push(c4);
		*/

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
	                var bones = [
	                	'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'head', 
	                	'upperarm01_R', 'upperarm02_R', 'lowerarm01_R', 'lowerarm02_R',
	                	'upperarm01_L', 'upperarm02_L', 'lowerarm01_L', 'lowerarm02_L',
	                	'upperleg01_R', 'upperleg02_R', 'lowerleg01_R', 'lowerleg02_R',
	                	'upperleg01_L', 'upperleg02_L', 'lowerleg01_L', 'lowerleg02_L',
	                ];
	           		bones.forEach(function(b) {
	           			game.dynamics.push(new PhysBone2(character.findBone(b), character.findBone("spine03"), character, game));
	           		});
	                game.loadPhysBones(character);
	                if(onComplete !== undefined) onComplete(character);
	            });*/
	        } else {

	        	var main_material = game.parseMaterial(options);
		        var mesh = new THREE.SkinnedMesh(geometry, main_material);
		        //mesh.bindMode = "attached";

		        //mesh.frustumCulled = !game.disableCull;
		        mesh.castShadow = game.settings.enableShadows;
		        mesh.receiveShadow = game.settings.enableShadows;
				var body = game.physicsWorld.addCharacterPhysics(geometry.boundingSphere.radius, characterMass, position);
				var character = new Character(mesh, game, body, options.name);
				game.characters[options.name] = character;
				game.scene.add( mesh );
				game.loadPhysBones(character);
				//game.meshPostProcess(mesh);
				//game.materialPostProcess(mesh.material, true);
				function timeout(mseconds) {
					return new Promise(function(resolve, reject) {
						setTimeout(resolve, mseconds);
					});
				}
				if("touch_self1.baked" in character.animations) {
					function animation_loop() {
						timeout(5000).then(function() {
							console.log("ACTION1");
							character.playAnimation("touch_self1.baked", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION2");
							character.playAnimation("touch_self2.baked", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION3");
							character.playAnimation("touch_self3.baked", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION3");
							character.playAnimation("touch_self3.baked", {"timeScale": 1.5});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION3");
							character.playAnimation("touch_self3.baked", {"timeScale": 2});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4.baked", {"crossFade": true });
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4.baked", {"timeScale": 1.2});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4.baked", {"timeScale": 1.5});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4.baked", {"timeScale": 2});
							return timeout(5000);
						}).then(function(){
							console.log("ACTION4");
							character.playAnimation("touch_self4.baked", {"timeScale": 2.5});
							return timeout(1200);
						}).then(function(){
							console.log("ACTION5");
							character.playAnimation("touch_self5.baked", {"crossFade": true });
							animation_loop();
						});
					}
					animation_loop();
				}
				if("walk" in character.animations) {
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
	Game.prototype.meshPostProcess = function(mesh) {
		var scope = this;
		var convert_material = function(material) {
			console.log(material);
			var map = {
				'map': material.map,
				'color': new THREE.Color( 0xFFFFFF ),
				'transparent': material.transparent === null ? false : material.transparent,
				'opacity': material.opacity || 1.0,
				'alphaMap': material.alphaMap,
				'shininess': 80,
				'specular': new THREE.Color( 0x666666 ),
				//'metalness': 0.05,
				//'envMap': scope.cubeCamera.renderTarget.texture,
				//'roughness': 0.25
			};
			if(material['specularMap']) {
				map['specularMap'] = material['specularMap'];
			}
			if(material['normalMap']) {
				map['normalMap'] = material['normalMap'];
				map['normalScale'] = THREE.Vector2(10.0, 10.0);
			}
			return map;
		};
		if(mesh.material.type == "MultiMaterial") {
			for(var i in mesh.material.materials) {
				mesh.material.materials[i] = new THREE.MeshPhongMaterial(convert_material(mesh.material.materials[i]));
			}
		} else {
			mesh.material = new THREE.MeshPhongMaterial(convert_material(mesh.material));
		}
	};
	Game.prototype.materialPostProcess = function(material, enableSkinning) {
		var scope = this;
		if(material.type == "MultiMaterial") {
			material.materials.forEach(function(_material, materialIndex) {
			   	scope.materialPostProcess(_material);
			});
		}
		material.side = THREE.DoubleSide;
		material.skinning = true;
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
				'color': materialOptions.color ? new THREE.Color( parseInt(materialOptions.color, 16) ) : new THREE.Color( 0xFFFFFF ),
				'transparent': materialOptions.transparent ? materialOptions.transparent : false,
				'opacity': materialOptions.opacity || 1.0,
				'shininess': materialOptions.shininess || 1.0,
				'specular': materialOptions.color ? new THREE.Color( parseInt(materialOptions.specular, 16) ) : new THREE.Color( 0x777777 ),
				'reflectivity': materialOptions.reflectivity ? materialOptions.reflectivity : 0.00001,
				//'metalness': 0.05,
				//'roughness': 0.25,
				'skinning': true
			};
			if(game.cubeCamera) {
				map['envMap'] = game.cubeCamera.renderTarget.texture;
			}
			var material = new THREE.MeshPhongMaterial(map);
			var loader = new Loader();
			var setMaterial = function(texturePath, slotName) {
				loader.loadTexture(texturePath).then(function(tex) {
					material[slotName] = tex;
					material.needsUpdate = true;
				});
			}
			var slots = ["map", "specularMap", "normalMap", "alphaMap"];
			var optionValues = ["diffusePath", "specularPath", "normalPath", "alphaPath"];
			slots.forEach(function(slot, i) {
				if(optionValues[i] in materialOptions) {
					setMaterial(materialOptions[optionValues[i]], slot);
				}
			});
		} else {
			var map = {
				'skinning': true
			};
			var material = new THREE.MeshPhongMaterial(map);
		}
		return material;
	};
	Game.prototype.loadClothing = function(jsonFileName, parent, options, onComplete) {
	    var game = this;
	    if(options === undefined) options = {};
	    var loadedMesh = function(geometry, materials) {
	    	var material = game.parseMaterial(options);
	        var skinnedMesh = new THREE.SkinnedMesh(geometry, material);
	        skinnedMesh.frustumCulled = !game.disableCull;
	        //skinnedMesh.skeleton = parent.skeleton;
	        skinnedMesh.castShadow = game.settings.enableShadows;
	        skinnedMesh.receiveShadow = game.settings.enableShadows;
	        //game.meshPostProcess(skinnedMesh);
	        //game.materialPostProcess(skinnedMesh.material);
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
	        game.meshPostProcess(mesh);
	        game.materialPostProcess(mesh.material);
	        game.scene.add(mesh);
	        game.physicsWorld.addStaticPhysics(shape, mesh, position);
	        if (onComplete) onComplete(mesh);
	    });
	};
	Game.prototype.loadDynamicObject = function(jsonFileName, options, onComplete) {
	    options = options === undefined ? {} : options;
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
	        //game.meshPostProcess(mesh);
	        //game.materialPostProcess(mesh.material);
	        mesh.castShadow = game.settings.enableShadows;
	        mesh.receiveShadow = game.settings.enableShadows;
	        game.scene.add(mesh);
	        if (onComplete) onComplete(dynamic);
	    });
	};
	Game.prototype.animate = function() {
	    this.camera.update();
	
	    var delta = Math.min(0.1, (this.clock.getDelta() * this.timescale));

		this.physicsWorld.step();

	    for(var i in this.characters) {
	        this.characters[i].update(delta);
	    }
	
	    this.dynamics.forEach(function(dynamic) {
	        dynamic.update();
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
