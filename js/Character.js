
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
	
		/*
			DEBUG TEST - filter out all bones except something....
		*/
		let names = [];
		try {
			function recurseFindChildBones(bone) {
				for(let i in bone.children) {
					if('name' in bone.children[i]) {
						names.push(bone.children[i].name);
						recurseFindChildBones(bone.children[i]);
					}
				}
			}
			recurseFindChildBones(this.findBone('NPC Head [Head]'));

			for(var i in this.armature.geometry.animations) {

				var animation = this.armature.geometry.animations[i];
				if(animation.name.indexOf('face_') == 0) {
					animation.tracks = animation.tracks.filter(track => names.includes(track.name.split('.bones[')[1].split('].')[0]));
				} else {
					animation.tracks = animation.tracks.filter(track => !names.includes(track.name.split('.bones[')[1].split('].')[0]));
				}
				if(animation.name != 'body_skinny' && animation.name != 'body_fat' && animation.name != 'body_normal') {
					//animation.tracks = animation.tracks.filter(track => track.name.indexOf("DEF-") > -1 || track.name.indexOf("MCH-") > -1 || track.name.indexOf("-") < 0);
					animation.tracks = animation.tracks.filter(track => track.name.indexOf(".scale") == -1);
				} else {
					animation.tracks = animation.tracks.filter(track => track.name.indexOf(".scale") > -1);
				}
			}
		} catch(e) {
			console.log('No head bone', e);
		}	

	    this.animations = {};
	    this.animationMixer = new THREE.AnimationMixer(this.armature);
	    for ( var i in this.armature.geometry.animations ) {
	        //this.animations[this.armature.geometry.animations[ i ].name]  = this.armature.geometry.animations[ i ];
	        this.animations[this.armature.geometry.animations[ i ].name] = this.animationMixer.clipAction(this.armature.geometry.animations[ i ]);
	    }
	    //this.animationMixer.addAction( new THREE.AnimationAction( this.armature.geometry.animations[0] ) );
	    this.playingAnimation = false;
	    this.currentAnimation = null;
	    this.currentFacialAnimation = null;
	
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
	Character.prototype.setWeight = function(weight) {
		/*
			Set the character's weight (skinny/fat)
		*/
	    var skinny = this.animations["body_skinny"];
	    var fat = this.animations["body_fat"];
	    skinny.stop();
	    fat.stop();
	    skinny.weight = (1.0 - weight);
	    fat.weight = weight;
	    fat.play();
	    skinny.play();
	};
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
		let animationType = animationName.split('_')[0];
		if(animationType == 'face') {
			if(this.currentFacialAnimation != animationName) {
	        	if(this.currentFacialAnimation && this.animations[this.currentFacialAnimation]) {
	        		this.animations[this.currentFacialAnimation].stop();
	        	}
	        	this.animations[animationName].play();
	        	this.currentFacialAnimation = animationName;
	    	}
		} else {
			if(this.currentAnimation != animationName) {
	        	//this.playAnimation(animationName, options);
	        	if(this.currentAnimation && this.animations[this.currentAnimation]) {
	        		this.animations[this.currentAnimation].stop();
	        	}
	        	//this.animations[animationName].play();
	        	this.playAnimation(animationName, options);
	        	this.currentAnimation = animationName;
	    	}
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
	            //this.animationMixer.stopAllAction();
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
			this.updateCharacterStats();
			this.addItem(this.equipment[slot]);
			if(this.equipment[slot].physics || this.equipment[slot].physicsChain) {
				this.physRig.deletePhysItem(this.meshes[slot]);
			}
			this.armature.remove(this.meshes[slot]);
			this.meshes[slot] = null;
			delete this.meshes[slot];

			this.equipment[slot] = null;
			delete this.equipment[slot];
			if(slot == 'weapon') {
				this.stateMachine.animationMap['walk'] = 'XP32_NormalRun';
				this.stateMachine.animationMap['idle'] = 'XP32_NormalIddle';
			}

			this.refreshMesh();
		}
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

	var newStats = new CharacterStats();
	Character.prototype.updateCharacterStats = function() {
		newStats.init(this.baseStats);
		newStats.health = this.characterStats.health;
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
	Character.prototype.equip = async function(item) {
		if(this.equipment[item.slot]) {
			this.unequip(item.slot);
		}

		this.equipment[item.slot] = item;
		this.updateCharacterStats();

		if(item.slot == 'weapon') {
			this.stateMachine.animationMap['walk'] = 'XP32_CombatRun';
			this.stateMachine.animationMap['idle'] = 'XP32_Combatiddle';
		}

		var game = this.game;
	    var scope = this;
	    function addToBone(item, dynamic) {
	    	/*
				Function is used to add a mesh directly as bone
				parent EG.
	    	*/
	    	//TODO this is a terrible fucking hack...
			game.scene.remove(dynamic.mesh);
			var bone = scope.findBone(item.bone);
			bone.add(dynamic.mesh);
			dynamic.mesh.position = new THREE.Vector3(0,0,0);
			dynamic.mesh.rotation = new THREE.Quaternion();
			dynamic.sleep = true;
	    }
		
		if(item.physics) {  // this item has some complex fucking physics
			//load the mesh
			var mesh = await this.game.loadItem(item.model, this, item.options);
			//the mesh is global to the below functions, as well as "scope"
			var createFromPhysic = function(e) {
				try {
					//copy e!!! Assigning e.bone breaks shit.
					var e = Object.assign({}, e); 
					if(e.bone) e.bone = scope.findBone(e.bone, mesh.skeleton); 
					//if there is some offset, move the main bone to that offset before attaching
					//or if there is a move-to bone
					if(e.options && e.options.moveTo) {

						var moveTo = scope.findBone(e.options.moveTo);
						//moveTo.add(mesh);
						moveTo.updateMatrixWorld(true);
						mesh.matrixWorld.copy(moveTo.matrixWorld);
						//mesh.updateMatrixWorld(true);
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
					scope.physRig.createPhysic(e, mesh);
				} catch(ex) {
					console.log("Exception loading bone", e, ex);
					//throw e;
				}
			};
			var createChainRecurse = function(c) {
				var boneName = c.bone
				var connectBodyName = c.connect_body
				var dof = c.dof;
				var mass = c.mass || 1.0;
				var e = {}
				var bone = scope.findBone(boneName, mesh.skeleton);
				var child = bone.children[0];

				e.bone = bone.name;
				e.type = "DYNAMIC";
				e.connect_body = connectBodyName;
				e.options = {
					"rotationLimitsLow":  [-dof,-dof,-dof],
					"rotationLimitsHigh": [ dof, dof, dof],
					"mass" : mass,
					"damping": c.damping
				};
				if(child) {
					e.options.tailBone = child.name;
				} else {
					e.options.localOffset = [0,0,0.035];
				}
				createFromPhysic(e);
				if(child) {
					createChainRecurse({bone: child.name, connect_body: boneName, dof: dof, mass: mass, damping: c.damping});
				}
			};

			this.meshes[item.slot] = mesh;

			if(item.physics) {
				item.physics.forEach(createFromPhysic);
			}
			if(item.physicsChain) {
				item.physicsChain.forEach(createChainRecurse)
			}
			this.armature.add(mesh);
			//HACK set inverse scale of root of armature cause UUNP is scaled way down
			let scale = this.armature.skeleton.bones[0].scale.x;
			mesh.skeleton.bones[0].scale.set(1/scale, 1/scale, 1/scale);
		} else if(item.bone) { //this item is static and attaches to bones
	        var dynamic = await game.loadDynamicObject(item.model, item.options);
        	try {
        		//TODO this is a hack
        		addToBone(item, dynamic);
        	} catch(e) {
        		console.log('Could not attach item to bone: '+item.bone, item, e);
        	}
        	this.meshes[item.slot] = dynamic.mesh;

        	//This aligns with hands (approx) for sword?
        	//dynamic.mesh.quaternion.set(0.764, -0.1, -0.527, 0.561);
        	dynamic.mesh.rotation.set(1.5,-1,3);
        	//HACK set inverse scale of root of armature cause UUNP is scaled way down
			let scale = this.armature.skeleton.bones[0].scale.x;
        	dynamic.mesh.scale.set(1/scale, 1/scale, 1/scale);
        	//dynamic.mesh.rotateX(1.57075);
        	//dynamic.mesh.rotateZ(1.57075);
        	// FOR miku
        	dynamic.mesh.position.set(-8,-6,0);
        	// FOR sarah/ciciero/mr
        	//dynamic.mesh.position.set(-0.02, -0.15, -0.1);
		} else { //this item is not attached to bones but deformed by base skeleton
			var mesh = await this.game.loadItem(item.model, this.armature, item.options);
			this.meshes[item.slot] = mesh;
        	this.refreshMesh();
		}
	};

	Character.prototype.refreshMesh = function() {
		/*
			Merge all meshes and update mesh DB
		*/
		var singleGeometry = null;
    	var materials = new Array();

    	for(var key in this.meshes) {
    		if(!(this.equipment[key].bone || this.equipment[key].physics)) {
	    		if(singleGeometry === null) {
	    			singleGeometry = new THREE.BufferGeometry().copy(this.meshes[key].geometry);

	    			materials = materials.concat(this.meshes[key].material);
	    		} else {
	        		singleGeometry.merge(
	        			this.meshes[key].geometry,
	        			materials.length
	        		);
	        		materials = materials.concat(this.meshes[key].material);
        		}
    		}
    	}

    	this.armature.remove(this.clothingMesh);
    	if(singleGeometry !== null) {
	    	this.clothingMesh = this.game.parseMesh(singleGeometry, materials);
	    	this.clothingMesh.bind(this.armature.skeleton, new THREE.Matrix4());
	    	this.armature.add(this.clothingMesh);
	    } else {
	    	this.clothingMesh = null;
	    }
	}
	
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
	Character.prototype.dispose = function() {
		for(var slot in this.equipment) {
			this.unequip(slot);
		}
		this.physRig.deletePhysItem(this.armature);
	};
	return Character;
});
