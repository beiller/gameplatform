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

    this.animated_objects = [];
    this.characters = {};
    this.skinshaders = [];
    this.dynamicObjects = [];
}

Game.prototype.initPhysics = function() {
    this.world = new CANNON.World();
    this.world.gravity.set(0,-9.82,0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.defaultContactMaterial.friction = 0.035;
    this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
    this.world.defaultContactMaterial.contactEquationRegularizationTime = 10;
};
Game.prototype.initRendering = function() {
    this.clock = new THREE.Clock;

    this.container = document.createElement( 'div' );
    document.body.appendChild( this.container );

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(37.8, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.z = 2;
    this.camera.position.y = 2;
    this.camera.position.x = 2;

    this.cubeCamera = new THREE.CubeCamera( 1, 1000, 256 );
    //cubeCamera.renderTarget.minFilter = THREE.LinearMipMapLinearFilter;
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

    //scene1();

    this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
    //controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
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
Game.prototype.attachAnimations	= function(object) {
    object.animationMixer = new THREE.AnimationMixer( object );
    object.animations = {};
    for ( var i in object.geometry.animations ) {
        object.animations[object.geometry.animations[ i ].name]  = object.geometry.animations[ i ];
    }
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
                game.attachAnimations( object );
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
                game.animated_objects.push(object);
                if(onComplete !== undefined) onComplete(object);
            });
        });
    });
};
Game.prototype.loadCharacter = function(jsonPath, options, onComplete) {
    var game = this;
    this.jsonloader.load(jsonPath, function( geometry, materials ) {
        if(options.sss) {
            game.loadSSSMaterial(geometry, options.diffusePath, options.specularPath, options.normalPath, function(object) {
                game.characters[options.name] = object;
                object.scale.x = object.scale.y = object.scale.z = options.scale;
                if(onComplete !== undefined) onComplete(object);
            });
        } else {
            var material = new THREE.MeshPhongMaterial({
                skinning: true,
                diffuse: new THREE.Color( 0xFFFFFF ),
                specular: new THREE.Color( 0xFFFFFF ),
                emissive: new THREE.Color( 0x888888 )
            });
            var object = new THREE.SkinnedMesh( geometry, material );
            game.attachAnimations( object );
            game.scene.add( object );
            game.animated_objects.push(object);
            game.characters[options.name] = object;
            object.scale.x = object.scale.y = object.scale.z = options.scale || 1.0;
            if(onComplete !== undefined) onComplete(object);
        }
    } );
};
Game.prototype.loadClothing = function(jsonFileName, parent, onComplete) {
    var loader = new THREE.JSONLoader();
    var game = this;
    loader.load( jsonFileName, function ( geometry, materials ) {
        var skinnedMesh = new THREE.SkinnedMesh(geometry, new THREE.MeshFaceMaterial(materials));
        skinnedMesh.skeleton = parent.skeleton;
        skinnedMesh.castShadow = true;
        skinnedMesh.receiveShadow = true;
        parent.add(skinnedMesh);
        if(skinnedMesh.material.type == "MultiMaterial") {
            for(var i in skinnedMesh.material.materials) {
                skinnedMesh.material.materials[i].envMap = game.cubeCamera.renderTarget;
                skinnedMesh.material.materials[i].combine = THREE.MixOperation;
                skinnedMesh.material.materials[i].reflectivity  = 0.2;
                skinnedMesh.material.materials[i].skinning  = true;
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
    var delta = this.clock.getDelta() * this.timescale;
    for(var i in this.animated_objects) {
        if(this.animated_objects[i].animationMixer) {
            this.animated_objects[i].animationMixer.update( delta );
        }
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
Game.prototype.playAnimation = function(characterName, animationName, options) {
    if(options === undefined) {
        options = {};
    }
    if(this.characters[characterName] !== undefined && this.characters[characterName].animations !== undefined) {
        var character = this.characters[characterName];
        var a = new THREE.AnimationAction( character.animations[animationName] );
        a.loop = options.loop || THREE.LoopRepeat;
        a.timeScale = options.timeScale || 1.0;
        if(options.crossFade && character.animationMixer !== undefined) {
            a.weight = 0.0;
            var crossFadeFrom = character.animationMixer.actions[character.animationMixer.actions.length - 1];
            character.animationMixer = new THREE.AnimationMixer(character);
            character.animationMixer.addAction( a );
            character.animationMixer.addAction( crossFadeFrom );
            character.animationMixer.crossFade( crossFadeFrom, a, 1.00, false );
        } else {
            character.animationMixer = new THREE.AnimationMixer(character);
            character.animationMixer.play( a );
        }
    }
};