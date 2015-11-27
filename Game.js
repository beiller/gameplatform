function Game() {
    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

    this.container = null;

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

    this.dynamics = [];
}

Game.prototype.initPhysics = function() {
    this.collisionGroups = [1,2,4,8,16,32];

    this.world = new CANNON.World();
    //this.world.gravity.set(0,-9.82,0);
    //more GAMIFY
    this.world.gravity.set(0,-35,0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 20;
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
	this.groundBody = groundBody;
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
    body.linearDamping = 0.000001;
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
     counter++
     this.characters['debugSphere'+counter] = sphere;*/

    return body;
};
Game.prototype.addObjectPhysics = function(mesh, mass, position) {
    //var shape = new CANNON.Sphere( radius || 1.0 );
    mesh.geometry.computeBoundingBox();
    var shape = new CANNON.Box(new CANNON.Vec3().copy(mesh.geometry.boundingBox.max).scale(0.3333));

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

    /*var sphere = new THREE.Mesh( new THREE.SphereGeometry( mesh.geometry.boundingBox.max.y * 0.3333, 12, 12 ), new THREE.MeshBasicMaterial({wireframe: true}) );
    sphere.position.copy(body.position);
    this.scene.add(sphere);
    this.dynamics.push(new Dynamic(sphere, body));*/

    return body;
};
Game.prototype.initRendering = function() {
    this.clock = new THREE.Clock;

    this.container = document.createElement( 'div' );
    document.body.appendChild( this.container );

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(37.8, window.innerWidth/window.innerHeight, 0.05, 1000);
    this.camera.position.z = 15;
    this.camera.position.y = 0.25;
    this.camera.position.x = 0;
    var cam = this.camera;

    function displaywheel(e) {
        var evt=window.event || e; //equalize event object
        var delta=evt.detail? evt.detail*(-120) : evt.wheelDelta; //check for detail first so Opera uses that instead of wheelDelta
        //document.getElementById("wheelvalue").innerHTML=delta //delta returns +120 when wheel is scrolled up, -120 when down
        cam.position.z += (delta/120*0.1);
        cam.position.y += (delta/120*0.005);
    }
    var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel"; //FF doesn't recognize mousewheel as of FF3.x
    document.addEventListener(mousewheelevt, displaywheel, false);

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
                object.material = sss.shader;
                game.scene.add(object);
                game.skinshaders.push(sss);
                if(onComplete !== undefined) onComplete(object, sss);
            });
        });
    });
};
Game.prototype.loadCharacter = function(jsonPath, options, onComplete) {
    var characterMass = 49.0; //50 KG
    var game = this;
    var position = options.position || [0,5,0];
    if(!options.name) return;
    this.jsonloader.load(jsonPath, function( geometry, materials ) {
        geometry.computeBoundingSphere();
        var radius = geometry.boundingSphere.radius;
        if(options.sss) {
            game.loadSSSMaterial(geometry, options.diffusePath, options.specularPath, options.normalPath, function(mesh, sss) {
                //create Character object
                var character = new Character(options.name, mesh, game.addCharacterPhysics(radius, characterMass, position), null, sss.object);
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
            var character = new Character(options.name, mesh, game.addCharacterPhysics(radius, characterMass, position));
            game.characters[options.name] = character;
            game.scene.add( mesh );
            mesh.scale.x = mesh.scale.y = mesh.scale.z = options.scale || 1.0;
            if(onComplete !== undefined) onComplete(character);
        }
    } );
};
Game.prototype.setMaterialOptions = function(mesh, options) {
    if(options === undefined) {
        return;
    }
    var scope = game;
    function _setopt(mat, options) {
        mat.envMap = scope.cubeCamera.renderTarget;
        mat.combine = options.combine || THREE.MixOperation;
        mat.reflectivity = options.reflectivity || 0.2;
        mat.emissive  = options.emissive || new THREE.Color( 0x000000 );
        mat.skinning  = options.skinning || false;
        mat.transparency = options.transparency || true;
        mat.opacity  = options.opacity || 1.0;
        mat.side  = THREE.DoubleSide;
        mat.color = options.color || mat.color;
    }
    if(mesh.material.type == "MultiMaterial") {
        for(var i in mesh.material.materials) {
            _setopt(mesh.material.materials[i], options);
        }
    } else {
        _setopt(mesh.material, options);
    }
};
Game.prototype.loadClothing = function(jsonFileName, parent, options, onComplete) {
    var game = this;
    if(options === undefined) options = {};
    this.jsonloader.load( jsonFileName, function ( geometry, materials ) {
        var skinnedMesh = new THREE.SkinnedMesh(geometry, new THREE.MeshFaceMaterial(materials));
        skinnedMesh.skeleton = parent.skeleton;
        skinnedMesh.castShadow = true;
        skinnedMesh.receiveShadow = true;
        parent.add(skinnedMesh);
        options.skinning = true;
        game.setMaterialOptions(skinnedMesh, options);
        if(onComplete !== undefined) onComplete(skinnedMesh);
    });
};
Game.prototype.loadStaticObject = function(jsonFileName, parent, options, onComplete) {
    var mass = options.mass || 10.0;
    var position = options.position || [0,1,0];
    var game = this;
    this.jsonloader.load( jsonFileName, function ( geometry, materials ) {
        var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));
        position = [mesh.position.x, mesh.position.y, mesh.position.z];
        game.setMaterialOptions(mesh, options);
        var physEnabled = options.enabled !== undefined ? options.enabled : true;
        var dynamic = new Dynamic(mesh, game.addObjectPhysics(mesh, mass, position));
        dynamic.sleep = !physEnabled;
        game.dynamics.push(dynamic);
        if(parent) {
            parent.add(mesh);
            mesh.position.set(0,0,0);
            dynamic.sleep = true;
        } else {
            game.scene.add(mesh);
            mesh.scale.set(0.3333, 0.3333, 0.3333);
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (onComplete !== undefined) onComplete(mesh);
    });
};
Game.prototype.animate = function() {
    this.camera.position.x = this.characters['eve'].body.position.x;
    var delta = Math.min(0.1, (this.clock.getDelta() * this.timescale));
    var maxSubSteps = 3;
    this.world.step(1.0/60, delta, maxSubSteps);
    for(var i in this.characters) {
        this.characters[i].update(delta);
    }
    for(var i in this.dynamics) {
        this.dynamics[i].update();
    }

    this.render();
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
