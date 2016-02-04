


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
    this.inventory = [];
    this.meshes = {};
}
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

    //update physics components and copy to mesh position
    if(this.body) {
        this.mesh.position.copy(this.body.position).y -= this.mesh.geometry.boundingSphere.radius;
        if(this.sssMesh) {
            this.sssMesh.position.copy(this.body.position);
        }
        //this.mesh.quaternion.copy(this.body.quaternion);
        //update controller?
        this.controllers.forEach(function(controller) {
            controller.update(delta);
        });
		if(this.body.debugMesh) {
			this.body.debugMesh.position.copy(this.body.position);
			this.body.debugMesh.quaternion.copy(this.body.quaternion);
		}
    }
    //do update skeletal Animation
    if(this.animationMixer && this.animationMixer.actions.length > 0) {
        this.animationMixer.update(delta);
    }
};
Character.prototype.equip = function(item) {
	var game = this.controllers[0].game;
	if(this.equipment[item.slot]) {
		this.inventory.push(this.equipment[item.slot]);
		game.scene.remove(this.meshes[item.slot]);
		this.meshes[item.slot] = null;
		this.equipment[item.slot] = null;
	}
	if(item.stats && item.stats.health) {
		this.characterStats.maxHealth += item.stats.health;
		this.characterStats.health += item.stats.health;
	}
	//TODO UNEQUIP??
	var game = this.controllers[0].game;
    this.equipment[item.slot] = item;
    var scope = this;
    function addToBone(item, dynamic) {
		game.scene.remove(dynamic.mesh);
		var bone = scope.findBone(item.bone);
		bone.add(dynamic.mesh);
		dynamic.mesh.position = new THREE.Vector3(0,0,0);
		dynamic.mesh.rotation = new THREE.Quaternion();
		dynamic.sleep = true;
    }
	//load the mesh
	if(item.bone) { //this item is static and attaches to bones
        game.loadDynamicObject(item.model, item.options, function(dynamic) {
        	addToBone(item, dynamic);
        	scope.meshes[item.slot] = dynamic.mesh;
        });
	} else { //this item is not attached to bones but deformed by skeleton
        game.loadClothing(item.model, this.mesh, item.options, function(mesh) {
			scope.mesh.add(mesh);
			scope.meshes[item.slot] = mesh;
			//TODO update character clothing mesh
			//....
        });
	}
};
Character.prototype.calculateEffect = function(characterStats, weaponStats) {
    var magicDamage = 0;
    armors = ['chest', 'arms', 'head', 'legs', 'pants', 'boots', 'gloves'];
    effects = ['fire', 'water', 'earth', 'air', 'dark', 'holy'];
    var damage = {};
    var magicDefences = {};
    var physicalDefences = 0;
    var character = this;
    armors.forEach(function(slot) {
    	if(character.equipment[slot]) {
    		var item = character.equipment[slot];
    		var stats = item.stats;
    		if(stats.magic_defence) {
		    	effects.forEach(function(effect) {
		    		if(stats.magic_defence[effect]) {
		    			magicDefences[effect] = stats.magic_defence[effect];
		    		}
		    	});
	    	}
	    	if(stats.defence) {
	    		physicalDefences += stats.defence;
	    	}
    	}
    });
    if(weaponStats && weaponStats.magic_damage) {
    	effects.forEach(function(effect) {
    		if(weaponStats.magic_damage[effect]) {
    			var defence = magicDefences[effect] !== undefined ? magicDefences[effect] : 0;
    			magicDamage += weaponStats.magic_damage[effect] - defence;
    		}
    	});
    }
    
    var physicalDamage = 0;
    physicalDamage += characterStats.strength;
    physicalDamage += weaponStats.damage || 0;
    physicalDamage -= this.characterStats.endurance;
    physicalDamage -= physicalDefences;
    physicalDamage = Math.max(0, physicalDamage);

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
        this.controllers[0].game.displayText(new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, 1.0), damage, 3000);
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
        this.controllers[0].game.displayText(new THREE.Vector3(this.mesh.position.x, this.mesh.position.y, 1.0), "Blocked", 3000);
        //determine chance to stun me
        var rand = Math.random();
        if(rand <= this.characterStats.stunWhileBlockingChance) {
            console.log(this.name + " was stunned!");
            this.controllers[0].fsm.stun();
            var scope = this;
            setTimeout(function() {
                scope.controllers[0].game.displayText(new THREE.Vector3(scope.mesh.position.x, scope.mesh.position.y, 1.0), "Stunned", 3000);
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
