function CharacterStats(params) {
    if(params === undefined) params = {};
    this.maxHealth = params.maxHealth || 100;
    this.health = this.maxHealth;
    this.damage = params.damage || 10;

    //ATTACK cool down in MS
    this.attackCooldown = params.attackCooldown || 200;
    //Stun duration after hit in MS
    this.hitStunDuration = params.attackCooldown || 500;
    //force in some arbitrary unit (CANNON JS)
    this.jumpHeight = params.jumpHeight || 1;
    //chance to block
    this.blockRatio = params.blockRatio || 0.2;
    //range
    this.range = params.range || 3.5;

    //chance to stun opponent while blocking
    this.stunWhileBlockingChance = params.stunWhileBlockingChance || 0.1;

}
