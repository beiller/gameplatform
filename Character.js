function Character(mesh, body, options, sssMesh) {
    this.mesh = mesh;
    this.body = body;
    this.sssMesh = sssMesh;
    if(!options || options === undefined) options = {};

    this.movementDirection = new CANNON.Vec3(0,0,0);
    this.movementSpeed = options.movementSpeed || 5.0;
    this.animations = {};
    this.animationMixer = new THREE.AnimationMixer(this.mesh);
    for ( var i in this.mesh.geometry.animations ) {
        this.animations[this.mesh.geometry.animations[ i ].name]  = this.mesh.geometry.animations[ i ];
    }
    this.playingAnimation = false;
}
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
            this.animationMixer = new THREE.AnimationMixer(this.mesh);
            this.animationMixer.addAction( a );
            this.animationMixer.addAction( crossFadeFrom );
            this.animationMixer.crossFade( crossFadeFrom, a, options.crossFadeDuration || 1.00, options.crossFadeWarp || false );
        } else {
            this.animationMixer = new THREE.AnimationMixer(this.mesh);
            this.animationMixer.play( a );
        }
    }
}
Character.prototype.update = function(delta) {
    //do update skeletal Animation
    if(this.animationMixer) {
        this.animationMixer.update(delta);
    }
    //update physics components and copy to mesh position
    if(this.body) {
        this.mesh.position.copy(this.body.position);
        if(this.sssMesh) {
            this.sssMesh.position.copy(this.body.position);
        }
        //this.mesh.quaternion.copy(this.body.quaternion);

        if(!this.playingAnimation) {
            var forceVec = new CANNON.Vec3().copy(this.movementDirection);
            forceVec.normalize();
            var vLen = this.body.velocity.length();
            var am = this.animationMixer;
            if (vLen > 0.2) {
                var velNorm = new CANNON.Vec3().copy(this.body.velocity);
                velNorm.normalize();
                this.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, velNorm.x, 0), Math.PI / 2);
                if (am.actions.length < 1 || am.actions[0].clip.name != "DE_CombatRun") {
                    this.playAnimation("DE_CombatRun", { crossFade: true, crossFadeDuration: 1.0, crossFadeWarp: false });
                }
            } else {
                if (am.actions.length < 1 || am.actions[0].clip.name != "DE_Combatiddle") {
                    this.playAnimation("DE_Combatiddle", { crossFade: true, crossFadeDuration: 1.0, crossFadeWarp: false });
                }
            }
            if (vLen < this.movementSpeed) {
                this.body.applyForce(forceVec.scale(this.movementSpeed * 10.0), this.body.position);
            }
        }
    }
};
