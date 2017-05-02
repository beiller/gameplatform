
define(["CharacterStats", "entity/DynamicEntity", "lib/three", "BaseStateMachine"], 
function(CharacterStats, DynamicEntity, THREE, BaseStateMachine) {
	Character.prototype = new DynamicEntity();
	Character.prototype.constructor = Character;
	function Character(mesh, game, body, name, options, sssMesh, characterStats) {
		//defer the character to a root object3d
		var rootMesh = new THREE.Object3D();
		this.armature = mesh;
		rootMesh.add(mesh);

		mesh.position.y -= mesh.geometry.boundingSphere.radius;
		
		//call parent
	    DynamicEntity.prototype.constructor.call(this, rootMesh, game, body);
	    this.mesh = rootMesh;
	
	    this.sssMesh = sssMesh;
	    this.controllers = [];
	    this.name = name;
	    if(!options || options === undefined) options = {};
	
	    this.movementDirection = new THREE.Vector3(0,0,0);
	
	    this.stunned = false;
	    this.blocking = false;

	    this.onGround = false;
	
	    this.attackAnimation = "DE_Combatpunch";
	    //this.attackAnimation = "DE_Combatattack";
	
	    this.animations = {};
	    this.animationMixer = new THREE.AnimationMixer(this.armature);
	    for ( var i in this.armature.geometry.animations ) {
	        //this.animations[this.armature.geometry.animations[ i ].name]  = this.armature.geometry.animations[ i ];
	        this.animations[this.armature.geometry.animations[ i ].name] = this.animationMixer.clipAction(this.armature.geometry.animations[ i ]);
	    }
	    //this.animationMixer.addAction( new THREE.AnimationAction( this.armature.geometry.animations[0] ) );
	    this.playingAnimation = false;
	    this.currentAnimation = null;
	
	    this.characterStats = new CharacterStats();
	    this.baseStats = new CharacterStats();
	    this.createHealthBar();
	
	    this.clothingMesh = null;
	    this.equipment = {};
	    this.inventory = [];
	    this.meshes = {};
	    
	    this.stateMachine = new BaseStateMachine(this, game);

	    /*this.skeletonHelper = new THREE.SkeletonHelper(this.armature);
	    this.game.scene.add(this.skeletonHelper);*/
	}
	Character.prototype.createHealthBar = function() {
	    var sprite = new THREE.Sprite();
	    var healthRatio = this.characterStats.health / this.characterStats.maxHealth;
	    sprite.scale.set( healthRatio, 0.05, 0.25);
	    sprite.position.set(0, 2, 0);
	    sprite.material.color = new THREE.Color( 0x00FF00 );
	    this.armature.add(sprite);
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
	        var a = this.animations[animationName];
	        a.loop = options.loop || THREE.LoopRepeat;
	        a.timeScale = options.timeScale || 1.0;
	        if(options.crossFade && this.animationMixer !== undefined && false) {
	            a.weight = 0.0;
	            var crossFadeFrom = this.animationMixer.actions[this.animationMixer.actions.length - 1];
	            //this.animationMixer = new THREE.AnimationMixer(this.armature);
	            this.animationMixer.removeAllActions();
	            this.animationMixer.addAction( a );
	            this.animationMixer.addAction( crossFadeFrom );
	            this.animationMixer.crossFade( crossFadeFrom, a, options.crossFadeDuration || 1.00, options.crossFadeWarp || false );
	        } else {
	            //this.animationMixer = new THREE.AnimationMixer(this.armature);
	            this.animationMixer.stopAllAction();
	            this.animations[animationName].play();
	        }
	    }
	};
	Character.prototype.addController = function(controller) {
	    this.controllers.push(controller);
	};
	Character.prototype.pointCharacter = function() {
	    var quaternion = new THREE.Quaternion();
	    if(this.movementDirection.x > 0.01) {
	        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
	        quaternion.slerp(this.armature.quaternion, 0.75);
	        this.armature.quaternion.copy(quaternion);
	    } else if(this.movementDirection.x < -0.01) {
	        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
	        quaternion.slerp(this.armature.quaternion, 0.75);
	        this.armature.quaternion.copy(quaternion);
	    }
	};
	Character.prototype.update = function(delta) {
		DynamicEntity.prototype.update.call(this, delta);

		this.stateMachine.update(delta);
		
	    //this.body.position.z = 0.0; //2d game here

	    this.pointCharacter();
	    //update physics components and copy to mesh position
	    if(this.body) {
	        this.controllers.forEach(function(controller) {
	            controller.update(delta);
	        });
	    }
	    //do update skeletal Animation
	    if(this.animationMixer) {
	        //this.animationMixer.update(delta);
	    }

	};
	Character.prototype.unequip = function(slot) {
		if(slot == "weapon") {
			this.attackAnimation = "DE_Combatpunch";
		}
		if(this.equipment[slot]) {
			this.addItem(this.equipment[slot]);
			this.armature.remove(this.meshes[slot]);
			this.meshes[slot] = null;
			//delete this.meshes[slot];
			this.equipment[slot] = null;
			delete this.equipment[slot];
		}
		this.updateCharacterStats();
	};
	Character.prototype.addItem = function(item) {
		this.inventory.push(item);
	};
	Character.prototype.removeItem = function(item) {
		var newInventory = [];
		var found = false;
		this.inventory.forEach(function(inventoryItem) {
			if(inventoryItem == item && !found) {
				found = true;
			} else {
				newInventory.push(inventoryItem);
			}
		});
		this.inventory = newInventory;
	};
	Character.prototype.updateCharacterStats = function() {
		var newStats = new CharacterStats(this.baseStats);
		var scope = this;
		Object.keys(this.equipment).forEach(function(slot) {
			var item = scope.equipment[slot];
			if(item.stats && item.stats.health) {
				newStats.maxHealth += item.stats.health;
				newStats.health += item.stats.health;
			}
			if(item.stats && item.stats.attackCooldown) {
				newStats.attackCooldown += item.stats.attackCooldown;
			}
		});
		this.characterStats.init(newStats);
	};
	Character.prototype.equip = function(item) {
		var game = this.controllers[0].game;
		if(item.slot == "weapon") {
		    this.attackAnimation = "DE_Combatattack";
		}
		if(this.equipment[item.slot]) {
			this.unequip(item.slot);
		}
	    this.equipment[item.slot] = item;
		this.updateCharacterStats();
	
		var game = this.controllers[0].game;
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
	        	try {
	        		addToBone(item, dynamic);
	        	} catch(e) {
	        		console.log('Could not attach item to bone: '+item.bone, item, e);
	        	}
	        	scope.meshes[item.slot] = dynamic.mesh;
	        });
		} else { //this item is not attached to bones but deformed by skeleton
	        game.loadClothing(item.model, this.armature, item.options, function(mesh) {
	        	mesh.bind(scope.armature.skeleton, new THREE.Matrix4());
				scope.armature.add(mesh);
				scope.meshes[item.slot] = mesh;
				//TODO optimize by update character clothing mesh (merge meshes?)
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
	    		if(stats && stats.magic_defence) {
			    	effects.forEach(function(effect) {
			    		if(stats.magic_defence[effect]) {
			    			magicDefences[effect] = stats.magic_defence[effect];
			    		}
			    	});
		    	}
		    	if(stats && stats.defence) {
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
	    var wstats = attackingCharacter.equipment.weapon ? attackingCharacter.equipment.weapon.stats : { damage: this.characterStats.strength };
	    var damage = this.calculateEffect(attackingCharacter.characterStats, wstats);
	    if(this.blocking || this.stateMachine.current == 'BLOCK') {
	        console.log(this.name + " blocked an attack!");
	        this.controllers[0].game.displayText(new THREE.Vector3(this.armature.position.x-0.2, this.armature.position.y, 1.0), "Blocked", 3000);
	        damage = Math.round(damage * 0.1);
	    }
		console.log(this.name + ' takes ' + damage + ' damage.');
	    this.controllers[0].game.displayText(new THREE.Vector3(this.armature.position.x, this.armature.position.y, 1.0), damage, 3000);
	    this.characterStats.health = this.characterStats.health - damage;
	    if (this.characterStats.health <= 0) {
	        console.log(this.name + " has died.");
	        this.dead = true;
	        this.stateMachine.dead();
	    }
	    if (this.healthBarMesh) {
	        var healthRatio = Math.max(0.0, this.characterStats.health / this.characterStats.maxHealth);
	        this.healthBarMesh.scale.x = healthRatio;
	    }
	    //determine chance to stun me
	    var rand = Math.random();
	    if(rand <= this.characterStats.stunWhileBlockingChance) {
	        console.log(this.name + " was stunned!");
	        this.stateMachine.stun();
	        var scope = this;
	        setTimeout(function() {
	            scope.controllers[0].game.displayText(new THREE.Vector3(scope.mesh.position.x, scope.mesh.position.y, 1.0), "Stunned", 3000);
	        }, 100);
	    }
	};
	Character.prototype.findBone = function(bone_name) {
	    for(var bone in this.armature.skeleton.bones) {
	        if(this.armature.skeleton.bones[bone].name === bone_name) {
	            return this.armature.skeleton.bones[bone];
	        }
	    }
	    return null;
	};
	Character.prototype.remove = function() {
		var scope = this;
		Object.keys(this.equipment).forEach(function(slot) {
			if(scope.equipment[slot]) {
				scope.mesh.remove(scope.meshes[slot]);
				scope.meshes[slot] = null;
				delete scope.meshes[slot];
				scope.equipment[slot] = null;
				delete scope.equipment[slot];
			}
		});
	};
	return Character;
});
