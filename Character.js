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
}
PhysBone.prototype.update = function() {
    //update physics components and copy to mesh position
    var vector = new THREE.Vector3().setFromMatrixPosition(this.mesh.matrixWorld);

    var position = new THREE.Vector3().copy(vector).sub(this.body.position);
    var dist = position.length();
    position.normalize();
    position.multiplyScalar(150 * dist);
    var force = new CANNON.Vec3().copy(position);
    this.body.applyLocalForce(force, new CANNON.Vec3(0,0,0));

    var p = new THREE.Vector3().copy(vector).sub(this.body.position);

    //best attempt to copy to bone positioning
    this.mesh.quaternion.x = p.y * 0.75;
    this.mesh.quaternion.y = p.x * 0.35;

};


Character.prototype = new Dynamic();
Character.prototype.constructor = Character;
function Character(name, mesh, body, options, sssMesh, characterStats) {
    Dynamic.prototype.constructor.call(this, mesh, body);

    this.sssMesh = sssMesh;
    this.controllers = [];
    this.name = name;
    if(!options || options === undefined) options = {};

    this.movementDirection = new CANNON.Vec3(0,0,0);

    this.stunned = false;
    this.blocking = false;

    //this.attackAnimation = "DE_Combatpunch";
    this.attackAnimation = "DE_Combatattack";


    this.animations = {};
    this.animationMixer = new THREE.AnimationMixer(this.mesh);
    for ( var i in this.mesh.geometry.animations ) {
        this.animations[this.mesh.geometry.animations[ i ].name]  = this.mesh.geometry.animations[ i ];
    }
    this.animationMixer.addAction( new THREE.AnimationAction( this.mesh.geometry.animations[0] ) );
    this.playingAnimation = false;
    this.currentAnimation = null;

    this.characterStats = new CharacterStats();
    this.createHealthBar();

    this.clothingMesh = null;
    this.equipment = {};
}
Character.prototype.updateClothingGeometry = function(mesh) {
    //this.clothingMeshes.push(mesh);
    //this.mesh.add(mesh);
    try {
        if(this.clothingMesh === null) {
            this.clothingMesh = new THREE.SkinnedMesh( mesh.geometry, mesh.material );
            this.clothingMesh.frustumCulled = false;
            this.clothingMesh.skeleton = this.mesh.skeleton;
            if(!(this.clothingMesh.material instanceof THREE.MultiMaterial)) {
                this.clothingMesh.material = new THREE.MultiMaterial( [this.clothingMesh.material] );
            }
        } else {
            //get offset
            var materialOffset = this.clothingMesh.material.materials.length;
            //merge materials
            if(mesh.material instanceof THREE.MultiMaterial) {
                for (var i = 0; i < mesh.material.materials.length; i++) {
                    this.clothingMesh.material.materials.push(mesh.material.materials[i]);
                }
            } else {
                this.clothingMesh.material.materials.push(mesh.material);
            }
            this.clothingMesh.geometry.merge(mesh.geometry, undefined, materialOffset);
            /*
                Copy skin weights man!
            */
            var geom = mesh.geometry;
            for ( var i = 0, il = geom.skinIndices.length; i < il; i ++ ) {
                var skin = geom.skinIndices[ i ];
                var skinCopy = skin.clone();
                this.clothingMesh.geometry.skinIndices.push( skinCopy );
                var weight = geom.skinWeights[ i ];
                var weightCopy = weight.clone();
                this.clothingMesh.geometry.skinWeights.push( weightCopy );
            }
        }
    } catch(e) {

    }
};
Character.prototype.createHealthBar = function() {
    var sprite = new THREE.Sprite();
    var healthRatio = this.characterStats.health / this.characterStats.maxHealth;
    sprite.scale.set( healthRatio, 0.05, 0.25);
    sprite.position.set(0, 2, 0);
    sprite.material.color = new THREE.Color( 0x00FF00 );
    this.mesh.add(sprite);
    this.healthBarMesh = sprite;
};
Character.prototype.setAnimation = function(animationName, options) {
    if(this.currentAnimation != animationName) {
        this.playAnimation(animationName, options);
        this.currentAnimation = animationName;
    }
};
Character.prototype.playAnimation = function(animationName, options) {
    if(options === undefined) {
        options = {};
    }
    if(this.animations[animationName] !== undefined) {
        var a = new THREE.AnimationAction( this.animations[animationName] );
        a.loop = options.loop || THREE.LoopRepeat;
        a.timeScale = options.timeScale || 1.0;
        if(options.crossFade && this.animationMixer !== undefined) {
            a.weight = 0.0;
            var crossFadeFrom = this.animationMixer.actions[this.animationMixer.actions.length - 1];
            //this.animationMixer = new THREE.AnimationMixer(this.mesh);
            this.animationMixer.removeAllActions();
            this.animationMixer.addAction( a );
            this.animationMixer.addAction( crossFadeFrom );
            this.animationMixer.crossFade( crossFadeFrom, a, options.crossFadeDuration || 1.00, options.crossFadeWarp || false );
        } else {
            //this.animationMixer = new THREE.AnimationMixer(this.mesh);
            this.animationMixer.removeAllActions();
            this.animationMixer.play( a );
        }
    }
};
Character.prototype.addController = function(controller) {
    this.controllers.push(controller);
};
Character.prototype.update = function(delta) {
    this.body.position.z = 0.0; //2d game here
    //do update skeletal Animation
    if(this.animationMixer && this.animationMixer.actions.length > 0) {
        this.animationMixer.update(delta);
    }
    //update physics components and copy to mesh position
    if(this.body) {
        this.mesh.position.copy(this.body.position).y -= this.mesh.geometry.boundingSphere.radius;
        this.mesh.frustumCulled = false;
        if(this.sssMesh) {
            this.sssMesh.position.copy(this.body.position);
            //this.mesh.frustumCulled = false;
        }
        //this.mesh.quaternion.copy(this.body.quaternion);
        //update controller?
        this.controllers.forEach(function(controller) {
            controller.update(delta);
        });
    }
};
Character.prototype.equip = function(item) {
	//TODO UNEQUIP??
	var game = this.controllers[0].game;
    this.equipment[item.slot] = item;
    var scope = this;
	if(item.mesh) {
		//already loaded
	} else {
		//load the mesh
		if(item.bone) { //this item is static and attaches to bones
	        game.loadDynamicObject(item.model, item.options, function(dynamic) {
	        	item.mesh = dynamic.mesh;
	        	game.scene.remove(dynamic.mesh);
		       	var bone = scope.findBone(item.bone);
			    bone.add(dynamic.mesh);
			    dynamic.mesh.position = new THREE.Vector3(0,0,0);
			    dynamic.mesh.rotation = new THREE.Quaternion();
			    dynamic.sleep = true;
	        });
		} else { //this item is not attached to bones but deformed by skeleton
	        game.loadClothing(item.model, this.mesh, item.options, function(mesh) {
				item.mesh = mesh;
				scope.mesh.add(mesh);
				//TODO update character clothing mesh
				//....
	        });
		}
	}
};
Character.prototype.calculateEffect = function(characterStats, weaponStats) {
    var magicDamage = 0;
    magicDamage += characterStats.magic;
    if(weaponStats && weaponStats.magic_damage) {
        magicDamage += weaponStats.magic_damage.fire || 0;
        magicDamage += weaponStats.magic_damage.water || 0;
        magicDamage += weaponStats.magic_damage.earth || 0;
        magicDamage += weaponStats.magic_damage.air || 0;
        magicDamage += weaponStats.magic_damage.dark || 0;
        magicDamage += weaponStats.magic_damage.holy || 0;
    }
    magicDamage -= this.characterStats.magicResistance;

    var physicalDamage = 0;
    physicalDamage += characterStats.strength;
    physicalDamage += weaponStats.damage || 0;
    physicalDamage -= this.characterStats.endurance;

    return physicalDamage + magicDamage;
};
Character.prototype.hit = function(attackingCharacter) {
    if(this.dead) {
        return;
    }
    if(!this.blocking) {
        //var damage = enemyStats.damage + Math.ceil(Math.random() * 2.0);
        var damage = this.calculateEffect(attackingCharacter.characterStats, attackingCharacter.equipment.weapon.stats);
        console.log(this.name + ' takes ' + damage + ' damage.');
        this.controllers[0].game.displayText(new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 9, 1.0), damage, 3000);
        this.characterStats.health = this.characterStats.health - damage;
        if (this.characterStats.health <= 0) {
            console.log(this.name + " has died.");
            this.dead = true;
            this.controllers[0].fsm.dead();
        }
        if (this.healthBarMesh) {
            var healthRatio = Math.max(0.0, this.characterStats.health / this.characterStats.maxHealth);
            this.healthBarMesh.scale.x = healthRatio;
        }
    } else {
        console.log(this.name + " blocked an attack!");
        this.controllers[0].game.displayText(new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 9, 1.0), "Blocked", 3000);
        //determine chance to stun me
        var rand = Math.random();
        if(rand <= this.characterStats.stunWhileBlockingChance) {
            console.log(this.name + " was stunned!");
            this.controllers[0].fsm.stun();
            var scope = this;
            setTimeout(function() {
                scope.controllers[0].game.displayText(new THREE.Vector3(scope.mesh.position.x, scope.mesh.position.y + 9, 1.0), "Stunned", 3000);
            }, 100);
        }
    }
};
Character.prototype.findBone = function(bone_name) {
    for(var bone in this.mesh.skeleton.bones) {
        if(this.mesh.skeleton.bones[bone].name === bone_name) {
            return this.mesh.skeleton.bones[bone];
        }
    }
    return null;
};
