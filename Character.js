function Character(name, mesh, body, options, sssMesh, characterStats) {
    this.mesh = mesh;
    this.body = body;
    this.sssMesh = sssMesh;
    this.controllers = [];
    this.name = name;
    if(!options || options === undefined) options = {};

    this.movementDirection = new CANNON.Vec3(0,0,0);
    this.movementSpeed = options.movementSpeed || 10.0;
    this.stunned = false;


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
}
Character.prototype.createHealthBar = function() {
    var sprite = new THREE.Sprite();
    var healthRatio = this.characterStats.health / this.characterStats.maxHealth;
    sprite.scale.set(2 * healthRatio, 0.25, 0.25);
    sprite.position.set(0, 6, 0);
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
            this.mesh.frustumCulled = false;
        }
        //this.mesh.quaternion.copy(this.body.quaternion);
        //update controller?
        if(this.controllers.length > 0) {
            for(var i in this.controllers)
                this.controllers[i].update(delta);
        }
    }
};
Character.prototype.hit = function(enemyStats) {
    this.characterStats.health = this.characterStats.health - enemyStats.damage;
    if(this.characterStats.health <= 0) {
        console.log(this.name + " has died.");
        this.controllers[0].fsm.dead();
    }
    if(this.healthBarMesh) {
        var healthRatio = Math.max(0.0, this.characterStats.health / this.characterStats.maxHealth);
        this.healthBarMesh.scale.set(2 * healthRatio, 0.25, 0.25);
    }
};
