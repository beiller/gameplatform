
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
				/*if(beforeApplyStats != newState) {
					if(newState.health <= 0 && id in gameState.ai) {
						delete gameState.ai[id];
						delete gameState.motion[id];
						delete gameState.input[id];
						return state;
					}
					const totalDamage = beforeApplyStats.health - newState.health;
					createDamageText(state, id, eventHandler, gameState, totalDamage);

				}*/
				newState['hitCooldown'] = 5;  // invincibility frames
			}
		}
		return newState;
	}
	return state; 
}

function doStateTransition(state, objectId, systemName, systemFunc, eventHandler, gameState) {
	try {
		return systemFunc(
			state,
			objectId, 
			eventHandler,
			gameState
		);
	} catch(e) {
		console.log(e);
		return state;
	}
}
function processSystemWorker(systemName, systemFunc, gameState) {
    const systemStates = gameState[systemName];
    const newStates = {};
    for(let objectId in systemStates) {
        newStates[objectId] = doStateTransition(
            systemStates[objectId], objectId, systemName, systemFunc, null, gameState
        )
    }
    return newStates;
}

self.addEventListener('message', function(e) {
    self.postMessage({
        responseId: e.data.responseId,
        response: processSystemWorker(e.data.systemName, applyStats, e.data.gameState)
    });
}, false);

