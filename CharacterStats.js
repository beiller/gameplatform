function CharacterStats(params) {
    if(params === undefined) params = {};
    this.maxHealth = params.maxHealth || 100;
    this.health = this.maxHealth;
    this.damage = params.damage || 20;
}
