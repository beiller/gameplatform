
define([
	"CharacterStats", "entity/DynamicEntity", "lib/three", "BaseStateMachine", "PhysRig"
	],

function(CharacterStats, DynamicEntity, THREE, BaseStateMachine, PhysRig) {
	var tmpVec1 = new THREE.Vector3();
	var tmpVec2 = new THREE.Vector3();
	var tmpVec3 = new THREE.Vector3();
	
	function Character(mesh, game, body, name, options, sssMesh, characterStats) {
		//defer the character to a root object3d
		var rootMesh = new THREE.Object3D();
		this.armature = mesh;
		rootMesh.add(mesh);
		//move the mesh to the bottom of our surrounding sphere (not center)
		mesh.position.y -= mesh.geometry.boundingSphere.radius;
		
	    DynamicEntity.call(this, mesh, game, body);
	    this.mesh = rootMesh;
	
	    //this.sssMesh = sssMesh;
	    this.controller = null;
	    this.name = name;
	    if(!options || options === undefined) options = {};
	
	    this.movementDirection = new THREE.Vector3(0,0,0);

	    this.onGround = false;
	
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
	    this.physicMap = { "ROOT": this };
	    
	    this.stateMachine = new BaseStateMachine(this, game);

		this.physRig = new PhysRig(this, game);

		this.dynamics = [];
		this.physicMap = {};

	    /*this.skeletonHelper = new THREE.SkeletonHelper(this.armature);
	    this.game.scene.add(this.skeletonHelper);*/
	}
	Character.prototype = Object.assign( Object.create( DynamicEntity.prototype ), {
		constructor: Character
	});

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
	Character.prototype.playPose = function(poseIndex) {
		/*
			Support a animation named "PoseLib" which each frame is a pose.
		*/
	    if(this.animations["PoseLib"] !== undefined) {
	        var a = this.animations["PoseLib"];
	        var duration = a.getClip().duration;
	        var fps = 24;
	        var interval = duration / fps;
	        var poseIndexAdjusted = poseIndex % (duration * fps);
	        a.timeScale = 0.0;
	        a.time = interval * poseIndexAdjusted;
	        this.animationMixer.stopAllAction();
	        console.log("Playing animation at time offset", interval * poseIndexAdjusted);
            a.play();
	    }
	};
	Character.prototype.playAnimation = function(animationName, options) {
	    if(options === undefined) {
	        options = {};
	    }
	    if(this.animations[animationName] !== undefined) {
	        var a = this.animations[animationName];
	        a.loop = options.loop || THREE.LoopRepeat;
	        a.clampWhenFinished = options.clampWhenFinished || false;
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
	    this.controller = controller;
	};
	var quaternion = new THREE.Quaternion();
	Character.prototype.pointCharacter = function() {
	    if(this.movementDirection.x > 0.01) {
	        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
	        quaternion.slerp(this.armature.quaternion, 0.90);
	        this.armature.quaternion.copy(quaternion);
	    } else if(this.movementDirection.x < -0.01) {
	        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / -2);
	        quaternion.slerp(this.armature.quaternion, 0.90);
	        this.armature.quaternion.copy(quaternion);
	    }
	};

	Character.prototype.updateKineticBones = function(delta) {
	    //copy bones' locations to physics simulation if they are kinematic
		for(var i in this.physRig.dynamics) {
			if(this.physRig.dynamics[i].body.getKinematic()) {
				this.physRig.dynamics[i].update(delta);
			}
		}
	};
	Character.prototype.updateDynamicBones = function(delta) {
	    //if the bones' are dynamic, copy their updated positions to the armature
		for(var i in this.physRig.dynamics) {
			if(!this.physRig.dynamics[i].body.getKinematic()) {
				this.physRig.dynamics[i].update(delta);
			}
		}
	};
	Character.prototype.update = function(delta) {
		var c = this.stateMachine.current;

		//I believe this will update the physics. 
		// copies the bounding sphere's position to this mesh's (character)
		DynamicEntity.prototype.update.call(this);

		//tick the character's state machine
		this.stateMachine.update(delta);

	    //do update skeletal Animation if we are less than n units away from camera
	    var l = Math.abs(this.mesh.position.x - this.game.camera.mesh.position.x);
	    if(l < 8.0) {
		    if(this.animationMixer) {
		        this.animationMixer.update(delta);
		    }
		}

		//point character and update physics
	    
	    if(c != 'playinganimation') {
	    	if(c != 'dead' && c != 'blocking' && c != 'stunned') {
	    		this.pointCharacter();
	    	}
		    //tick the AI or user controlled events...
		    if(this.body) {
		    	this.controller.update(delta);
		    }
	    }

	    //send the bones' position to physics simulation
	    this.updateKineticBones();
	};
	Character.prototype.unequip = function(slot) {
		if(this.equipment[slot]) {
			this.addItem(this.equipment[slot]);
			if(this.equipment[slot].physBone) {
				//this.equipment[slot].bone.remove(this.meshes[slot]);
				
				this.physRig.deletePhysic(this.equipment[slot].physBone);
			} else {
				this.armature.remove(this.meshes[slot]);
			}
			this.meshes[slot] = null;
			delete this.meshes[slot];

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

	var newStats = new CharacterStats();
	THREE.BufferGeometry.prototype.merge = function ( geometry, materialOffset ) {

	    if ( geometry instanceof THREE.BufferGeometry === false ) {

	        console.error( 'THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.', geometry );
	        return;

	    }

	    var attributes = this.attributes;

	    if( this.index ){

	        var indices = geometry.index.array;

	        var offset = attributes[ 'position' ].count;

	        for( var i = 0, il = indices.length; i < il; i++ ) {

	            indices[i] = offset + indices[i];

	        }

	        this.index.array = Uint32ArrayConcat( this.index.array, indices );

	    }

	    var oldLen = attributes.position.count; // use vertex count

	    for ( var key in attributes ) {

	        if ( geometry.attributes[ key ] === undefined ) continue;

	        attributes[ key ].array = Float32ArrayConcat( attributes[ key ].array, geometry.attributes[ key ].array );
	        attributes[ key ].count = attributes[ key ].array.length / attributes[ key ].itemSize;

	    }

	    for(var i = 0; i < geometry.groups.length; i++) {
	    	var oldGroup = geometry.groups[i];
	    	var newGroup = {
	    		start: oldLen + oldGroup.start,
	    		count: oldGroup.count,
	    		materialIndex: oldGroup.materialIndex + materialOffset
	    	};
	    	this.groups.push(newGroup);
	    }

	    return this;

	    /***
	     * @param {Float32Array} first
	     * @param {Float32Array} second
	     * @returns {Float32Array}
	     * @constructor
	     */
	    function Float32ArrayConcat(first, second)
	    {
	        var firstLength = first.length,
	            result = new Float32Array(firstLength + second.length);

	        result.set(first);
	        result.set(second, firstLength);

	        return result;
	    }

	    /**
	     * @param {Uint32Array} first
	     * @param {Uint32Array} second
	     * @returns {Uint32Array}
	     * @constructor
	     */
	    function Uint32ArrayConcat(first, second)
	    {
	        var firstLength = first.length,
	            result = new Uint32Array(firstLength + second.length);

	        result.set(first);
	        result.set(second, firstLength);

	        return result;
	    }

	};


	Character.prototype.updateCharacterStats = function() {
		newStats.init(this.baseStats);
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
		if(this.equipment[item.slot]) {
			this.unequip(item.slot);
		}

		var game = this.game;
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
		if(item.physics) {  // this item has some complex fucking physics
	        this.game.loadPhysItem(item.model, this, item.options, function(mesh) {
				function createFromPhysic(e) {
					try {
						//copy e!!! Assigning e.bone breaks shit.
						var e = Object.assign({}, e); 
						if(e.bone) e.bone = scope.findBone(e.bone, mesh.skeleton); 
						//if there is some offset, move the main bone to that offset before attaching
						//or if there is a move-to bone
						if(e.options && e.options.moveTo) {

							var moveTo = scope.findBone(e.options.moveTo);
							moveTo.add(mesh);
							moveTo.updateMatrixWorld(true);
							mesh.updateMatrixWorld(true);
							e.bone.position.set(0,0,0);
							e.bone.quaternion.set(0,0,0,1);
							//var q = new THREE.Quaternion();
							//var s = new THREE.Vector3();
							//moveTo.matrixWorld.decompose(e.bone.position, e.bone.quaternion, e.bone.scale);
							e.bone.updateMatrixWorld(true);

							//TODO this is a hack for some reason I have to set the parent. This relationship could
							//incorrectly span multiple armatures, but that does not seem to be a problem yet...
							//if(!e.bone.parent) {
								e.bone.parent = moveTo;
							//}
							

						}
						if(e.options && e.options.tailBone) e.options.tailBone = scope.findBone(e.options.tailBone, mesh.skeleton);
						item.physBone = scope.physRig.createPhysic(e, mesh);
					} catch(e) {
						console.log("Exception loading bone", e);
						//throw e;
					}
				}
				function createChainRecurse(c) {
					var boneName = c.bone
					var connectBodyName = c.connect_body
					var dof = c.dof;
					var e = {}
					var bone = scope.findBone(boneName, mesh.skeleton);
					var child = bone.children[0];

					e.bone = bone.name;
					e.type = "DYNAMIC";
					e.connect_body = connectBodyName;
					e.options = {
						"rotationLimitsLow":  [-dof,-dof,-dof],
						"rotationLimitsHigh": [ dof, dof, dof],
						"mass" : c.mass || 1.0
					};
					if(child) {
						e.options.tailBone = child.name;
					} else {
						e.options.localOffset = [0,0,0.035];
					}
					createFromPhysic(e);
					if(child) {
						createChainRecurse({bone: child.name, connect_body: boneName, dof: dof});
					}
				}

				scope.meshes[item.slot] = mesh;

				if(item.physics) {
					item.physics.forEach(createFromPhysic);
				}
				if(item.physicsChain) {
					item.physicsChain.forEach(createChainRecurse)
				}
	        });
		} else if(item.bone) { //this item is static and attaches to bones
	        game.loadDynamicObject(item.model, item.options, function(dynamic) {
	        	try {
	        		addToBone(item, dynamic);
	        	} catch(e) {
	        		console.log('Could not attach item to bone: '+item.bone, item, e);
	        	}
	        	scope.meshes[item.slot] = dynamic.mesh;

	        	//This aligns with hands (approx) for sword?
	        	dynamic.mesh.rotateX(1.57075);
	        	dynamic.mesh.rotateZ(1.57075);
	        	// FOR miku
	        	//dynamic.mesh.position.set(-0.02, -0.2, -0.04);
	        	// FOR newmeshes
	        	dynamic.mesh.position.set(-0.02, -0.15, -0.1);
	        });
		} else { //this item is not attached to bones but deformed by base skeleton
	        game.loadClothing(item.model, this.armature, item.options, function(mesh) {
	        	//merge all meshes and update mesh DB
	        	var singleGeometry = new THREE.BufferGeometry().copy(mesh.geometry);
	        	var materials = new Array();
	        	materials = materials.concat(mesh.material);

	        	for(var key in scope.meshes) {
	        		if(!(scope.equipment[key].bone || scope.equipment[key].physics)) {
		        		singleGeometry.merge(
		        			scope.meshes[key].geometry,
		        			materials.length
		        		);
		        		materials = materials.concat(scope.meshes[key].material);
	        		}
	        	}

	        	scope.meshes[item.slot] = mesh;
	        	scope.armature.remove(scope.clothingMesh);
	        	scope.clothingMesh = new THREE.SkinnedMesh(singleGeometry, materials);
	        	scope.clothingMesh.bind(scope.armature.skeleton, new THREE.Matrix4());
	        	scope.armature.add(scope.clothingMesh);
	        });
		}

		this.equipment[item.slot] = item;
		this.updateCharacterStats();
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
	    if(this.stateMachine.current == 'blocking') {
	        console.log(this.name + " blocked an attack!");
	        this.game.displayText(tmpVec1.set(this.mesh.position.x, this.mesh.position.y, 1.0), "Blocked", 3000);
	        damage = Math.round(damage * 0.1);
	    }
		console.log(this.name + ' takes ' + damage + ' damage.');
	    this.game.displayText(tmpVec1.set(this.mesh.position.x, this.mesh.position.y, 1.0), damage, 3000);
	    this.characterStats.health = this.characterStats.health - damage;
	    if (this.characterStats.health <= 0) {
	        console.log(this.name + " has died.");
	        this.dead = true;
	        this.stateMachine.die();
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
	            scope.game.displayText(tmpVec1.set(scope.mesh.position.x, scope.mesh.position.y, 1.0), "Stunned", 3000);
	        }, 100);
	    }
	};
	Character.prototype.findBone = function(bone_name, skeleton) {
		if(!skeleton) skeleton = this.armature.skeleton;
	    for(var bone in skeleton.bones) {
	        if(skeleton.bones[bone].name === bone_name) {
	            return skeleton.bones[bone];
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
