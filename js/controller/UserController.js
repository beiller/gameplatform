define(["lib/state-machine", "controller/Controller"], 
function(StateMachine, Controller) {
	UserController.prototype = new Controller();
	UserController.prototype.constructor = UserController;
	function UserController(character, game) {
	    Controller.prototype.constructor.call(this, character, game);

	
	    var mv = character.movementDirection;
	    var stateMachine = character.stateMachine;
	    this.keyModifier = {};
	    this.buttonModifier = {};
	    var scope = this;
	    var animationIndex = 0;
	    var animations = [
	    	"idle2", "sd1", "y3", "pm1", "y2"
	    ];

	    var keymap = {
	        'keydown': {
	            '87': function() { stateMachine.jump(); }, //W KEY
	            '83': function() {  }, //S KEY
	            '68': function() { mv.x += 1.0; stateMachine.run(); }, //A KEY
	            '65': function() { mv.x -= 1.0; stateMachine.run(); },  //D KEY
	            '32': function() { 
	            	stateMachine.playAnimation(animations[animationIndex % animations.length]); 
	            	animationIndex += 1; 
	            }  //SPACEBAR
	        },
	        'keyup':{
	            '87': function() {  },
	            '83': function() {  },
	            '68': function() { mv.x -= 1.0; stateMachine.idle(); },
	            '65': function() { mv.x += 1.0; stateMachine.idle(); },
	            '32': function() {  }
	        }
	    };
	    var onDocumentKeyDown = function( event ) {
	        if((event.keyCode in scope.keyModifier && scope.keyModifier[event.keyCode] == false) || !(event.keyCode in scope.keyModifier)) {
	            if (event.keyCode in keymap['keydown']) {
	                keymap['keydown'][event.keyCode]();
	                scope.keyModifier[event.keyCode] = true;
	            }
	        }
	    };
	    var onDocumentKeyUp = function( event ) {
	        if ((event.keyCode in scope.keyModifier && scope.keyModifier[event.keyCode] == true) || !(event.keyCode in scope.keyModifier)) {
	            if (event.keyCode in keymap['keyup']) {
	                keymap['keyup'][event.keyCode]();
	                scope.keyModifier[event.keyCode] = false;
	            }
	        }
	    };
	    var onMouseDownFunction = function( event ) {
	        //console.log(event);
	        event.preventDefault();
	        if(event.button == 0) {
	            stateMachine.attack();
	        } else if(event.button == 2) {
	            stateMachine.block();
	        }
	        scope.buttonModifier[event.button] = true;
	        return false;
	    };
	    var onMouseUpFunction = function( event ) {
	        //console.log(event);
	        event.preventDefault();
	        if(event.button == 2) {
	            stateMachine.unblock();
	        }
	        scope.buttonModifier[event.button] = false;
	        return false;
	    };
	    
	    /*
	     *  SET A polling for controller input, if the button is held down
	     *  100 ms
	     */
	    setInterval(function() {
	    	if(scope.keyModifier['68'] || scope.keyModifier['65']) {
	    		stateMachine.run();
	    	}
	    	if(scope.keyModifier['87']) {
	    		stateMachine.jump();
	    	}
	    	if(scope.buttonModifier[2]) {
	    		stateMachine.block();
	    	}
	    	if(scope.buttonModifier[0]) {
	    		stateMachine.attack();
	    	}
	    }, 100);
	    /*window.addEventListener( 'keydown', onDocumentKeyDown, false );
	    window.addEventListener( 'keyup', onDocumentKeyUp, false );
	    window.addEventListener( 'mousedown', onMouseDownFunction, false );
	    window.addEventListener( 'mouseup', onMouseUpFunction, false );*/
	    $(window).on('keydown', onDocumentKeyDown).on('keyup', onDocumentKeyUp);
	    $(game.container).on('mousedown', onMouseDownFunction);
	    $(game.container).on('mouseup', onMouseUpFunction);
	
	    function MobileControl(onTouchStart, onTouchEnd) {
	        //this.container = document.createElement( 'div' );
	        //document.body.appendChild( this.container );
	
	        //this.container.className = "button";
	        //this.container.innerHTML = "HELLO WORLD!";
	        document.body.addEventListener('touchstart', function(e) { alert(e.targetTouches[0].pageX / screen.width); });
	        //this.container.addEventListener('touchend', function(e) { console.log('touchend', e); });
	        //this.container.addEventListener('touchmove', function(e) { console.log('touchmove', e); });
	        //this.container.addEventListener('touchcancel', function(e) { console.log('touchcancel', e); });
	    }

	}
	
	return UserController;
});