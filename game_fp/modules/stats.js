
/*
 	Shoots out a damage text given text from position of gameState.physics[id]
*/
function createDamageText(state, id, eventHandler, gameState, text) {
	const rScale = 0.04;
	const x = gameState.physics[id].x;
	const y = gameState.physics[id].y;
	const z = gameState.physics[id].z;
	const fx = (((Math.random() - 0.5)*2.0)*rScale);
	const fz = (((Math.random() - 0.5)*2.0)*rScale);
	//createEntity();
	return {
		"entity": {x: x, y: y, z: z },
		"render": { type: "3dText", string: ""+text, size: 1.0, height: 0.5, colorIntHex: 0xFFAAAA },
		"physics": {x: x, y: y, z: z, shape: { type: "sphere", radius: 0.5 }, mass: 0.25 },
		"particle": {maxAge: 70, damping: 0.5 },
		"motion": {fx: fx, fy: 0.1, fz: fz}
	}
}

function applyStatsEffect(stats1, stats2, id, otherId, gameState) {
	if('effect' in stats2 && 'health' in stats1 && id != otherId) {
		let totalDamage = 0;
		for(let effectType in stats2.effect) {
			totalDamage += Math.max(stats2.effect[effectType] - (stats1[effectType] || 0), 0);
		}
		console.log('Inflicted', totalDamage, 'hp damage');
		return {
			...stats1, health: stats1.health - totalDamage
		};
	}
	return stats1;
}

function applyStats(state, id, eventHandler, gameState) { 
	if('hitCooldown' in state && state.hitCooldown > 0) {
		return {...state, hitCooldown: state.hitCooldown - 1};
	}

	if(id in gameState.collision) { 
		let newState = {...state};
		for(var index in gameState.collision[id].colliding) {
			if(gameState.collision[id].colliding[index].id in gameState.stats) {
				const otherId = gameState.collision[id].colliding[index].id;
				const otherStats = gameState.stats[otherId];
				if (otherStats.origin === id) {
					return state;
				}
				const beforeApplyStats = newState;

				newState = applyStatsEffect(newState, otherStats, id, otherId, gameState);
				if(beforeApplyStats != newState) {
					if(newState.health <= 0 && id in gameState.ai) {
						eventHandler.removeBehaviour("ai", id);
						eventHandler.removeBehaviour("motion", id);
						eventHandler.removeBehaviour("input", id);
						return state;
					}
					const totalDamage = beforeApplyStats.health - newState.health;
					eventHandler.createEntity(createDamageText(state, id, eventHandler, gameState, totalDamage));

				}
				newState['hitCooldown'] = 5;  // invincibility frames
			}
		}
		return newState;
	}
	return state; 
}

if(typeof importScripts === 'function') {
	importScripts('../engine_worker.js');
	registerSystemFunction("stats", applyStats);
} else {
	window.applyStats = applyStats;
}
