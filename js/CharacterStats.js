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
	    this.attackCooldown = params.attackCooldown || 800;
	    //Stun duration after hit in MS
	    this.hitStunDuration = params.hitStunDuration || 5000;
	    //Pause duration after taking a hit
	    this.damagedPauseLength = 100;

	    //force in some arbitrary unit
	    this.jumpHeight = params.jumpHeight || 1.5;
	    //chance to block
	    this.blockRatio = params.blockRatio || 0.2;
	    //range
	    this.range = params.range || 1.0;
	
	    this.movementSpeed = params.movementSpeed || 2.25;
	
	    //chance to stun opponent while blocking
	    this.stunWhileBlockingChance = params.stunWhileBlockingChance || 0.05;
	
	    this.strength = params.strength || 1;
	    this.magic = params.magic || 1;
	    this.endurance = params.endurance || 1;
	    this.magicResistance = params.magicResistance || 0;
	};
	return CharacterStats;
});