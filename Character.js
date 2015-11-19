function Character(name, mesh, body, options, sssMesh) {
    this.mesh = mesh;
    this.body = body;
    this.sssMesh = sssMesh;
    this.controllers = [];
    this.name = name;
    if(!options || options === undefined) options = {};

    this.movementDirection = new CANNON.Vec3(0,0,0);
    this.movementSpeed = options.movementSpeed || 10.0;
    this.animations = {};
    this.animationMixer = new THREE.AnimationMixer(this.mesh);
    for ( var i in this.mesh.geometry.animations ) {
        this.animations[this.mesh.geometry.animations[ i ].name]  = this.mesh.geometry.animations[ i ];
    }
    this.playingAnimation = false;
    this.currentAnimation = null;
}
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
}
Character.prototype.addController = function(controller) {
    this.controllers.push(controller);
}
Character.prototype.update = function(delta) {
    //do update skeletal Animation
    if(this.animationMixer) {
        this.animationMixer.update(delta);
    }
    //update physics components and copy to mesh position
    if(this.body) {
        this.mesh.position.copy(this.body.position);
        this.mesh.frustumCulled = false;
        if(this.sssMesh) {
            this.sssMesh.position.copy(this.body.position);
            this.mesh.frustumCulled = false;
        }
        //this.mesh.quaternion.copy(this.body.quaternion);
        if(this.controllers.length > 0) {
            for(var i in this.controllers)
                this.controllers[i].update(delta);
        }
    }
};
