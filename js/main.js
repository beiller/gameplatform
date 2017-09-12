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

		/*
		// USE THE FOLLOWING FOR EXTREME DEBUGGING
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
		*/

		
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
		var frameTime = 1.0 / fps;
		var drawTime = null;
		var logicTime = null;
		var frameTimer = new THREE.Clock(true);
		var drawTimer = new THREE.Clock(true);
		var frameCount = 0;
		var logicCount = 0;
		var skipPhysics = true;
		var skipAnimation = false;

		function animFunction() {
			if(!window.game) {
				return;
			}
			window.game.animate(skipPhysics, skipAnimation);
		}

		function drawFunction() {
			window.game.render();
			drawTimer.start();
			frameCount++;
		}

		setInterval(animFunction, 1000/60);
		
		window.game = null;
		var tickerInfo = ["drawFPS:", 0, "<br/>", "logicFPS:", 0];

		function draw() {

			requestAnimationFrame(draw);
			
			if(!window.game) {
				return;
			}
			
			drawFunction();
			//if(drawTimer.getElapsedTime() >= frameTime) {
			//	
			//}
			
			if (frameTimer.getElapsedTime() >= 1.0) {
				tickerInfo[1] = frameCount;
				tickerInfo[4] = logicCount;
				document.getElementById("debugConsole").innerHTML = tickerInfo.join(" ");
				frameCount = 0;
				logicCount = 0;
				frameTimer.start();
			}
			
		}

		draw();


		/*setTimeout(function() {
			skipPhysics = false;
			skipAnimation = false;
		}, 10);*/
	}
);