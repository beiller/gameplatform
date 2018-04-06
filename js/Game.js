define([
	"lib/three", "lib/zepto", "Character", "physics/Physics", "PhysRig",
	"entity/DynamicEntity", "entity/Camera", "Loader", 'controller/AIController', 'controller/UserController',
	"PMREMGenerator", "PMREMCubeUVPacker", "EffectComposer"
], 
function(
		THREE, $, Character, Physics, PhysRig, DynamicEntity, Camera, Loader, AIController, 
		UserController, PMREMGenerator, PMREMCubeUVPacker, EffectComposer
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
	
	    this.timescale = 1.0;
	
	    this.characters = {};
	    this.skinshaders = [];
	
	    this.dynamics = [];
	
	    this.cubemapRendered = false;
	    
	    this.debugPhysics = false;

	    this.useSSAO = false;
	    
	    this.physicsWorld = new Physics();
	}
	Game.prototype.makeTextTexture = function( message, parameters ) {
	    if ( parameters === undefined ) parameters = {};
	    var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "MainFont";
	    var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 48;
	    var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
	    var borderColor = parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	    var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
	    //var spriteAlignment = THREE.SpriteAlignment.topLeft;
	    var canvas = document.createElement('canvas');
	    canvas.width = parameters.width || 512;
	    canvas.height = parameters.height || 256;
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
	    return texture;
	};
	Game.prototype.makeTextSprite = function( message, parameters ) {
		var texture = this.makeTextTexture(message, parameters);
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
	    
        var sprite = scope.makeTextSprite(text, {backgroundColor: { r:255, g:0, b:0, a:0.5 },borderColor:{ r:0, g:0, b:0, a:1.0 }});
        if('fromArray' in position) {  // if this is a THREE vector
        	sprite.position.copy(position);
    	} else {
    		sprite.position.fromArray(position);
    	}
        //sprite.position.y = ((Math.sin(1.2) * 15) - 21) * 0.5;
        scope.scene.add(sprite);
        var interval = setInterval(function() {
            var e = clock.getElapsedTime();
            //sprite.position.y = ((Math.sin((e*1.2)+1.2) * 15) - 21) * 0.5;
            sprite.position.y = sprite.position.y + (e * e * 0.003);
            //sprite.position.x += 0.017;
        }, 1000 / 60);
        setTimeout(function(){
            clearInterval(interval);
            scope.scene.remove(sprite);
            sprite.material.map.dispose();
        }, timeout);

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
			
			var scope = this;
			function createRectLight(pos) {
				var width = .5;
				var height = .5;
				var bulbLight = new THREE.RectAreaLight( 0xffee88, 1, width, height );
				//bulbLight.rotation.y = Math.PI;
				var rectLightMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial() );
				rectLightMesh.scale.x = bulbLight.width;
				rectLightMesh.scale.y = bulbLight.height;
				bulbLight.add( rectLightMesh );
				var rectLightMeshBack = new THREE.Mesh( new THREE.PlaneBufferGeometry(), new THREE.MeshBasicMaterial( { color: 0x080808 } ) );
				rectLightMeshBack.rotation.y = Math.PI;
				rectLightMesh.add( rectLightMeshBack );	
				return bulbLight;
			}
			function createPointLight(pos) {
				var bulbLight = new THREE.PointLight( 0xffee88, 1, 100, 2 );
				var bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
				var bulbMat = new THREE.MeshStandardMaterial( {
					emissive: 0xffffee,
					emissiveIntensity: 1,
					color: 0x000000
				});
				bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
				if(scope.settings.enableShadows) {
					setupShadows(bulbLight);
				}
				return bulbLight;
			}
			function setupShadows(light) {
				
				light.castShadow = true;
				light.shadow.mapSize = new THREE.Vector2( scope.settings.shadowResolution, scope.settings.shadowResolution );
				
				light.shadow.camera.fov = 1.0;
				light.shadow.camera.near = 0.1;
				light.shadow.camera.far = 10;
				//bulbLight.shadow.bias = 0.00001;
			}
			function createSpotLight(pos, tar) {
				
				//var bulbLight = createRectLight(pos);
				var bulbLight = createPointLight(pos);
				
				bulbLight.intensity = bulbLuminousPowers["3500 lm (300W)"];
		
				bulbLight.position.set( pos[0], pos[1], pos[2] );
				//bulbLight.target.position.set( tar[0], tar[1], tar[2] );
				bulbLight.distance = 100;
				//bulbLight.angle = 150.0;
				//scope.scene.add( bulbLight.target );
				scope.bulbLight = bulbLight;
				return bulbLight;
			}


			this.spot1 = createSpotLight([0.5, 0, -10], [0, -2.5, 0]);
			this.spot2 = createSpotLight([0.5, 0, 5], [0, -2.5, 0]);
			//this.scene.add(   this.spot1   );
			
			this.spot2.add(this.spot1);
			this.scene.add(   this.spot2   );

			/*var light1 = new THREE.PointLight( 0xffee88, 1, 100 );
			var bulbMat = new THREE.MeshStandardMaterial( {
				emissive: 0xffffee,
				emissiveIntensity: 1,
				color: 0x000000
			});
			light1.add( new THREE.Mesh( new THREE.SphereGeometry( 0.02, 16, 8 ), bulbMat ) );
			light1.position.set(-1,-2,-0.7);
			light1.intensity = 300;
			light1.shadow.mapSize = new THREE.Vector2( scope.settings.shadowResolution, scope.settings.shadowResolution );
			light1.shadow.camera.near = 0.1;
			light1.shadow.camera.far = 10;
			light1.castShadow = true;
			//this.camera.mesh.add(light1);
			this.scene.add(light1);
			this.light1 = light1;

			var light2 = new THREE.PointLight( 0xffee88, 1, 100 );
			light2.add( new THREE.Mesh( new THREE.SphereGeometry( 0.02, 16, 8 ), bulbMat ) );
			light2.position.set(1,-2,-0.7);
			light2.intensity = 300;
			light2.shadow.mapSize = new THREE.Vector2( scope.settings.shadowResolution, scope.settings.shadowResolution );
			light2.shadow.camera.near = 0.1;
			light2.shadow.camera.far = 10;
			light2.castShadow = true;
			//this.camera.mesh.add(light1);
			this.scene.add(light2);
			this.light2 = light2;*/

			/*var shadowCameraHelper = new THREE.CameraHelper( bulbLight.shadow.camera );
			this.scene.add( shadowCameraHelper );
			var lightHelper = new THREE.SpotLightHelper( bulbLight );
			this.scene.add( lightHelper );*/
			
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

	    this.camera = new Camera(null, this, 37.8, window.innerWidth/window.innerHeight, 0.01, 100);

	    this.setupLighting();
	
	    this.jsonloader = new THREE.JSONLoader();

	    this.loader = new Loader();
	
		this.renderer.physicallyCorrectLights = true;
		
		this.renderer.gammaInput = true;
		this.renderer.gammaOutput = true;
		this.renderer.shadowMap.enabled = true;
		this.renderer.toneMapping = THREE.ReinhardToneMapping;
		this.exposureSetting = 3.0;
	    this.renderer.setClearColor( 0x050505 );
	    this.renderer.setPixelRatio( window.devicePixelRatio );
	    this.renderer.setSize( window.innerWidth, window.innerHeight );
	    this.renderer.autoClear = false;
	    this.renderer.shadowMap.enabled = this.settings.enableShadows;
	    if(this.settings.softShadows) {
	    	this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	    }
	
	    this.container.appendChild( this.renderer.domElement );
	    
	    this.cubeCamera = new THREE.CubeCamera( 0.01, 1000, this.settings.cubeMapResolution );

	    this.scene.add( this.cubeCamera );


		// Setup render pass
		var renderPass = new THREE.RenderPass( this.scene, this.camera.mesh );

		// Setup SSAO pass
		ssaoPass = new THREE.SSAOPass( this.scene, this.camera.mesh );
		ssaoPass.renderToScreen = true;

		ssaoPass.uniforms["cameraNear"] = { value: 0.1 };
		ssaoPass.uniforms["cameraFar"] = { value: 10 };
		ssaoPass.uniforms["radius"] = { value: 64 };
		ssaoPass.uniforms["onlyAO"] = { value: 0 };
		ssaoPass.uniforms["aoClamp"] = { value: 0.0 };
		ssaoPass.uniforms["lumInfluence"] = { value: 0.1 };

		// Add pass to effect composer
		effectComposer = new THREE.EffectComposer( this.renderer );
		effectComposer.addPass( renderPass );
		effectComposer.addPass( ssaoPass );

		this.renderPass = renderPass;
		this.ssaoPass = ssaoPass;
		this.effectComposer = effectComposer;

	
	    var game = this;
	    var onWindowResize = function() {
	        game.camera.mesh.aspect = window.innerWidth / window.innerHeight;
	        game.camera.mesh.updateProjectionMatrix();
	        game.renderer.setSize( window.innerWidth, window.innerHeight );

			// Resize renderTargets
			game.ssaoPass.setSize( window.innerWidth, window.innerHeight );
			var pixelRatio = game.renderer.getPixelRatio();
			var newWidth  = Math.floor( window.innerWidth / pixelRatio ) || 1;
			var newHeight = Math.floor( window.innerHeight / pixelRatio ) || 1;
			game.effectComposer.setSize( newWidth, newHeight );
	    };
	    window.addEventListener( 'resize', onWindowResize, false );
	};
	Game.prototype.loadEnvironment = async function(envMapPath, onComplete) {
	    var texture = await this.loader.loadTexture(envMapPath);

        var mesh = new THREE.Mesh(
        	new THREE.SphereGeometry(50, 60, 40), 
        	new THREE.MeshStandardMaterial(
        		{
        			emissiveMap: texture,
        			emissiveIntensity: 100.0,
        			emissive: new THREE.Color( 0xFFFFFF ),
        			side: THREE.DoubleSide
        		}
        	)
        );
        //var mesh = new THREE.Mesh(new THREE.SphereGeometry(50, 60, 40), new THREE.MeshBasicMaterial({map: texture}));
        mesh.scale.x = -1.0;
        this.scene.add(mesh);
        if(onComplete !== undefined) onComplete(mesh);

	    //var geometry = new THREE.PlaneGeometry( 50, 5, 1, 1 );
	    var geometry = new THREE.BoxGeometry(200, 1, 12);
		var material = new THREE.MeshPhongMaterial( { color: 0xaaaaaa } );
		var floor = new THREE.Mesh( geometry, material );
		floor.position.y = -4.0;
		//floor.material.side = THREE.DoubleSide;
		floor.castShadow = this.settings.enableShadows;
        floor.receiveShadow = this.settings.enableShadows;
		this.scene.add( floor );
	};
	Game.prototype.loadPhysBones = function(character) {
		//return null;

		var spinedof = 0.05;
		/*
		var nameMapping = {
			"pel": "ORG-spine",
			"sp1": "DEF-spine.001",
			"sp2": "DEF-spine.002",
			"sp3": "DEF-spine.003",
			"sp4": "DEF-spine.004",
			"sp5": "DEF-spine.005",
			"hed": "head",
			"clv": "DEF-shoulder.{LR}",
			"am1": "DEF-upper_arm.{LR}",
			"am2": "DEF-upper_arm.{LR}.001"
			"am3": "DEF-forearm.{LR}",
			"am4": "DEF-forearm.{LR}.001",
			"hnd": "NPC Hand [Hnd].{LR}",
			"lg1": "NPC Thigh [Thg].R",
			"lg2": "NPC Calf [Clf].R",
			"fot": "NPC Foot [ft ].R"
		}*/
		var nameMapping = {
			"pel": "NPC Pelvis [Pelv]",
			"sp1": "NPC Spine [Spn0]",
			"sp2": "NPC Spine1 [Spn1]",
			"sp3": "NPC Spine2 [Spn2]",
			"sp4": "",
			"sp5": "NPC Neck [Neck]",
			"hed": "NPC Head [Head]",
			"clv": "NPC Clavicle [Clv].{LR}",
			"am1": "NPC UpperArm [Uar].{LR}",
			"am2": "NPC Forearm [Lar].{LR}",
			"hnd": "NPC Hand [Hnd].{LR}",
			"lg1": "NPC Thigh [Thg].R",
			"lg2": "NPC Calf [Clf].R",
			"fot": "NPC Foot [ft ].R"
		}
		var np = function(k) { return nameMapping[k]; };
		var boneWidth = 0.035;

		var boneMap = [
			{ bone: np('pel'), type: "KINEMATIC", radius: 0.7, options: { 
				localOffset:[0,0,0.15],
				rotationLimitsLow:  [-0.5,-0.5,-0.5],
				rotationLimitsHigh: [ 0.5, 0.5, 0.5],
					boxWidth: boneWidth, 
					boxHeight: boneWidth
			} },
			{ bone: np('sp1'), type: "KINEMATIC", radius: 0.7, connect_body: np('pel'), options: { 
				tailBone: np('sp2'),
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof],
					boxWidth: boneWidth, 
					boxHeight: boneWidth
			} },
			{ bone: np('sp2'), type: "KINEMATIC", radius: 0.7, connect_body: np('sp1'), options: { 
				tailBone: np('sp3'),
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof],
					boxWidth: boneWidth, 
					boxHeight: boneWidth
			} },
			{ bone: np('sp3'), type: "KINEMATIC", radius: 0.7, connect_body: np('sp2'), options: { 
				tailBone: np('sp5'),
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof],
					boxWidth: boneWidth, 
					boxHeight: boneWidth
			} },
			{ bone: np('sp5'), type: "KINEMATIC", radius: 0.7, connect_body: np('sp3'), options: { 
				tailBone: np('hed'),
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof],
					boxWidth: boneWidth, 
					boxHeight: boneWidth
			} },
			{ bone: np('hed'), type: "KINEMATIC", radius: 0.7, connect_body: np('sp5'), options: { 
				localOffset:[0,0,0.15],
				rotationLimitsLow:  [-spinedof,-spinedof,-spinedof],
				rotationLimitsHigh: [ spinedof, spinedof, spinedof],
					boxWidth: boneWidth, 
					boxHeight: boneWidth
			} }
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
					ARMS!!!!!
				*/
				/*{ bone: "DEF-shoulder."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-spine.003", options: { 
					tailBone:"DEF-upper_arm."+side,
					rotationLimitsLow:  [-0.01,-0.0,-0.01],
					rotationLimitsHigh: [ 0.01, 0.0, 0.01]
				} },
				{ bone: "DEF-upper_arm."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-shoulder."+side, options: { 
					tailBone:"DEF-upper_arm."+side+".001",
					rotationLimitsLow:  [-1,-1,-1],
					rotationLimitsHigh: [ 1, 1, 1]
				} },
				{ bone: "DEF-upper_arm."+side+".001", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-upper_arm."+side, options: { 
					tailBone:"DEF-forearm."+side,
					rotationLimitsLow:  [-0,-0,-0],
					rotationLimitsHigh: [ 0, 0, 0]
				} },
				{ bone: "DEF-forearm."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-upper_arm."+side+".001", options: { 
					tailBone:"DEF-forearm."+side+".001",
					rotationLimitsLow:  [   -0, 0,-0],
					rotationLimitsHigh: [    3, 0, 0]
				} },
				{ bone: "DEF-forearm."+side+".001", type: "KINEMATIC", radius: 0.08, connect_body: "DEF-forearm."+side, options: { 
					tailBone:"DEF-hand."+side,
					rotationLimitsLow:  [-0,-0,-0],
					rotationLimitsHigh: [ 0, 0, 0]
				} },
				{ bone: "ORG-hand."+side, type: "KINEMATIC", radius: 0.08, connect_body: "DEF-forearm."+side+".001", options: { 
					tailBone:"DEF-f_middle.01."+side,
					rotationLimitsLow:  [-1,-1,-1],
					rotationLimitsHigh: [ 1, 1, 1]
				} },*/


				{ bone: "NPC Breast."+side, type: "DYNAMIC", radius: 0.5, connect_body: np('sp3'), options: { 
					//tailBone:"DEF-breast."+side+".001",
					localOffset:[0,0,0.08] ,
					rotationLimitsLow:  [0,0,0],
					rotationLimitsHigh: [0,0,0],
					spring: true,
					stiffness: 2.5,
					distance: 6.0,
					mass: 2.0,
					boxWidth: boneWidth, 
					boxHeight: boneWidth
				} },
				{ bone: "NPC Butt."+side, type: "DYNAMIC", connect_body: np('pel'), options: { 
					//tailBone:"DEF-breast."+side+".001",
					localOffset:[0,0,0.08] ,
					rotationLimitsLow:  [0,0,0],
					rotationLimitsHigh: [0,0,0],
					spring: true,
					stiffness: 50.5,
					distance: 600.01,
					mass: 20.0,
					boxWidth: boneWidth, 
					boxHeight: boneWidth
				} },

				/*
					LEGS!!!
				*/
				/*{ bone: "DEF-thigh."+side, type: "KINEMATIC", radius: 0.02, connect_body: "ORG-spine", options: { 
					tailBone:"DEF-thigh."+side+".001" ,
					rotationLimitsLow:  [-3.1,-0.0,-0.1],
					rotationLimitsHigh: [ 3.1, 0.0, 0.1],
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
				} }*/
			]);
		};
		createLR("L");
		createLR("R");

		character.physRig.createFromMap(boneMap);

	    return null;
	
	};
	Game.prototype.removeCharacter = function(character) {	
		character.dispose();
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
	Game.prototype.loadCharacter = async function(jsonFileName, options) {
	    var characterMass = 49.0; //50 KG
	    var game = this;
	    var position = options.position || [0,3,0];
	    if(!options.name) {
	    	console.error("Did not specify name for character", options);
	    	return;
	    }
	    
	    var jsonMesh = await this.loader.loadMesh(jsonFileName);
	    var geometry = jsonMesh.geometry;
	    var materials = jsonMesh.materials;

        if(!geometry.boundingSphere) {
            geometry.computeBoundingSphere();
        }
        console.log(materials);
        var radius = geometry.boundingSphere.radius;

    	var main_material = this.parseMaterial(options);
        var mesh = new THREE.SkinnedMesh(geometry, main_material);
        mesh.frustumCulled = !this.disableCull;
        mesh.castShadow = this.settings.enableShadows;
        mesh.receiveShadow = this.settings.enableShadows;
		var body = this.physicsWorld.addCharacterPhysics(geometry.boundingSphere.radius, characterMass, position);
		if(this.debugPhysics) {
			var geometry = new THREE.BoxGeometry( 0.5, radius*2, 0.5 );
			var material = new THREE.MeshPhongMaterial( { color: 0xaaaaaa, wireframe: true } );
			body.debugMesh = new THREE.Mesh( geometry, material );
			this.scene.add(body.debugMesh);
		}

		var character = new Character(mesh, this, body, options.name);
		character.addEventListener("COLLIDE", function(event) { 
			if(event.collisionPoint[1] - character.body.getPositionY() < 0.0000) {
				character.onGround = true;
			}
		});
		this.characters[options.name] = character;
		this.scene.add( character.mesh );
		try {
			this.loadPhysBones(character);
		} catch(e) {
			console.error(e);
		}

		console.log("Animations:", character.animations)

		return character;
	};
	Game.prototype.parseMesh = function(geometry, materials) {
		if(geometry.attributes.skinWeight) {
        	var mesh = new THREE.SkinnedMesh(geometry, materials);
    	} else {
    		var mesh = new THREE.Mesh(geometry, materials);
    	}
		mesh.frustumCulled = !this.disableCull;
        mesh.castShadow = this.settings.enableShadows;
        mesh.receiveShadow = this.settings.enableShadows;
        return mesh;
	};
	Game.prototype.parseMaterial = function(options, num_slots) {
		var game = this;
    	if("material" in options) {
    		if(options["material"].constructor === Array) {
    			var material = options["material"].map(this.createMaterial, this);
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
				'normalScale' : materialOptions.normalScale ? new THREE.Vector2(materialOptions.normalScale, materialOptions.normalScale) : new THREE.Vector2(1, 1),
				'bumpScale': 'bumpScale' in materialOptions ? materialOptions.bumpScale : 0.0025,
				'color': materialOptions.color ? new THREE.Color( parseInt(materialOptions.color, 16) ) : new THREE.Color( 0xFFFFFF ),
				'transparent': materialOptions.transparent ? materialOptions.transparent : false,
				'opacity': materialOptions.opacity || 1.0,
				'metalness': materialOptions.metalness || 0,
				'metalness': 'metalness' in materialOptions ? materialOptions.metalness : 0.0,
				'roughness': 'roughness' in materialOptions ? materialOptions.roughness : 1.0,
				'skinning': true,
				'envMapIntensity': 100.0,
				'emissive': materialOptions.emissive ? new THREE.Color( parseInt(materialOptions.emissive, 16) ) : new THREE.Color( 0xFFFFFF ),
				'emissiveIntensity': 'emissiveIntensity' in materialOptions ? materialOptions.emissiveIntensity : 0.0,
				'refractionRatio': 'refractionRatio' in materialOptions ? materialOptions.refractionRatio : 0.95,
				'side': THREE.DoubleSide
				//'reflectivity': 'reflectivity' in materialOptions ? materialOptions.reflectivity : 0.0
				//'side': THREE.DoubleSide
			};

			if(this.cubeCamera) {
				map['envMap'] = this.cubeCamera.renderTarget.texture;
				//map['envMap'] = this.pmremCubeUVPacker.CubeUVRenderTarget.texture;
			}
			console.log("Roughness", map.roughness);
			if('specular' in map || 'specularPath' in map) {
				console.log("Warning: using specular data when we are physical based.");
			}

			//var material = new THREE.MeshStandardMaterial(map);
			var material = 'phong' in materialOptions ? new THREE.MeshPhongMaterial(map) : new THREE.MeshStandardMaterial(map);
			var loader = new Loader();
			var setMaterial = function(texturePath, slotName) {
				loader.loadTexture(texturePath).then(function(tex) {
					material[slotName] = tex;
					material.needsUpdate = true;
				});
			}
			var slots = ["map", "specularMap", "normalMap", "alphaMap", "bumpMap", "roughnessMap", "emissiveMap"];
			var optionValues = ["diffusePath", "specularPath", "normalPath", "alphaPath", "bumpPath", "roughnessPath", "emissivePath"];
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
	Game.prototype.loadItem = async function(jsonFileName, parent, options, onComplete) {
	    if(!options) options = {};
	    var jsonMesh = await this.loader.loadMesh(jsonFileName);
    	var mesh = this.parseMesh(jsonMesh.geometry, this.parseMaterial(options));
    	return mesh;
	};
	Game.prototype.loadStaticObject = async function(jsonFileName, shape, position, options, onComplete) {
	    if(!options) options = {};
	    var jsonMesh = await this.loader.loadMesh(jsonFileName);
    	var mesh = this.parseMesh(jsonMesh.geometry, this.parseMaterial(options));
    	mesh.position.fromArray(position);
    	this.scene.add(mesh);
        var body = this.physicsWorld.addStaticPhysics(shape, mesh, position, options.rotation);
		if(this.debugPhysics) {
			mesh.geometry.computeBoundingBox();
			var bboxmax = mesh.geometry.boundingBox.max;
			var geometry = new THREE.BoxGeometry( bboxmax.x*2, bboxmax.y*2, bboxmax.z*2 );
			var material = new THREE.MeshPhongMaterial( { color: 0xaaaaaa, wireframe: true } );
			var dmesh = new THREE.Mesh( geometry, material );
			dmesh.position.fromArray(position);
			if(options.rotation) {
				dmesh.rotation.fromArray(options.rotation);
			}
			this.scene.add(dmesh);
		}
    	return body;
	};
	Game.prototype.loadDynamicObject = async function(jsonFileName, options, onComplete) {
	    if(!options) options = {};
	    var mass = options.mass || 10.0;
	    var position = options.position || [0,1,0];
    	var jsonMesh = await this.loader.loadMesh(jsonFileName);
    	var mesh = this.parseMesh(jsonMesh.geometry, this.parseMaterial(options));
        
        position = [mesh.position.x, mesh.position.y, mesh.position.z];
        var physEnabled = options.enabled !== undefined ? options.enabled : true;
        var body = this.physicsWorld.addObjectPhysics(mesh, mass, position);
	    var len = mesh.geometry.boundingBox.max.sub(mesh.geometry.boundingBox.min);
        var dynamic = new DynamicEntity(mesh, this, body);
        dynamic.meshOffset = [len.x/2.0, len.y/2.0, len.z/2.0];
        dynamic.sleep = !physEnabled;
        this.dynamics.push(dynamic);
        this.scene.add(mesh);
        return dynamic;
	};
	Game.prototype.animate = function(skipPhysics, skipAnimation) {
	    this.camera.update();
	
	    var delta = Math.min(0.1, (this.clock.getDelta() * this.timescale));

	    if(!skipAnimation) {
		    for(var i in this.characters) {
		        this.characters[i].update(delta);
		    }
		}
		for(var i in this.dynamics) {
	        this.dynamics[i].update(delta);
	    }

		//run the physics step
		if(!skipPhysics) {
	        this.physicsWorld.step(delta);
	    }

	    if(!skipAnimation) {
		    for(var i in this.characters) {
		        this.characters[i].updateDynamicBones(delta);
		    }
		}

	    //this.render();
	};
	Game.prototype.updateCubeMap = function() {
		if(this.camera.trackingCharacter) {
		    for(var i in this.characters) {
		    	if(i == this.camera.trackingCharacter) {
		        	this.characters[i].armature.visible=false;//(delta);
		        }
		    }
		}

	    //this.cubeCamera.position.copy(this.camera.orbitControls.target);
	    if(this.camera.trackingCharacter && this.characters && this.characters[this.camera.trackingCharacter]) {
	    	this.cubeCamera.position.copy(this.characters[this.camera.trackingCharacter].mesh.position);
	    }
		this.renderer.clear();
		//this.cubeCamera.renderTarget.texture.mapping = THREE.CubeRefractionMapping;
		/*this.cubeCamera.renderTarget.generateMipmaps = true;
		this.cubeCamera.renderTarget.minFilter = THREE.LinearMipMapLinearFilter;
		this.cubeCamera.renderTarget.needsUpdate = true;*/


		this.cubeCamera.renderTarget.texture.generateMipmaps = true;
		this.cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
		this.cubeCamera.renderTarget.texture.needsUpdate = true;
	    
	    //this.renderer.clearTarget( this.cubeCamera.renderTarget, true, true, true );
	    this.cubeCamera.update( this.renderer, this.scene );
	    this.cubemapRendered = true;
		//this.cubeCamera.renderTarget.texture.mapping = THREE.CubeRefractionMapping;
    	//this.cubeCamera.renderTarget.texture.encoding = THREE.GammaEncoding;
	    //this.pmremGenerator = new THREE.PMREMGenerator( this.cubeCamera.renderTarget.texture );
		//this.pmremGenerator.update( this.renderer );
		/*var mipMaps = []
		for(var lod in this.pmremGenerator.cubeLods) {
			mipMaps.push(this.pmremGenerator.cubeLods[lod].texture);
		}
		this.cubeCamera.renderTarget.texture.mipmaps = mipMaps;
		this.cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
		this.cubeCamera.renderTarget.texture.needsUpdate = true;*/

		//this.pmremCubeUVPacker = new THREE.PMREMCubeUVPacker( this.pmremGenerator.cubeLods );
		//this.pmremCubeUVPacker.update( this.renderer );

		//this.cubeCamera.renderTarget.texture = this.pmremCubeUVPacker.CubeUVRenderTarget.texture;

		//var t1 = this.cubeCamera.renderTarget.texture;
		//var t2 = this.pmremCubeUVPacker.CubeUVRenderTarget.texture;
		//var t3 = this.pmremGenerator.cubeLods;*/

	    //this.renderer.toneMappingExposure = Math.pow( 0.31, this.exposureSetting );
	    for(var i in this.characters) {
	        this.characters[i].armature.visible=true;//(delta);
	    }
	};
	Game.prototype.render = function() {
	    this.renderer.clear();
	    if(this.useSSAO) {
	    	this.effectComposer.render();
	    } else {
	    	this.renderer.render( this.scene, this.camera.mesh );
	    }
	};
	Game.prototype.getCharacter = function(characterName) {
	    return this.characters[characterName];
	};

	var spawnCounter = 0;
	Game.prototype.spawnCharacter = async function(characterName, position, name, controllerConstructor) {
		if (!characterName in this.levelData.characters) {
			console.error('no such character', characterName, this.levelData.characters);
			return;
		}
		var characterData = this.levelData.characters[characterName];

		if(!name) {
			name = characterName + '.' + spawnCounter;
			spawnCounter += 1;
		}
		controllerConstructor = controllerConstructor || AIController;

		var character = await this.loadCharacter(
			characterData.model, {
				name: name,
				sss: characterData.sss,
				diffusePath: characterData.diffusePath,
				specularPath: characterData.specularPath,
				normalPath: characterData.normalPath,
				position: position,
				scale: characterData.scale,
				material: characterData.material
			}
		);
		character.addController(new controllerConstructor(character, this));
		var scope = this;
		characterData.equipment.forEach(function(itemName) {
			character.equip(scope.itemData[itemName]);
		});
		if (characterData.inventory !== undefined) {
			characterData.inventory.forEach(function(itemName) {
				character.inventory.push(scope.itemData[itemName]);
			});
		}
		return character;
	}

	Game.prototype.spawnItem = async function(itemName, position) {
		if(!(itemName in this.itemData)) {
			console.error(itemName, "not in data", this.itemData);
			return;
		} 
		var item = this.itemData[itemName];
		var mesh = await this.loadItem(item.model, this, item.options);
		var body = this.physicsWorld.addObjectPhysics(mesh, 1.0, position);
		/*if(this.debugPhysics) {
			var geometry = new THREE.BoxGeometry( 0.5, radius*2, 0.5 );
			var material = new THREE.MeshPhongMaterial( { color: 0xaaaaaa, wireframe: true } );
			body.debugMesh = new THREE.Mesh( geometry, material );
			this.scene.add(body.debugMesh);
		}*/
		this.scene.add(mesh);
		var dynamic = new DynamicEntity(mesh, this, body);
		dynamic.item = item;
		this.dynamics.push(dynamic);
		return dynamic;
	}

	Game.prototype.spawnParticles = async function(numParticles, position) {
		position = position || [0,0,0];
		var force = 7.0;
		// create the particle variables
		var heartTexture = this.makeTextTexture("♥", {width: 64, height: 64});
		//var heartTexture = this.makeTextTexture("💧", {width: 64, height: 64});
		
		var particles = new THREE.Geometry();
		particles.ages = new Array();
		console.log(particles);
		var pMaterial = new THREE.PointsMaterial({
			color: new THREE.Color( 0xff0000 ),
			map: heartTexture,
			size: 1,
			alphaTest: 0.5, transparent: true
		});

		var size = 0.01;
		var TIIIEEEGHTness = 1;
		var maxAge = 10;
		// now create the individual particles
		for (var p = 0; p < numParticles; p++) {
		  	// add it to the geometry
		  	particles.vertices.push(new THREE.Vector3(0,0,0));
			// add random velocities
			particles.colors.push(new THREE.Vector3(
				((Math.random() - 0.5) * 2) * TIIIEEEGHTness,
				((Math.random() - 0.5) * 2) * TIIIEEEGHTness,
				((Math.random() - 0.5) * 2) * TIIIEEEGHTness
			).normalize().multiplyScalar(force));
			particles.ages.push(Math.round(Math.random() * maxAge) - 1); // used for age
		}

		// create the particle system
		var particleSystem = new THREE.Points(particles, pMaterial);
		particleSystem.position.fromArray(position);

		// add it to the scene
		this.scene.add(particleSystem);

		let gravity = 9.85;
		let wind = 0.1; //scale gravity by "wind" to make floaty

		var updateFunction = function() {
			var dt = 30/1000;
			var pCount = numParticles;
			var tmpVec1 = new THREE.Vector3(0,0,0);
			while (pCount--) {
				// get the particle
				var particle = particles.vertices[pCount];
				var velocity = particles.colors[pCount];
				var age = particles.ages[pCount];
				particles.ages[pCount] += 1;

				
				particle.y -= 9.85 * dt * wind;
				tmpVec1.copy(velocity).multiplyScalar(dt);
				// and the position
				particle.add(
					tmpVec1
				);
				velocity.multiplyScalar(0.9);

				// check if we need to reset
				if (age > maxAge) {
					particle.set(0,0,0)
					velocity.set(
						((Math.random() - 0.5) * 2) * TIIIEEEGHTness,
						((Math.random() - 0.5) * 2) * TIIIEEEGHTness,
						((Math.random() - 0.5) * 2) * TIIIEEEGHTness
					).normalize().multiplyScalar(force);
					particles.ages[pCount] = 0;
				}
			}
			particleSystem.geometry.verticesNeedUpdate = true;
			//particleSystem.geometry.colorsNeedUpdate = true;
		};
		setInterval(updateFunction, 30);
	};
	var resolveUrl = (jsonUrl, dataReference) => {
		/*
			Resolve a URL node eg. 
			{
				"material": [
            		{ "$ref": "#/materials/materialname1" },
            		{ "$ref": "#/materials/materialname2" }
        		]
        	}
		*/
		let fullUrl = jsonUrl.split('#/')[1];
		let rootUrl = fullUrl.split('/')[0];
		let objectUrl = fullUrl.split('/')[1];
		if(rootUrl === 'materials') {
			var objectRef = dataReference[objectUrl];
			//copy the object
			var objectInstance = JSON.parse(JSON.stringify(objectRef));
			return objectInstance;
		}
	};
	var findVal = (myObject, current, materialsData) => {
		/*
			Recursively replace ref keys.
			Max recursion depth of n
		*/
		let MAX_RECUSION = 10;
		current = current || 0;
		for (let key in myObject) {
			if(myObject[key].hasOwnProperty('$ref')) {
				myObject[key] = resolveUrl(myObject[key]['$ref'], materialsData);
			} else {
				if(current < MAX_RECUSION) {
					findVal(myObject[key], current+1, materialsData);
				}
			}
		}
		return myObject;
	};
	Game.loadLevel = async function(levelFileName) {
		var loader = new Loader();
		var gameSettings = await loader.loadJSON("js/data/settings.json");
		var game = new Game(gameSettings);

		
		game.materialsData = await loader.loadJSON("js/data/materials.json");
		var postProcess = (jsonData) => { return findVal(jsonData, 0, game.materialsData); }
		game.levelData = await loader.loadJSON(levelFileName, postProcess);
		game.itemData = await loader.loadJSON("js/data/items.json", postProcess);

		game.initRendering();
		game.render();
		game.updateCubeMap();

		//show loading progress
		var interval = setInterval(function() {
			document.getElementById("debugConsole").innerHTML = 'loading: '+game.loader.total+'/'+game.loader.pending;
		}, 100);

		var futures = [];
		if(game.levelData.player) {
			futures.push(
				game.spawnCharacter(game.levelData.player.character, game.levelData.player.position, 'eve', UserController)
			);
		}

		game.levelData.staticObjects.forEach(function(element) {
			futures.push(
				game.loadStaticObject(element.model, element.shape, element.position, element.options)
			);
		});

		var id_counter = 0;
		game.levelData.npcs.forEach(async function(npc) {
			futures.push(game.spawnCharacter(npc.character, npc.position));
			id_counter += 1;
		});
		futures.push(game.loadEnvironment("textures/forest_park.jpg"));

		//wait for loading to finish
		for(var i = 0; i < futures.length; i++) {
			ret = await futures[i];
		}
		
		game.animate();
		game.render();

		//stop showing loading progress
		clearInterval(interval);

		return game;
	};

	return Game;
});
