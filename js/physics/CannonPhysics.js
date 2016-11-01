define(["lib/cannon", "lib/three"], function(CANNON, THREE) {
	
	function Body(mybody) {
		this.body = mybody;
		//this.position = mybody.position;
		//this.quaternion = mybody.quaternion;
		//this.velocity = mybody.velocity;
	}
	Body.prototype.getPosition = function() {
		return [this.body.position.x, this.body.position.y, this.body.position.z];
	};
	Body.prototype.getPositionX = function() { return this.body.position.x; };
	Body.prototype.getPositionY = function() { return this.body.position.y; };
	Body.prototype.getPositionZ = function() { return this.body.position.z; };
	
	Body.prototype.applyImpulse = function(f, p) {
		this.body.applyImpulse(new CANNON.Vec3(f[0], f[1], f[2]), new CANNON.Vec3(p[0], p[1], p[2]));
	};
	
	Body.prototype.getVelocity = function() {
		return [this.body.velocity.x, this.body.velocity.y, this.body.velocity.z]; 
	};
	 
	Body.prototype.getQuaternion = function() {
		return [this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w];
	};	
	
	function CannonPhysics() {
		this.initPhysics();
	};
	CannonPhysics.prototype.step = function() {
		//var maxSubSteps = 3;
	    //this.world.step(1.0/60, delta);
	    this.world.step(1/60);
	};
	CannonPhysics.prototype.explosion = function(character, impulse) {
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
	};
	CannonPhysics.prototype.initPhysics = function() {
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
	    
	    this.addGroundPlane(-4);
	};
	CannonPhysics.prototype.addGroundPlane = function(height) {
	    var groundShape = new CANNON.Plane();
		var groundBody = new CANNON.Body({mass: 0});
		groundBody.addShape(groundShape);
		groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1,0,0), 90 * (Math.PI / 180));
		groundBody.collisionFilterGroup = this.collisionGroups[0];
		groundBody.collisionFilterMask = this.collisionGroups[0] | this.collisionGroups[1];
		groundBody.position.set(0, height, 0);
		this.world.add(groundBody);
	};
	CannonPhysics.prototype.addCharacterPhysics = function(radius, mass, position) {
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
	
	    /*if(this.debugPhysics) {
	        var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), new THREE.MeshBasicMaterial({wireframe: true}));
	        sphere.position.copy(body.position);
	        this.scene.add(sphere);
	        //this.dynamics.push(new DynamicEntity(sphere, this, body));
	        body.debugMesh = sphere;
	    }*/
	
	    return new Body(body);
	};
	CannonPhysics.prototype.addStaticPhysics = function(shape, mesh, position) {
        if(shape === 'box') {
            mesh.geometry.computeBoundingBox();
            var bboxmax = mesh.geometry.boundingBox.max;
            var box = new CANNON.Box(new CANNON.Vec3().copy(bboxmax));
            var body = new CANNON.Body({mass: 0});
            body.addShape(box);
            body.collisionFilterGroup = this.collisionGroups[0];
            body.collisionFilterMask = this.collisionGroups[0] | this.collisionGroups[1];
            body.position.set(position[0], position[1], position[2]);
            box.updateBoundingSphereRadius();
            this.world.add(body);
            return new Body(body);
        }
	};
	CannonPhysics.prototype.addObjectPhysics = function(mesh, mass, position) {
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
	
	    /*if(this.debugPhysics) {
	        var mbox = new THREE.Mesh(new THREE.BoxGeometry( sizex, sizey, sizez, 1, 1, 1 ), new THREE.MeshBasicMaterial({wireframe: true}));
	        this.scene.add(mbox);
	        //this.dynamics.push(new DynamicEntity(mbox, this, body));
	        body.debugMesh = mbox;
	    }*/
	
	    return new Body(body);
	};
	CannonPhysics.prototype.createPhysBone = function(boneName, parentBoneName, character, physBoneType) {
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
	    body.collisionFilterGroup = this.collisionGroups[3];
	    body.collisionFilterMask = this.collisionGroups[2];// | this.collisionGroups[1];
	    //body.fixedRotation = true;
	    this.world.add(body); // Step 3
	    return new physBoneType(parentBoneName, boneName, bone, body, this.world, character);
	
		/*if(game.debugPhysics) {
	        var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), new THREE.MeshBasicMaterial({wireframe: true}));
	        sphere.position.copy(body.position);
	        scope.scene.add(sphere);
	        //scope.dynamics.push(new DynamicEntity(sphere, this, body));
	            body.debugMesh = sphere;
			}*/
	};
	CannonPhysics.prototype.checkForGround = function(character) {
	    var r = character.mesh.geometry.boundingSphere.radius; //the half-radius to approximate my body not extending to the full sphere
	    var body = character.body.position;
	    var testList = [
	    	[new CANNON.Vec3(body.x+r*0.75, body.y, body.z), new CANNON.Vec3(body.x+r*0.75, body.y-10.0, body.z)],
	    	[new CANNON.Vec3(body.x-r*0.75, body.y, body.z), new CANNON.Vec3(body.x-r*0.75, body.y-10.0, body.z)],
	    ];
	    var ray3 = new CANNON.Ray(from, to);
	    var r_Bias = 0.5;
	
	    if(Math.abs(character.body.body.velocity.y) < 0.5) {
	        var options = {
	            collisionFilterGroup: this.collisionGroups[1],
	            collisionFilterMask: this.collisionGroups[0],
	            skipBackfaces: false,
	            mode: CANNON.Ray.CLOSEST
	        };
	      	var raycastResult = new CANNON.RaycastResult();
	      	for(var testRayIndex in testList) {
	      		var from = testList[testRayIndex][0];
	      		var to = testList[testRayIndex][1];
				if(this.world.raycastClosest(from, to, options, raycastResult) === true) {
					if (raycastResult.distance <= r+r_Bias) {
						return true;
					}
				}
			}
	    }
	    return false;
	};
	return CannonPhysics;
});