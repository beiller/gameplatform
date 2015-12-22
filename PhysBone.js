var radius = 0.1;
var sphereGeometry = new THREE.SphereGeometry(radius, 6, 6);
var sphereMaterial = new THREE.MeshBasicMaterial({wireframe: true});

function PhysBone2(boneFrom, boneTo, character, game) {
	this.boneFrom = boneFrom;
	this.boneTo = boneTo;
	this.game = game;
	this.character = character;
	
	this.updateFunc = this.__disableDynamic;
	
	var bbox = {
		max: new THREE.Vector3(0.5,0.5,0.5),
		min: new THREE.Vector3(-0.5,-0.5,-0.5)
	};
	var t = new THREE.Vector3();
	var q = new THREE.Quaternion();
	var s = new THREE.Vector3();
	boneFrom.matrixWorld.decompose(t, q, s);
	//this.body = game.createPhysBox(bbox, 1.0, t);
    var radius = 0.1;
    var sphereShape = new CANNON.Sphere(radius);
    var mass = 1;
    var spherebody = new CANNON.Body({ mass: mass });
    spherebody.addShape(sphereShape);
    spherebody.position.copy(t);
    this.body = spherebody;
    game.world.add(spherebody);
    //demo.addVisual(spherebody);
    var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(spherebody.position);
    //game.scene.add(sphere);
    //game.dynamics.push(new Dynamic(sphere, spherebody));
	//this.body.debugMesh = sphere;

	
	//this.body.sleep();
	//this.constraint.disable();
}
PhysBone2.prototype.update = function(delta) {
	this.updateFunc();
    if(this.body.debugMesh) {
    	this.body.debugMesh.position.copy(this.body.position);
    	this.body.debugMesh.quaternion.copy(this.body.quaternion);
    }	
};
PhysBone2.prototype.enable = function() {
	var t = new THREE.Vector3();
	var q = new THREE.Quaternion();
	var s = new THREE.Vector3();
	this.boneFrom.matrixWorld.decompose(t, q, s);	
	this.body.position.copy(t);
	var localPoint1 = new CANNON.Vec3().copy(t);
	var localPoint2 = localPoint1.clone();
	localPoint1.copy(this.character.body.vectorToLocalFrame(localPoint1));
	localPoint2.copy(this.body.vectorToLocalFrame(localPoint2));
	console.log(localPoint1, localPoint2);
	
	this.constraint = new CANNON.PointToPointConstraint(this.character.body, localPoint1, this.body, localPoint2);
	this.constraint.collideConnected = false;
	this.game.world.addConstraint(this.constraint);	
	//this.body.wakeUp();
	//this.constraint.enable();
	this.updateFunc = this.__enableDynamic;
};
PhysBone2.prototype.disable = function() {
	//this.body.sleep();
	this.updateFunc = this.__disableDynamic;
};
PhysBone2.prototype.__enableDynamic = function() {  
    var q = new THREE.Quaternion().copy(this.body.quaternion);
    var p = new THREE.Vector3().copy(this.body.position);
    this.boneFrom.worldToLocal(p);
    //this.boneFrom.position.copy(p);
    this.boneFrom.quaternion.copy(q);
    //this.boneFrom.updateMatrixWorld(true);
    //this.boneFrom.matrixAutoUpdate = false;
    //this.boneFrom.matrixWorldNeedsUpdate = false;
    
};
PhysBone2.prototype.__disableDynamic = function() {
	this.body.sleep();
	var bone = this.boneFrom;
	var t = new THREE.Vector3();
	var q = new THREE.Quaternion();
	var s = new THREE.Vector3();
	bone.matrixWorld.decompose(t, q, s);
	this.body.position.copy(t);
	this.body.quaternion.copy(q);
};


function Dynamic(mesh, body) {
    this.mesh = mesh;
    this.body = body;
    this.sleep = false;
}
Dynamic.prototype.update = function() {
    if(!this.sleep) {
        //update physics components and copy to mesh position
        this.body.position.z = 0.0;
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
    }
    if(this.body.debugMesh) {
    	this.body.debugMesh.position.copy(this.body.position);
    	this.body.debugMesh.quaternion.copy(this.body.quaternion);
    }
};
Dynamic.prototype.findDynamic = function(game, mesh) {
    for(var i in game.dynamics) {
        if(game.dynamics[i].mesh === mesh) {
            return game.dynamics[i];
        }
    }
};

Item.prototype = new Dynamic();
Item.prototype.constructor = Item;
function Item(mesh, body, game) {
    Dynamic.prototype.constructor.call(this, mesh, body);
    this.game = game;
}



PhysBone.prototype = new Dynamic();
PhysBone.prototype.constructor = PhysBone;
function PhysBone(mesh, body, rootBone, spring, world, charObject) {
    Dynamic.prototype.constructor.call(this, mesh, body);
    this.rootBone = rootBone;
    this.spring = spring;
    this.charObject = charObject;
    //this.mesh.matrixAutoUpdate = false;
    this.restPosition = new THREE.Vector3().copy(this.mesh.position);
}
PhysBone.prototype.update = function() {
    //update physics components and copy to mesh position
    this.mesh.position.copy(this.restPosition);
    this.mesh.updateMatrixWorld(true);
    var vector = new THREE.Vector3().setFromMatrixPosition(this.mesh.matrixWorld);
    var position = new THREE.Vector3().copy(vector).sub(this.body.position);
    var dist = position.length();
    position.normalize();
    position.multiplyScalar(30 * dist);
    var force = new CANNON.Vec3().copy(position);
    this.body.applyLocalImpulse(force, new CANNON.Vec3(0,0,0));
    

	var invMatrix = new THREE.Matrix4().getInverse(new THREE.Matrix4().extractRotation(this.mesh.matrixWorld));
	var v1 = new THREE.Vector3().copy(vector);
	var v2 = new THREE.Vector3().copy(this.body.position);
	v1.applyMatrix4(invMatrix);
	v2.applyMatrix4(invMatrix);
    var p = new THREE.Vector3().copy(v1).sub(v2);
    //not sure why I have to reverse the z axis
    p.z = -p.z;
    //scale the effect
    p.multiplyScalar(0.15);
    //add the original bone offset back
    p.add(this.restPosition);
    
    this.mesh.position.copy(p);

    if(this.body.debugMesh) {
    	this.body.debugMesh.position.copy(this.body.position);
    	this.body.debugMesh.quaternion.copy(this.body.quaternion);
    }
};