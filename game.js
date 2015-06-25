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

function Character(name, hitPoints, magicPoints, phys, world, baseResistance, baseAffinities) {
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
	if(this.body.position.y <= 0.5000001) {
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
BasicAI.prototype.attack = function() {
	var pc = this.character.world.getPlayer();
	if(pc) {
		var pos = new Vec3().copy(pc.position);
		//var mypos = ;
		pos.sub(this.character.mesh.position);
		var len = pos.length();
		if(len < this.sightThreshold) {
			pos.normalize();
			if(len < 0.6) {
				//apply force to player and player takes damage
				var force = new CANNON.Vec3(pos.x, 0.01, 0.0);
				force.normalize();
				force.scale(400.0, force);
				force.y = Math.min(force.y, 10.0);
				console.log(force);
				pc.body.applyForce(force, pc.body.position);
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


