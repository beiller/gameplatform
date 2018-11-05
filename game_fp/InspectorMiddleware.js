import * as ENGINE from './engine.js';

var element = null;
var doUpdateFunc = createUIDiv;
function createUIDiv(state){
    var container = document.createElement( 'div' );
    container.innerHTML = "TEST";
    element = container;
    document.body.appendChild( container );
    doUpdateFunc = updateUIDiv;
}

const htmlCache = {};
function getClickFn(k, inp, ser) {
	ser = ser || function(x) { return x; }
	return function() {
		modifiers.push({path: k, val: ser(inp.val())});
	}
}

function createMenu(drawMap, key) {
	const r = $("<div class='accordion'>");
	for(var k in drawMap) {
		const newKey = key + '.' + k;
		const header = $("<h3>");
		const div = $("<div>");
		const content = $("<p>");
		div.append(content);
		r.append(header).append(div);
		header.text(k);
		if (
			(typeof drawMap[k] === 'string' || drawMap[k] instanceof String)
			|| drawMap[k].toFixed
		) {
			var label = $('<label>'+newKey+'</label>')
			var field = $('<input name="'+newKey+'" id="'+newKey+'" value="'+drawMap[k]+'"/>')
			var button = $('<a class="ui-button ui-widget ui-corner-all" href="#">set</a>')
			button.click(getClickFn(newKey, field, drawMap[k].toFixed ? parseFloat : undefined));
			content.append(label).append(field).append(button);
		}
		if (typeof drawMap[k] == 'object' && drawMap[k].constructor == Object) {
			content.append(createMenu(drawMap[k], newKey));
		}
	}
	r.accordion({
      collapsible: true, active: false, animate: false, heightStyle: "fill"
    });
	return r;
}

var runFunc = runOnce;
function runOnce(state) {
	if(element.textContent == 'TEST') {

		$(element).empty();
		$(element).append(createMenu(state.state, 'state'));
		$(element).dialog({	
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
	runFunc = function(state) {};
}
function updateUIDiv(state){
	runFunc(state);
	//element.textContent = JSON.stringify(state.state.entity.character1, null, 2);
}

function setDeep(obj, path, val) {
    var i, len;
    var returnRef = obj;
    var parr = path.split('.')
    for(i = 0; i < parr.length-1; i++){
        returnRef = returnRef[parr[i]];
    }
    if(returnRef === undefined) return;
    var endPath = parr.pop();
    var newRet = {
    	...returnRef,
    	[endPath]: val
    }
    returnRef = obj;
    for(i = 0; i < parr.length-1; i++){
        returnRef = returnRef[parr[i]];
    }
    var endPath = parr.pop();
    returnRef[endPath] = ENGINE.deepFreeze(newRet);
}

var modifiers = [];

function middleware(nextStateFn) {
	function newMiddleware(state) {
		if(Math.random() > 0.00000) {
			//console.log('Random event occurred! Now showing state:', state);
			doUpdateFunc(state);
		}
		var ns = nextStateFn(state);
		if(modifiers.length > 0) {
			for(var i = 0; i < modifiers.length; i++) {
				setDeep(ns, modifiers[i].path, modifiers[i].val);
			}
			modifiers = [];
			$(element).empty();
			$(element).append(createMenu(ns.state, 'state'));
		}
		return ns;
	}
	return newMiddleware;
}

export { middleware }
