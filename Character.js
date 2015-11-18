function Character(mesh, body, options) {
    this.mesh = mesh;
    this.body = body;
    if(options === undefined) options = {};

    this.movementDirection = new CANNON.Vec3(0,0,0);
    this.movementSpeed = options.movementSpeed || 5.0;
    this.animations = {};

    this.mesh.animationMixer = new THREE.AnimationMixer( this.mesh );
    for ( var i in this.mesh.geometry.animations ) {
        this.animations[this.mesh.geometry.animations[ i ].name]  = this.mesh.geometry.animations[ i ];
    }
}
Character.prototype.playAnimation = function(animationName, options) {
    if(options === undefined) {
        options = {};
    }
    if(this.animations[animationName] !== undefined) {
        var a = new THREE.AnimationAction( this.animations[animationName] );
        a.loop = options.loop || THREE.LoopRepeat;
        a.timeScale = options.timeScale || 1.0;
        if(options.crossFade && this.mesh.animationMixer !== undefined) {
            a.weight = 0.0;
            var crossFadeFrom = this.mesh.animationMixer.actions[this.mesh.animationMixer.actions.length - 1];
            this.mesh.animationMixer = new THREE.AnimationMixer(this.mesh);
            this.mesh.animationMixer.addAction( a );
            this.mesh.animationMixer.addAction( crossFadeFrom );
            this.mesh.animationMixer.crossFade( crossFadeFrom, a, 1.00, false );
        } else {
            this.mesh.animationMixer = new THREE.AnimationMixer(this.mesh);
            this.mesh.animationMixer.play( a );
        }
    }
}
Character.prototype.update = function(delta) {
    //do update skeletal Animation
    if(this.mesh.animationMixer) {
        this.mesh.animationMixer.update(delta);
    }
    //update physics components and copy to mesh position
    if(this.body) {
        this.mesh.position.copy(this.body.position);
        //this.mesh.quaternion.copy(this.body.quaternion);
        var forceVec = new CANNON.Vec3().copy(this.movementDirection);
        forceVec.normalize();
        var vLen = this.body.velocity.length();
        var am = this.mesh.animationMixer;
        if(vLen > 0.2) {
            var velNorm = new CANNON.Vec3().copy(this.body.velocity);
            velNorm.normalize();
            this.mesh.quaternion.setFromAxisAngle( new THREE.Vector3( 0, velNorm.x, 0 ), Math.PI / 2 );            
            if(am.actions.length < 1 || am.actions[0].clip.name != "DE_CombatRun") {
                this.playAnimation("DE_CombatRun");
            }
        } else {
            if(am.actions.length < 1 || am.actions[0].clip.name != "DE_Combatiddle") {
                this.playAnimation("DE_Combatiddle");
            }
        }
        if(vLen < this.movementSpeed) {
            this.body.applyForce(forceVec.scale(this.movementSpeed * 10.0), this.body.position);
        }
    }
};
