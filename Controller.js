/**
 * Created by bill on 19/11/15.
 */

function KeyboardController(character){
    this.character = character;
    var keymodifier = {};
    var keymap = {
        'keydown': {
            '87': function(){//w
                character.movementDirection.z += 1.0;
            },
            '83': function(){//s
                character.movementDirection.z -= 1.0;
            },
            '68': function(){//a
                character.movementDirection.x -= 1.0;
            },
            '65': function(){//d
                character.movementDirection.x += 1.0
            }
        },
        'keyup':{
            '87': function(){
                character.movementDirection.z -= 1.0;
            },
            '83': function(){
                character.movementDirection.z += 1.0;
            },
            '68': function(){
                character.movementDirection.x += 1.0;
            },
            '65': function(){
                character.movementDirection.x -= 1.0
            }
        }
    };
    var onDocumentKeyDown = function( event ) {
        if((event.keyCode in keymodifier && keymodifier[event.keyCode] == false) || !(event.keyCode in keymodifier)) {
            if (event.keyCode in keymap['keydown']) {
                keymap['keydown'][event.keyCode]();
                keymodifier[event.keyCode] = true;
            }
        }
    };
    var onDocumentKeyUp = function( event ) {
        if ((event.keyCode in keymodifier && keymodifier[event.keyCode] == true) || !(event.keyCode in keymodifier)) {
            if (event.keyCode in keymap['keyup']) {
                keymap['keyup'][event.keyCode]();
                keymodifier[event.keyCode] = false;
            }
        }
    };
    window.addEventListener( 'keydown', onDocumentKeyDown, false );
    window.addEventListener( 'keyup', onDocumentKeyUp, false );
}