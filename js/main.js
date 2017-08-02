requirejs.config({
	baseUrl: 'js',
	shim: {
		'lib/zepto': {
			exports: '$'
		},
		'lib/cannon': {
			exports: 'CANNON'
		},
		'lib/ammo': {
			exports: 'Ammo'
		}
	}
});

// Start the main app logic.
requirejs(
	[
		'HUD', 'lib/three'
	],
	function(HUD, THREE) {

		window.onerror = function(msg, url, line, col, error) {
		   // Note that col & error are new to the HTML 5 spec and may not be 
		   // supported in every browser.  It worked for me in Chrome.
		   var extra = !col ? '' : '\ncolumn: ' + col;
		   extra += !error ? '' : '\nerror: ' + error;

		   // You can view the information in an alert to see things working like this:
		   alert("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);

		   // TODO: Report this error via ajax so you can keep track
		   //       of what pages have JS issues

		   var suppressErrorAlert = true;
		   // If you return true, then error alerts (like in older versions of 
		   // Internet Explorer) will be suppressed.
		   return suppressErrorAlert;
		};

		
		/*var loader = new Loader();
		Promise.all([
			loader.loadJSON("js/data/settings.json"),
			loader.loadJSON("level2/level2.json"),
			loader.loadJSON("js/data/items.json")
		]).then(function(arr) {
			var gameSettings = arr[0],
    			levelData = arr[1],
    			itemData = arr[2];
			runGame(gameSettings, levelData, itemData);
		}, function(e) { throw e; });*/
		var hud = new HUD(null);

		var fps = 60;
		var interval = 1000 / fps;
		var drawTime = null;
		var logicTime = null;
		var frameTimer = new THREE.Clock(true);
		var frameCount = 0;
		var logicCount = 0;
		var skipPhysics = false;
		var skipAnimation = false;
		
		window.game = null;

		function draw() {
			requestAnimationFrame(draw);
			if(!window.game) {
				return;
			}
			window.game.animate(skipPhysics, skipAnimation);
			window.game.render();
			if (frameTimer.getElapsedTime() >= 1.0) {
				document.getElementById("debugConsole").innerHTML = "drawFPS: " + frameCount + "<br/>logicFPS: " + logicCount;
				frameCount = 0;
				logicCount = 0;
				frameTimer.start();
			}
			frameCount++;
		}

		draw();


		/*setTimeout(function() {
			skipPhysics = false;
			skipAnimation = false;
		}, 10);*/
	}
);