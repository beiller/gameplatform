
function applyParticle(state, id, eventHandler, gameState) {
	if('age' in state && 'maxAge' in state && state.age > state.maxAge) {
		var myId = id;
        eventHandler.deleteEntity(myId);
	}
	return { ...state, age: (state.age || 0)+1, maxAge: state.maxAge || 100 };
}

importScripts('../engine_worker.js');

registerSystemFunction("particle", applyParticle);
