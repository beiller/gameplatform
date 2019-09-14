function createWindow(windowContents) {
    var container = document.createElement( 'div' );
    document.body.appendChild( container );
    $(container).empty();
    if(windowContents) {
        $(container).append(windowContents);
    }
    $(container).dialog({	
        maxHeight: 500,
        position: { my: "left top", at: "left top", of: window }
    }).dialogExtend({
        "closable" : false,
        "maximizable" : true,
        "minimizable" : true,
        "collapsable" : true,
        "dblclick" : "collapse",
        "titlebar" : "transparent",
        "minimizeLocation" : "right"
    });
}

function createParameterUI(parameterPath) {
    /*
    */
}

function createDebugConsole(commandHandler) {
	const div = document.createElement('div')
	const textarea = document.createElement('textarea');
	const button = document.createElement('button');
	textarea.innerHTML = `ENGINE.createEntity(gameState, {
		"entity": {}, 
		"render": { "type": "sphere", "radius": 0.2 }, 
		"physics": {
		"x": 0, "y": 4, "z": 0, 
		"shape": { "type": "sphere", "radius": 0.2 }, "mass": 0.1} 
		});`
	button.innerHTML = 'Submit'
	button.addEventListener('click', function() {
		commandHandler(textarea.value);
	});
	div.append(textarea);
	div.append(button);
	createWindow(div);
}

export { createDebugConsole }