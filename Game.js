function Game() {
    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

    this.statsEnabled = true;

    this.container = null;
    this.stats = null;

    this.camera = null;
    this.cubeCamera = null;
    this.renderer = null;
    this.scene = null;

    this.controls = null;
    this.clock = null;

    this.texloader = null;
    this.jsonloader = null;

    this.timescale = 1.0;

    this.characters = {};
    this.skinshaders = [];
}

Game.prototype.initPhysics = function() {
    this.collisionGroups = [1,2,4,8,16,32];

    this.world = new CANNON.World();
    this.world.gravity.set(0,-9.82,0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = 0.2;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
    this.world.defaultContactMaterial.contactEquationRegularizationTime = 10;
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
	this.groundBody = groundBody;
};
Game.prototype.addCharacterPhysics = function(radius, mass, position) {
    var shape = new CANNON.Sphere( radius || 1.0 );
	var body = new CANNON.Body({
		mass: mass || 1.0
	});
    if(position === undefined) position = [0,0,0];
	body.addShape(shape);
	body.position.set(position[0], position[1], position[2]);
	body.collisionFilterGroup = this.collisionGroups[1];
	body.collisionFilterMask = this.collisionGroups[0];// | this.collisionGroups[1];
	body.fixedRotation = true;
	body.updateMassProperties();
	this.world.add(body); // Step 3

    /*var sphere = new THREE.Mesh( new THREE.SphereGeometry( radius, 12, 12 ), new THREE.MeshBasicMaterial({wireframe: true}) );
    sphere.position.copy(body.position);
	this.scene.add(sphere);
    sphere.body = body;
	sphere.update = function(dt) {
        this.position.copy(this.body.position);
        //this.mesh.quaternion.copy(this.body.quaternion);
    }
    this.characters['debugSphere'] = sphere;*/

    return body;
};
Game.prototype.initRendering = function() {
    this.clock = new THREE.Clock;

    this.container = document.createElement( 'div' );
    document.body.appendChild( this.container );

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(37.8, window.innerWidth/window.innerHeight, 0.05, 1000);
    this.camera.position.z = 2;
    this.camera.position.y = 2;
    this.camera.position.x = 2;

    this.cubeCamera = new THREE.CubeCamera( 1, 1000, 256 );
    //this.cubeCamera.renderTarget.texture.minFilter = THREE.LinearFilter;
    this.scene.add( this.cubeCamera );

    // LIGHTS

    var directionalLight = new THREE.DirectionalLight( 0xffeedd, 1.5 );
    directionalLight.position.set( 1, 0.5, 1 );
    this.scene.add( directionalLight );

    directionalLight = new THREE.DirectionalLight( 0xddddff, 0.5 );
    directionalLight.position.set( -1, 0.5, -1 );
    this.scene.add( directionalLight );


    this.texloader = new THREE.TextureLoader();
    this.jsonloader = new THREE.JSONLoader();


    this.renderer = new THREE.WebGLRenderer( { antialias: false } );
    this.renderer.setClearColor( 0x050505 );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.autoClear = false;

    this.container.appendChild( this.renderer.domElement );

    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;

    // STATS

    if ( this.statsEnabled ) {

        this.stats = new Stats();
        this.container.appendChild( this.stats.domElement );

    }
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
Game.prototype.loadSSSMaterial = function(geometry, diffusePath, specularPath, normalPath, onComplete) {
    var game = this;
    this.texloader.load(diffusePath, function(diffuseTexture) {
        game.texloader.load(specularPath, function(specularTexture) {
            game.texloader.load(normalPath, function(normalTexture) {
                var object = new THREE.SkinnedMesh( geometry );
                var sss = new SkinShaderPass(game.renderer, game.camera, geometry, object, diffuseTexture, specularTexture, normalTexture);
                var shader = THREE.ShaderSkinCustom[ "skin" ];
                var uniforms = THREE.UniformsUtils.clone( sss.shader.uniforms );
                uniforms[ "tNormal" ].value = sss.shaderUV.uniforms[ "tNormal" ].value;
                uniforms[ "tDiffuse" ].value = sss.shaderUV.uniforms[ "tDiffuse" ].value;
                uniforms[ "specularMap" ].value = sss.shader.uniforms[ "specularMap" ].value;
                uniforms[ "tBlur1" ].value = sss.shader.uniforms[ "tBlur1" ].value;
                uniforms[ "tBlur2" ].value = sss.shader.uniforms[ "tBlur2" ].value;
                uniforms[ "tBlur3" ].value = sss.shader.uniforms[ "tBlur3" ].value;
                uniforms[ "tBlur4" ].value = sss.shader.uniforms[ "tBlur4" ].value;
                uniforms[ "tBeckmann" ].value = sss.shader.uniforms[ "tBeckmann" ].value;
                var parameters = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms, lights: true, derivatives: true, transparent: true, skinning: true };
                game.scene.add(object);
                object.material = new THREE.ShaderMaterial( parameters );
                game.skinshaders.push(sss);
                if(onComplete !== undefined) onComplete(object, sss);
            });
        });
    });
};
Game.prototype.loadCharacter = function(jsonPath, options, onComplete) {
    var game = this;
    var position = options.position || [0,5,0];
    if(!options.name) return;
    this.jsonloader.load(jsonPath, function( geometry, materials ) {
        if(options.sss) {
            game.loadSSSMaterial(geometry, options.diffusePath, options.specularPath, options.normalPath, function(mesh, sss) {
                //create Character object
                var character = new Character(options.name, mesh, game.addCharacterPhysics(1.0, 0.5, position), null, sss.object);
                game.characters[options.name] = character;
                mesh.scale.x = mesh.scale.y = mesh.scale.z = options.scale;
                if(onComplete !== undefined) onComplete(character);
            });
        } else {
            var material = new THREE.MeshPhongMaterial({
                skinning: true,
                diffuse: options.diffuse || new THREE.Color( 0xDDDDDD ),
                specular: options.specular || new THREE.Color( 0xDDDDDD ),
                emissive: options.emissive || new THREE.Color( 0x000000 ),
                envMap: game.cubeCamera.renderTarget,
                combine: options.combine || THREE.MixOperation,
                reflectivity: options.reflectivity || 0.2
            });
            var mesh = new THREE.SkinnedMesh( geometry, material );
            var character = new Character(options.name, mesh, game.addCharacterPhysics(1.0, 0.5, position));
            game.characters[options.name] = character;
            game.scene.add( mesh );
            mesh.scale.x = mesh.scale.y = mesh.scale.z = options.scale || 1.0;
            if(onComplete !== undefined) onComplete(character);
        }
    } );
};
Game.prototype.loadClothing = function(jsonFileName, parent, options, onComplete) {
    var loader = new THREE.JSONLoader();
    var game = this;
    if(options === undefined) options = {};
    loader.load( jsonFileName, function ( geometry, materials ) {
        var skinnedMesh = new THREE.SkinnedMesh(geometry, new THREE.MeshFaceMaterial(materials));
        skinnedMesh.skeleton = parent.skeleton;
        skinnedMesh.castShadow = true;
        skinnedMesh.receiveShadow = true;
        parent.add(skinnedMesh);
        if(skinnedMesh.material.type == "MultiMaterial") {
            for(var i in skinnedMesh.material.materials) {
                skinnedMesh.material.materials[i].envMap = game.cubeCamera.renderTarget;
                skinnedMesh.material.materials[i].combine = options.combine || THREE.MixOperation;
                skinnedMesh.material.materials[i].reflectivity = options.reflectivity || 0.2;
                skinnedMesh.material.materials[i].emissive  = options.emissive || new THREE.Color( 0x000000 );
                skinnedMesh.material.materials[i].skinning  = true;
                skinnedMesh.material.materials[i].transparency = options.transparency || true;
                skinnedMesh.material.materials[i].opacity  = options.opacity || 1.0;
                skinnedMesh.material.materials[i].side  = THREE.DoubleSide;
            }
        } else {
            skinnedMesh.material.envMap = game.cubeCamera.renderTarget;
            skinnedMesh.material.skinning  = true;
        }
        if(onComplete !== undefined) onComplete(skinnedMesh);
    });
};
Game.prototype.animate = function() {
    this.controls.update();
    var delta = Math.min(0.1, (this.clock.getDelta() * this.timescale));

    this.world.step(delta);
    for(var i in this.characters) {
        this.characters[i].update(delta);
    }

    this.render();
    if ( this.statsEnabled ) this.stats.update();
};
Game.prototype.render = function() {
    if(!this.cubemapRendered) {
        this.cubeCamera.updateCubeMap( this.renderer, this.scene );
        this.cubemapRendered = true;
    }
    this.renderer.clear();
    for(var i in this.skinshaders) {
        this.skinshaders[i].render();
    }
    this.renderer.render( this.scene, this.camera );
};
Game.prototype.getCharacter = function(characterName) {
    return this.characters[characterName];
};
