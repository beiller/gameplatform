/**
 * @author itbxh
 */
function Item(name) {
	this.name = name;
	this.weight = 0.0;
}

function Elementals(elements) {
	this.elements = {
		'earth': 0,
		'water': 0,
		'fire': 0,
		'lightning': 0,
		'holy': 0,
		'dark': 0,
		'physical': 0,
		'magic': 0
	};	
	for(var i in elements) {
		if(i in this.elements) {
			this.elements[i] = elements[i];
		}
	}	
}
Elementals.prototype.getMultiplier = function(element) {
	if(element in this.elements) {
		return this.elements[element]		
	}
	return 1.0;
}

var Vec2 = THREE.Vector2;
var Vec3 = THREE.Vector3;

function Character(name, hitPoints, magicPoints, phys, world, baseResistance, baseAffinities, jsonFileName) {
	this.mesh = phys[1];
	this.body = phys[0];
	this.body.character = this;
	this.world = world;

	/*this.body.addEventListener("collide", function(e) {
		console.log(e.contact.penetrationVec);
		if(e.contact.penetrationVec.y > 0.00001 || e.contact.penetrationVec.y < 0.00001) {
			console.log('on ground!');
			this.character.onGround = true;
		}
	});*/


	this.movementDirection = new Vec3(0,0,0);
	this.movementSpeed = 1.0;
	this.jumpVelocity = 5.0;
	this.onGround = false;
	
	this.name = name;
	if(baseResistance == null) {
		this.resistances = new Elementals();	
	} else {
		this.resistances = baseResistance;
	} 
	if(baseAffinities == null) {
		this.affinities = new Elementals();	
	} else {
		this.affinities = baseAffinities;
	} 
		
	this.hitPoints = hitPoints;
	this.maxHitPoints = hitPoints;
	
	this.magicPoints = magicPoints;
	this.maxMagicPoints = magicPoints;
	
	this.equipment = {
		'head': null,
		'chest': null,
		'shoulder': null,
		'arms': null,
		'hands': null,
		'leftHand': null,
		'rightHand': null,
		'leftRing': null,
		'rightRing': null,
		'neck': null,
		'waist': null,
		'legs': null,
		'feet': null
	}
	
	this.inventory = [];
	this.carryWeight = 0;
	this.maxCarryWeight = 10;
	this.animations = {}
	if(jsonFileName != undefined) {
		this.createAvatar(jsonFileName);
	}


}
Character.prototype.createAvatar = function(jsonFileName) {
	var loader = new THREE.JSONLoader();
	var scene = this.world.scene;
	var scope = this;
	loader.load( jsonFileName, function ( geometry, materials ) {
		if(!materials) {
			var material = new THREE.MeshPhongMaterial({
				color: new THREE.Color(0xFF0000),
				specular: new THREE.Color(0x020202),
				shininess: 24,
				side: THREE.DoubleSide,
				skinning: true
			});
			materials = [material];
			console.log(materials);
		}
	    var skinnedMesh = new THREE.SkinnedMesh(geometry, materials[0]);
	    skinnedMesh.castShadow = true;
		skinnedMesh.receiveShadow = true;
	    skinnedMesh.scale.set(0.2, 0.2, 0.2);
	    //skinnedMesh.rotateOnAxis(new THREE.Vector3(0,1,0), 90);
	    scene.add(skinnedMesh);
	    console.log("geometry from file:", geometry);
		for ( var i in geometry.animations ) {
			console.log("creating animation", geometry.animations[ i ] );
			var animName = geometry.animations[ i ].name;
			scope.animations[ animName ] = new THREE.Animation( skinnedMesh, geometry.animations[ i ] );
			//scope.animations[ animName ].interpolationType = THREE.AnimationHandler.CATMULLROM;

		}
	    console.log("animations:", scope.animations);
	    console.log("animhandler:", THREE.AnimationHandler);
	    scope.animations["idle2"].play(0.0, 1.0);
	    scope.skinnedMesh = skinnedMesh;
	});
}
Character.prototype.onEquip = function() {
	
}
Character.prototype.addInventory = function(item) {
	if(!item instanceof Item) {
		return;
	}
	this.inventory.push(item);
	this.carryWeight += item.weight;
}

Character.prototype.equip = function(attachPoint, item) {
	if(attachPoint in this.equipment) {
		if(this.equipment[attachPoint] !== null) {
			var inv = this.equipment[attachPoint];
			this.equipment[attachPoint] = null;
			this.addInventory(inv);
		}
		equipment[attachPoint] = item;
		this.onEquip();
	}
}
Character.prototype.takeHit = function() {

}
Character.prototype.update = function() {
	/*var from = this.body.position;
	var to = new CANNON.Vec3(this.body.position.x, -100.0, this.body.position.y);
	this.body.collisionResponse = false;
	var ray = new CANNON.Ray(from, to);
	var intersect = ray.intersectWorld(this.world.world, {mode: CANNON.Ray.CLOSEST});
	if(ray.result.hasHit && ray.result.distance < 0.5001) {
		this.onGround = true;
	} else {
		this.onGround = false;
	}
	this.body.collisionResponse = true;*/
	if(this.body.position.y <= 0.53) {
		this.onGround = true;
	} else {
		this.onGround = false;
	}

	if(this.onGround) {
		var m = new Vec3().copy(this.movementDirection).multiplyScalar(this.movementSpeed);
		this.body.velocity.x = m.x;
		this.body.velocity.z = 0.0;
		//do jump?
		if(this.movementDirection.z > 0.0000) {
			//JUMP!
			//console.log('Jumping!');
			this.body.velocity.x = this.body.velocity.x * 0.5; //half our linear velocity when jumping because why not.
			this.body.velocity.y = this.jumpVelocity;
		}
	}
	this.body.position.z = 0.0;
	this.body.quaternion = new CANNON.Quaternion(0,0,0,1);
	if(this.skinnedMesh != undefined) {
		this.skinnedMesh.position.copy(this.body.position);
		this.skinnedMesh.position.y -= 0.5;
		if(!this.animations["idle2"].isPlaying && !this.onGround) {
			this.animations["run2"].stop();
			this.animations["idle2"].play(0.0, 1.0);
		}
		if(Math.abs(this.movementDirection.x) > 0.1) {
			if(this.animations["idle2"].isPlaying && this.onGround) {
				this.animations["idle2"].stop();
				this.animations["run2"].play(0.0, 1.0);
			}
			
			if(this.movementDirection.x > 0.0001) {
				this.skinnedMesh.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );
			} else {
				this.skinnedMesh.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), -Math.PI / 2 );
			}
		} else {
			if(this.animations["run2"].isPlaying && this.onGround) {
				this.animations["run2"].stop();
				this.animations["idle2"].play(0.0, 1.0);
			}
		}
		
	}
}


function BasicAI(character, basePoint) {
	this.character = character;
	this.updateFunc = this.wander;
	this.character.movementDirection.x = 1.0;
	
	this.clock = new THREE.Clock(true);
	this.basePoint = basePoint ? basePoint : new Vec2(0,0);
	this.wanderDist = 100.0;
	this.newWaypoint();

	this.sightThreshold = 5.0;

}
BasicAI.prototype.newWaypoint = function() {
	var rand = new Vec2(Math.random() - 0.5, 0).normalize().multiplyScalar(Math.random() * this.wanderDist)
	this.waypoint = new Vec2().copy(this.basePoint).add(rand);
}
BasicAI.prototype.idle = function() {
	var hit = this._detect_hit_player();
	this.character.movementDirection = new Vec2();
	if(this.clock.getElapsedTime() > (3 + (Math.random() * 10))) {
		this.updateFunc = this.wander;
	}
}
BasicAI.prototype._detect_hit_player = function() {
	var pc = this.character.world.getPlayer();
	if(pc) {
		var pos = new Vec3().copy(pc.position).sub(this.character.mesh.position);
		var len = pos.length();
		if(len < 0.6) {
			pos.normalize();
			//apply force to player and player takes damage
			var force = new CANNON.Vec3(pos.x, 0.01, 0.0);
			force.normalize();
			force.scale(400.0, force);
			force.y = Math.min(force.y, 10.0);
			pc.body.applyForce(force, pc.body.position);
			return true;
		}
	}
	return false;
}
BasicAI.prototype.attack = function() {
	var hit = this._detect_hit_player();
	var pc = this.character.world.getPlayer();
	if(pc) {
		var pos = new Vec3().copy(pc.position).sub(this.character.mesh.position);
		var len = pos.length();
		if(len < this.sightThreshold) {
			pos.normalize();
			if(hit) {
				this.updateFunc = this.idle;
				this.character.movementSpeed /= 5.0;
				this.clock = new THREE.Clock(true);
			}
			//console.log("I'm coming after you!");
			this.character.movementDirection.lerp(pos, 0.1);
		} else {
			this.updateFunc = this.wander;
			this.character.movementSpeed /= 5.0;
		}
	}
}
BasicAI.prototype.wander = function() {
	/*
		WHERE IS THE GOOD GUYS?
	*/
	var pc = this.character.world.getPlayer();
	if(pc) {
		var pos = new Vec3().copy(pc.position);
		//var mypos = ;
		pos.sub(this.character.mesh.position);
		if(pos.length() < this.sightThreshold) {
			console.log("I'm coming after you!");
			this.updateFunc = this.attack;
			this.character.movementSpeed *= 5.0;
		}
	}

	if(this.clock.getElapsedTime() > (3 + (Math.random() * 10))) {
		this.clock = new THREE.Clock(true);
		this.newWaypoint();
	}
	var from = new Vec2(this.character.mesh.position.x, this.character.mesh.position.z);
	var dist = new Vec2().copy(from).sub(this.waypoint);
	var newDir = new Vec2(-dist.x, -dist.y).normalize();
	this.character.movementDirection.lerp(newDir, 0.1);
}
BasicAI.prototype.update = function() {
	this.updateFunc();
	this.character.update();
}

function Controller(character) {
	
}


