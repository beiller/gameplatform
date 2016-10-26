define([
	"lib/three", "lib/zepto", "lib/cannon", "Character", 
	"entity/DynamicEntity", "entity/PhysBone", "entity/PhysBoneConeTwist", "entity/PhysBoneHinge"
], 
function(THREE, $, CANNON, Character, DynamicEntity, PhysBone, PhysBoneConeTwist, PhysBoneHinge) {
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
	
	    this.texloader = null;
	    this.jsonloader = null;
	    this.loaderBusy = false;
	
	    this.timescale = 1.0;
	
	    this.characters = {};
	    this.skinshaders = [];
	
	    this.dynamics = [];
	    this.statics = [];
	
	    this.meshCache = {};
	    this.textureCache = {};
	
	    this.cubemapRendered = false;
	    
	    this.debugPhysics = false;
	}
	Game.prototype.explosion = function(character, impulse) {
	    if(this.world !== undefined) {
	        for(var body in this.world.bodies) {
	            if(this.world.bodies[body] !== character.body) {
	                var dist = new CANNON.Vec3().copy(this.world.bodies[body].position).vsub(character.body.position);
	                var range = 5.0;
	                var dlen = (dist.x + dist.y) / 2.0;
	                var attenuation;
	                if(dlen > range || dlen < -range) {
	                    attenuation = 0;
	                } else {
	                    if(dlen <= 0)
	                        attenuation = -1;
	                    if(dlen > 0)
	                        attenuation = 1;
	                }
	                var fImpulse = new CANNON.Vec3(impulse.x * attenuation, impulse.y * Math.pow(attenuation, 2), 0.0);
	                this.world.bodies[body].applyForce(fImpulse, character.body.position);
	            }
	        }
	    }
	};
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
	Game.prototype.initPhysics = function() {
	    this.collisionGroups = [1,2,4,8,16,32];
	
	    this.world = new CANNON.World();
	    this.world.gravity.set(0,-9.82,0);
	    //more GAMIFY
	    //this.world.gravity.set(0,-35,0);
	    this.world.broadphase = new CANNON.NaiveBroadphase();
	    this.world.solver.iterations = 100;
	    this.world.defaultContactMaterial.friction = 0.1;
	    this.world.defaultContactMaterial.contactEquationRegularizationTime = 10;
	    this.world.defaultContactMaterial.contactEquationStiffness = 1e9;
	    this.world.defaultContactMaterial.contactEquationRelaxation = 3;
	};
	Game.prototype.addGroundPlane = function(height) {
	    var groundShape = new CANNON.Plane();
		var groundBody = new CANNON.Body({mass: 0});
		groundBody.addShape(groundShape);
		groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1,0,0), 90 * (Math.PI / 180));
		groundBody.collisionFilterGroup = this.collisionGroups[0];
		groundBody.collisionFilterMask = this.collisionGroups[0] | this.collisionGroups[1];
		groundBody.position.set(0, height, 0);
		this.world.add(groundBody);
	    this.statics.push(groundBody);
	};
	Game.prototype.addCharacterPhysics = function(radius, mass, position) {
	    var shape = new CANNON.Sphere( radius || 1.0 );
	    var body = new CANNON.Body({
	        mass: mass || 49.0
	    });
	    if(position === undefined) position = [0,0,0];
	    body.addShape(shape);
	    body.position.set(position[0], position[1], position[2]);
	    body.collisionFilterGroup = this.collisionGroups[1];
	    body.collisionFilterMask = this.collisionGroups[0];// | this.collisionGroups[1];
	    body.fixedRotation = true;
	    //body.angularDamping = 0.9999999;
	    body.linearDamping = 0.2;
	    body.updateMassProperties();
	    this.world.add(body); // Step 3
	
	    if(this.debugPhysics) {
	        var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), new THREE.MeshBasicMaterial({wireframe: true}));
	        sphere.position.copy(body.position);
	        this.scene.add(sphere);
	        //this.dynamics.push(new DynamicEntity(sphere, this, body));
	        body.debugMesh = sphere;
	    }
	
	    return body;
	};
	Game.prototype.addObjectPhysics = function(mesh, mass, position) {
	    //var shape = new CANNON.Sphere( radius || 1.0 );
	    mesh.geometry.computeBoundingBox();
	    var len = mesh.geometry.boundingBox.max.sub(mesh.geometry.boundingBox.min);
	    var sizex = Math.abs(len.x);
	    var sizey = Math.abs(len.y);
	    var sizez = Math.abs(len.z);
	    var shape = new CANNON.Box(new CANNON.Vec3(sizex,sizey,sizez));
	
	    var body = new CANNON.Body({
	        mass: mass || 49.0
	    });
	    if(position === undefined) position = [0,0,0];
	    body.addShape(shape);
	    body.position.set(position[0], position[1], position[2]);
	    body.collisionFilterGroup = this.collisionGroups[0];
	    body.collisionFilterMask = this.collisionGroups[0];
	    body.updateMassProperties();
	    this.world.add(body); // Step 3
	
	    if(this.debugPhysics) {
	        var mbox = new THREE.Mesh(new THREE.BoxGeometry( sizex, sizey, sizez, 1, 1, 1 ), new THREE.MeshBasicMaterial({wireframe: true}));
	        this.scene.add(mbox);
	        //this.dynamics.push(new DynamicEntity(mbox, this, body));
	        body.debugMesh = mbox;
	    }
	
	    return body;
	};
	Game.prototype.initRendering = function() {
	    this.clock = new THREE.Clock;
	
	    this.container = document.createElement( 'div' );
	    document.body.appendChild( this.container );
	
	    this.scene = new THREE.Scene();
	
	    this.camera = new THREE.PerspectiveCamera(37.8, window.innerWidth/window.innerHeight, 0.05, 1000);
	    this.camera.position.z = 5;
	    this.camera.position.y = -3;
	    this.camera.position.x = 0;
	    var cam = this.camera;
	    var cameraRadius = 1.0;
	
	    function displaywheel(e) {
	        var evt=window.event || e; //equalize event object
	        var delta=evt.detail? evt.detail*(-120) : evt.wheelDelta; //check for detail first so Opera uses that instead of wheelDelta
	        //document.getElementById("wheelvalue").innerHTML=delta //delta returns +120 when wheel is scrolled up, -120 when down
	        cam.position.z += (delta/120*0.1);
	        //cam.position.y += (delta/120*0.005);
	        cameraRadius += delta/120*0.1;
	    }
	    var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x
	    document.addEventListener(mousewheelevt, displaywheel, false);
	    function mousemovement(e) {
	        var x = e.clientX;
	        var y = e.clientY;
	        var xr = ((x / window.innerWidth) - 0.5) * 2.0;
	        var yr = ((y / window.innerHeight) - 0.5) * 2.0;
	        var qtarget = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, -.1, 0), xr);
	        var qtarget2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-.1, 0, 0), yr);
	        qtarget.multiply(qtarget2);
	        cam.quaternion.slerp(qtarget, 0.25);
	    }
	    document.addEventListener("mousemove", mousemovement, false);
	
	    this.cubeCamera = new THREE.CubeCamera( 1, 1000, 128 );
	    //this.cubeCamera.renderTarget.texture.minFilter = THREE.LinearFilter;
	    this.scene.add( this.cubeCamera );
	
		// LIGHTS
		hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
		hemiLight.color.setHSL( 0.6, 1, 0.6 );
		hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
		hemiLight.position.set( 0, 500, 0 );
		this.scene.add( hemiLight );

		//

		dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
		dirLight.color.setHSL( 0.1, 1, 0.95 );
		dirLight.position.set( 0, 1.75, 1 );
		dirLight.position.multiplyScalar( 50 );
		this.scene.add( dirLight );

		dirLight.castShadow = true;

		dirLight.shadowMapWidth = 2048;
		dirLight.shadowMapHeight = 2048;

		var d = 50;

		dirLight.shadowCameraLeft = -d;
		dirLight.shadowCameraRight = d;
		dirLight.shadowCameraTop = d;
		dirLight.shadowCameraBottom = -d;

		dirLight.shadowCameraFar = 3500;
		dirLight.shadowBias = -0.0001;
		dirLight.shadowCameraVisible = true;
	
	    this.texloader = new THREE.TextureLoader();
	    this.jsonloader = new THREE.JSONLoader();
	
	
	    this.renderer = new THREE.WebGLRenderer( { antialias: this.settings.enableAA } );
	    this.renderer.setClearColor( 0x050505 );
	    this.renderer.setPixelRatio( window.devicePixelRatio );
	    this.renderer.setSize( window.innerWidth, window.innerHeight );
	    this.renderer.autoClear = false;
	
	    this.container.appendChild( this.renderer.domElement );
	
	    var game = this;
	    var onWindowResize = function() {
	        game.camera.aspect = window.innerWidth / window.innerHeight;
	        game.camera.updateProjectionMatrix();
	        game.renderer.setSize( window.innerWidth, window.innerHeight );
	    };
	    window.addEventListener( 'resize', onWindowResize, false );
	};
	Game.prototype.loadEnvironment = function(envMapPath, onComplete) {
	    var game = this;
	    this.texloader.load(envMapPath, function(texture) {
	        var mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 60, 40), new THREE.MeshBasicMaterial({map: texture}));
	        mesh.scale.x = -1;
	        game.scene.add(mesh);
	        if(onComplete !== undefined) onComplete(mesh);
	    });
	};
	Game.prototype.loadTextureFile = function(texturePath, callback) {
	    if(this.textureCache[texturePath] !== undefined) {
	        callback(this.textureCache[texturePath]);
	    } else {
	        var scope = this;
	        this.texloader.load(texturePath, function(texture) {
	            scope.textureCache[texturePath] = texture;
	            callback(texture);
	        });
	    }
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
		var game = this;
	    function createPhysBone(boneName, parentBoneName, character, physBoneType) {
	        var rootBone = character.findBone(parentBoneName);
	        var bone = character.findBone(boneName);
	        var radius = 0.075;
	        var shape = new CANNON.Sphere( radius );
	        var body = new CANNON.Body({
	            mass: 1.2  //weight of a boob is 1.2 kg?
	        });
	        body.addShape(shape);
	        var pos = new THREE.Vector3().set(
	            bone.matrixWorld.elements[12],
	            bone.matrixWorld.elements[13],
	            bone.matrixWorld.elements[14]
	        );
	        body.position.copy(pos);
	        body.collisionFilterGroup = scope.collisionGroups[3];
	        body.collisionFilterMask = scope.collisionGroups[2];// | this.collisionGroups[1];
	        //body.fixedRotation = true;
	        scope.world.add(body); // Step 3
	        //scope.dynamics.push(new PhysBone(bone, game, body, rootBone, scope.world, character));
	        scope.dynamics.push(new physBoneType(parentBoneName, boneName, bone, body, scope.world, character));
	
			if(game.debugPhysics) {
	            var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), new THREE.MeshBasicMaterial({wireframe: true}));
	            sphere.position.copy(body.position);
	            scope.scene.add(sphere);
	            //scope.dynamics.push(new DynamicEntity(sphere, this, body));
	            body.debugMesh = sphere;
			}
	
	    }
	    function createPhysBoneRag(boneName, parentBoneName, character, physBoneType) {
			var constraint = 
	        scope.dynamics.push(constraint);
	        return constraint;
	    }
	    var scope = this;
	    createPhysBone("breast_R", "spine02", character, PhysBone);
	    createPhysBone("breast_L", "spine02", character, PhysBone);
	    
	    /*var c1 = new PhysBoneConeTwist("spine05", "spine04", this, character);
	    var c2 = new PhysBoneConeTwist("spine04", "spine03", this, character, c1);
		var c3 = new PhysBoneConeTwist("spine03", "spine02", this, character, c2);
		this.dynamics.push(c1);
		this.dynamics.push(c2);
		this.dynamics.push(c3);
		*/
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
		
		//var d0 = new PhysBoneConeTwist("clavicle_L", "shoulder01_L", this, character);
		//var d1 = new PhysBoneConeTwist("shoulder01_L", "upperarm01_L", this, character, d0);
	    //var d2 = new PhysBoneConeTwist("upperarm01_L", "upperarm02_L", this, character, d1);
		var d3 = new PhysBoneConeTwist("upperarm02_L", "lowerarm01_L", this, character);
		var d4 = new PhysBoneConeTwist("lowerarm01_L", "lowerarm02_L", this, character, d3);
		//this.dynamics.push(d0);
		//this.dynamics.push(d1);
		//this.dynamics.push(d2);
		this.dynamics.push(d3);
		this.dynamics.push(d4);

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
				game.loadTextureFile(options.diffusePath, function(diffuseTexture) {
		        	var materialOptions = {
		                skinning: true,
		                //specular: options.specular ? new THREE.Color(parseInt(options.specular)) : new THREE.Color( 0x222222 ),
		                //emissive: options.emissive ? new THREE.Color(parseInt(options.specular)) : new THREE.Color( 0x000000 ),
		                //envMap: game.cubeCamera.renderTarget.texture,
		                //combine: options.combine || THREE.MixOperation,
		                //reflectivity: options.reflectivity || 0.1,
		                emissive: options.emissive || new THREE.Color( 0x0A0302 ),
		                roughness: options.roughness || 0.60,
		                metalness: options.metalness || 0.05,
		                map: diffuseTexture
					};
					var material = new THREE.MeshStandardMaterial(materialOptions);
					var scale = (options.scale || 1.0);
					var mesh = new THREE.SkinnedMesh( geometry, material );
					mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;
					var body = game.addCharacterPhysics(geometry.boundingSphere.radius, characterMass, position);
					var character = new Character(mesh, game, body, options.name);
					game.characters[options.name] = character;
					game.scene.add( mesh );
					game.loadPhysBones(character);
					if(onComplete !== undefined) onComplete(character);
				});
	        }
	    });
	};
	Game.prototype.setMaterialOptions = function(mesh, options) {
	    if(options === undefined) {
	        return;
	    }
	    var cubeCamera = this.cubeCamera;
	    function _setopt(mat, options, materialIndex) {
	        mat.envMap = cubeCamera.renderTarget.texture;
	        mat.combine = options.combine || THREE.MixOperation;
	        mat.reflectivity = options.reflectivity || 0.2;
	        mat.emissive  = options.emissive ? new THREE.Color(parseInt(options.emissive)) : new THREE.Color( 0x000000 );
	        mat.specular  = options.specular ? new THREE.Color(parseInt(options.specular)) : new THREE.Color( 0x808080 );
	        mat.skinning  = options.skinning || false;
	        mat.transparency = options.transparency || true;
	        mat.opacity  = options.opacity || 1.0;
	        mat.shininess = options.shininess || 30.0;
	        mat.side  = THREE.DoubleSide;
	        mat.color = options.color ? new THREE.Color(parseInt(options.color)) : mat.color ? mat.color : new THREE.Color( 0xCCCCCC );
	        mat.needsUpdate = true;
	    }
	    if(mesh.material.type == "MultiMaterial") {
			mesh.material.materials.forEach(function(_material, materialIndex) {
			   	_setopt(_material, options, materialIndex);
			});
	    } else {
	        _setopt(mesh.material, options, 0);
	    }
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
	Game.prototype.loadClothing = function(jsonFileName, parent, options, onComplete) {
	    var game = this;
	    if(options === undefined) options = {};
	    var loadedMesh = function(geometry, materials) {
	        var skinnedMesh = new THREE.SkinnedMesh(geometry, new THREE.MeshFaceMaterial(materials));
	        skinnedMesh.frustumCulled = !game.disableCull;
	        skinnedMesh.skeleton = parent.skeleton;
	        skinnedMesh.castShadow = true;
	        skinnedMesh.receiveShadow = true;
	        options.skinning = true;
	        game.setMaterialOptions(skinnedMesh, options);
	        if(onComplete) onComplete(skinnedMesh);
	    };
	    this.loadJsonMesh(jsonFileName, loadedMesh);
	};
	Game.prototype.loadStaticObject = function(jsonFileName, shape, position, onComplete) {
	    var game = this;
	    this.loadJsonMesh( jsonFileName, function ( geometry, materials ) {
	        var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));
	        mesh.position.set(position[0], position[1], position[2]);
	        //game.setMaterialOptions(mesh, options);
	        mesh.castShadow = true;
	        mesh.receiveShadow = true;
	        game.scene.add(mesh);
	        if(shape === 'box') {
	            mesh.geometry.computeBoundingBox();
	            var bboxmax = mesh.geometry.boundingBox.max;
	            var box = new CANNON.Box(new CANNON.Vec3().copy(bboxmax));
	            var groundBody = new CANNON.Body({mass: 0});
	            groundBody.addShape(box);
	            groundBody.collisionFilterGroup = game.collisionGroups[0];
	            groundBody.collisionFilterMask = game.collisionGroups[0] | game.collisionGroups[1];
	            groundBody.position.set(position[0], position[1], position[2]);
	            box.updateBoundingSphereRadius();
	            game.world.add(groundBody);
	        }
	        game.statics.push(groundBody);
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
	        game.setMaterialOptions(mesh, options);
	        var physEnabled = options.enabled !== undefined ? options.enabled : true;
	        var body = game.addObjectPhysics(mesh, mass, position);
		    var len = mesh.geometry.boundingBox.max.sub(mesh.geometry.boundingBox.min);
	        var dynamic = new DynamicEntity(mesh, game, body);
	        dynamic.meshOffset = [len.x/2.0, len.y/2.0, len.z/2.0];
	        dynamic.sleep = !physEnabled;
	        game.dynamics.push(dynamic);
	        game.scene.add(mesh);
	        mesh.castShadow = true;
	        mesh.receiveShadow = true;
	        if (onComplete) onComplete(dynamic);
	    });
	};
	Game.prototype.animate = function() {
	    if(this.cameraUpdateFunction === undefined) {
	        var scope = this;
	        this.cameraUpdateFunction = function () {
	            try {
	                scope.camera.position.x = scope.characters['eve'].body.position.x;
	                scope.camera.position.y = scope.characters['eve'].body.position.y + 0.2;
	            } catch (e) {
	
	            }
	        };
	    }
	    this.cameraUpdateFunction();
	
	    var delta = Math.min(0.1, (this.clock.getDelta() * this.timescale));
	    //var maxSubSteps = 3;
	    //this.world.step(1.0/60, delta);
	    this.world.step(1/60);
	    for(var i in this.characters) {
	        this.characters[i].update(delta);
	    }
	
	    this.dynamics.forEach(function(dynamic) {
	        dynamic.update();
	    });
	
	    //this.render();
	};
	Game.prototype.updateCubeMap = function() {
	    this.cubeCamera.updateCubeMap( this.renderer, this.scene );
	    this.cubemapRendered = true;
	};
	Game.prototype.render = function() {
	    if(!this.cubemapRendered) {
	        this.cubeCamera.updateCubeMap( this.renderer, this.scene );
	        this.cubemapRendered = true;
	    }
	    this.renderer.clear();
	    for(var i in this.skinshaders) {
	    	this.skinshaders[i].disableSSSRenderFrame = !this.enableSSS;
	        this.skinshaders[i].render();
	    }
	    this.renderer.render( this.scene, this.camera );
	};
	Game.prototype.getCharacter = function(characterName) {
	    return this.characters[characterName];
	};
	return Game;
});
