define(function() {
	function CharacterStats(params) {
		this.init(params);
	}
	CharacterStats.prototype.init = function(params) {
	    if(params === undefined) params = {};
	    this.maxHealth = params.maxHealth || 100;
	    this.health = this.maxHealth;
	    this.damage = params.damage || 10;
	
	    //ATTACK cool down in MS
	    this.attackCooldown = params.attackCooldown || 500;
	    //Stun duration after hit in MS
	    this.hitStunDuration = params.hitStunDuration || 500;
	    //force in some arbitrary unit (CANNON JS)
	    this.jumpHeight = params.jumpHeight || 1;
	    //chance to block
	    this.blockRatio = params.blockRatio || 0.2;
	    //range
	    this.range = params.range || 1.0;
	
	    this.movementSpeed = params.movementSpeed || 5.0;
	
	    //chance to stun opponent while blocking
	    this.stunWhileBlockingChance = params.stunWhileBlockingChance || 0.1;
	
	    this.strength = params.strength || 10;
	    this.magic = params.magic || 10;
	    this.endurance = params.endurance || 10;
	    this.magicResistance = params.magicResistance || 10;
	};
	return CharacterStats;
});