function CharacterStats(params) {
    if(params === undefined) params = {};
    this.maxHealth = params.maxHealth || 100;
    this.health = this.maxHealth;
    this.damage = params.damage || 20;

    //ATTACK cool down in MS
    this.attackCooldown = params.attackCooldown || 600;
    //force in some arbitrary unit (CANNON JS)
    this.jumpForce = params.jumpForce || 6000;
    //chance to block
    this.blockRatio = params.blockRatio || 0.2;
    //time to

}
