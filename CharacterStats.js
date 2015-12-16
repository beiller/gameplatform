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
    this.range = params.range || 1.0;

    this.movementSpeed = params.movementSpeed || 5.0;

    //chance to stun opponent while blocking
    this.stunWhileBlockingChance = params.stunWhileBlockingChance || 0.1;

    this.strength = 10;
    this.magic = 10;
    this.endurance = 10;
    this.magicResistance = 10;

}
