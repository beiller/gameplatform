
function mergeSkinnedMesh( mesh1, mesh2 ) {
	
}

function mergeGeometry( geometry1, geometry2, materialOffset ) {
	var returnGeometry = geometry1.clone();

    var attributes = returnGeometry.attributes;

    if( returnGeometry.index ){

        var indices = geometry2.index.array;

        var offset = attributes[ 'position' ].count;

        for( var i = 0, il = indices.length; i < il; i++ ) {

            indices[i] = offset + indices[i];

        }

        returnGeometry.index.array = Uint32ArrayConcat( returnGeometry.index.array, indices );

    }

    var oldLen = attributes.position.count; // use vertex count

    for ( var key in attributes ) {

        if ( geometry2.attributes[ key ] === undefined ) continue;

        attributes[ key ].array = Float32ArrayConcat( attributes[ key ].array, geometry2.attributes[ key ].array );
        attributes[ key ].count = attributes[ key ].array.length / attributes[ key ].itemSize;

    }

    for(var i = 0; i < geometry2.groups.length; i++) {
    	var oldGroup = geometry2.groups[i];
    	var newGroup = {
    		start: oldLen + oldGroup.start,
    		count: oldGroup.count,
    		materialIndex: oldGroup.materialIndex + materialOffset
    	};
    	this.groups.push(newGroup);
    }

    return returnGeometry;

    /***
     * @param {Float32Array} first
     * @param {Float32Array} second
     * @returns {Float32Array}
     * @constructor
     */
    function Float32ArrayConcat(first, second)
    {
        var firstLength = first.length,
            result = new Float32Array(firstLength + second.length);

        result.set(first);
        result.set(second, firstLength);

        return result;
    }

    /**
     * @param {Uint32Array} first
     * @param {Uint32Array} second
     * @returns {Uint32Array}
     * @constructor
     */
    function Uint32ArrayConcat(first, second)
    {
        var firstLength = first.length,
            result = new Uint32Array(firstLength + second.length);

        result.set(first);
        result.set(second, firstLength);

        return result;
    }

};