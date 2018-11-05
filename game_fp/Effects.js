import * as THREE from './lib/three.module.js';

var SSAOShader = {

	uniforms: {

		"tDiffuse":     { value: null },
		"tDepth":       { value: null },
		"size":         { value: new THREE.Vector2( 512, 512 ) },
		"cameraNear":   { value: 1 },
		"cameraFar":    { value: 100 },
		"radius":       { value: 64 },
		"onlyAO":       { value: 0 },
		"aoClamp":      { value: 0.00 },
		"lumInfluence": { value: 2.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",

			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform float cameraNear;",
		"uniform float cameraFar;",
		"#ifdef USE_LOGDEPTHBUF",
			"uniform float logDepthBufFC;",
		"#endif",

		"uniform float radius;",     // ao radius
		"uniform bool onlyAO;",      // use only ambient occlusion pass?

		"uniform vec2 size;",        // texture width, height
		"uniform float aoClamp;",    // depth clamp - reduces haloing at screen edges

		"uniform float lumInfluence;",  // how much luminance affects occlusion

		"uniform sampler2D tDiffuse;",
		"uniform sampler2D tDepth;",

		"varying vec2 vUv;",

		// "#define PI 3.14159265",
		"#define DL 2.399963229728653",  // PI * ( 3.0 - sqrt( 5.0 ) )
		"#define EULER 2.718281828459045",

		// user variables

		"const int samples = 64;",     // ao sample count

		"const bool useNoise = true;",      // use noise instead of pattern for sample dithering
		"const float noiseAmount = 0.0004;", // dithering amount

		"const float diffArea = 0.4;",   // self-shadowing reduction
		"const float gDisplace = 0.4;",  // gauss bell center


		// RGBA depth

		"#include <packing>",

		// generating noise / pattern texture for dithering

		"vec2 rand( const vec2 coord ) {",

			"vec2 noise;",

			"if ( useNoise ) {",

				"float nx = dot ( coord, vec2( 12.9898, 78.233 ) );",
				"float ny = dot ( coord, vec2( 12.9898, 78.233 ) * 2.0 );",

				"noise = clamp( fract ( 43758.5453 * sin( vec2( nx, ny ) ) ), 0.0, 1.0 );",

			"} else {",

				"float ff = fract( 1.0 - coord.s * ( size.x / 2.0 ) );",
				"float gg = fract( coord.t * ( size.y / 2.0 ) );",

				"noise = vec2( 0.25, 0.75 ) * vec2( ff ) + vec2( 0.75, 0.25 ) * gg;",

			"}",

			"return ( noise * 2.0  - 1.0 ) * noiseAmount;",

		"}",

		"float readDepth( const in vec2 coord ) {",

			"float cameraFarPlusNear = cameraFar + cameraNear;",
			"float cameraFarMinusNear = cameraFar - cameraNear;",
			"float cameraCoef = 2.0 * cameraNear;",

			"#ifdef USE_LOGDEPTHBUF",

				"float logz = unpackRGBAToDepth( texture2D( tDepth, coord ) );",
				"float w = pow(2.0, (logz / logDepthBufFC)) - 1.0;",
				"float z = (logz / w) + 1.0;",

			"#else",

				"float z = unpackRGBAToDepth( texture2D( tDepth, coord ) );",

			"#endif",

			"return cameraCoef / ( cameraFarPlusNear - z * cameraFarMinusNear );",


		"}",

		"float compareDepths( const in float depth1, const in float depth2, inout int far ) {",

			"float garea = 8.0;",                         // gauss bell width
			"float diff = ( depth1 - depth2 ) * 100.0;",  // depth difference (0-100)

			// reduce left bell width to avoid self-shadowing

			"if ( diff < gDisplace ) {",

				"garea = diffArea;",

			"} else {",

				"far = 1;",

			"}",

			"float dd = diff - gDisplace;",
			"float gauss = pow( EULER, -2.0 * ( dd * dd ) / ( garea * garea ) );",
			"return gauss;",

		"}",

		"float calcAO( float depth, float dw, float dh ) {",

			"vec2 vv = vec2( dw, dh );",

			"vec2 coord1 = vUv + radius * vv;",
			"vec2 coord2 = vUv - radius * vv;",

			"float temp1 = 0.0;",
			"float temp2 = 0.0;",

			"int far = 0;",
			"temp1 = compareDepths( depth, readDepth( coord1 ), far );",

			// DEPTH EXTRAPOLATION

			"if ( far > 0 ) {",

				"temp2 = compareDepths( readDepth( coord2 ), depth, far );",
				"temp1 += ( 1.0 - temp1 ) * temp2;",

			"}",

			"return temp1;",

		"}",

		"void main() {",

			"vec2 noise = rand( vUv );",
			"float depth = readDepth( vUv );",

			"float tt = clamp( depth, aoClamp, 1.0 );",

			"float w = ( 1.0 / size.x ) / tt + ( noise.x * ( 1.0 - noise.x ) );",
			"float h = ( 1.0 / size.y ) / tt + ( noise.y * ( 1.0 - noise.y ) );",

			"float ao = 0.0;",

			"float dz = 1.0 / float( samples );",
			"float l = 0.0;",
			"float z = 1.0 - dz / 2.0;",

			"for ( int i = 0; i <= samples; i ++ ) {",

				"float r = sqrt( 1.0 - z );",

				"float pw = cos( l ) * r;",
				"float ph = sin( l ) * r;",
				"ao += calcAO( depth, pw * w, ph * h );",
				"z = z - dz;",
				"l = l + DL;",

			"}",

			"ao /= float( samples );",
			"ao = 1.0 - ao;",

			"vec3 color = texture2D( tDiffuse, vUv ).rgb;",

			"vec3 lumcoeff = vec3( 0.299, 0.587, 0.114 );",
			"float lum = dot( color.rgb, lumcoeff );",
			"vec3 luminance = vec3( lum );",

			"vec3 final = vec3( color * mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",  // mix( color * ao, white, luminance )

			"if ( onlyAO ) {",

				"final = vec3( mix( vec3( ao ), vec3( 1.0 ), luminance * lumInfluence ) );",  // ambient occlusion only

			"}",

			"gl_FragColor = vec4( final, 1.0 );",

		"}"

	].join( "\n" )

};
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

var CopyShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"opacity":  { value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform float opacity;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 texel = texture2D( tDiffuse, vUv );",
			"gl_FragColor = opacity * texel;",

		"}"

	].join( "\n" )

};
/**
 * @author alteredq / http://alteredqualia.com/
 */

function EffectComposer( renderer, renderTarget ) {

	this.renderer = renderer;

	if ( renderTarget === undefined ) {

		var parameters = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false
		};
		var size = renderer.getSize();
		renderTarget = new THREE.WebGLRenderTarget( size.width, size.height, parameters );

	}

	this.renderTarget1 = renderTarget;
	this.renderTarget2 = renderTarget.clone();

	this.writeBuffer = this.renderTarget1;
	this.readBuffer = this.renderTarget2;

	this.passes = [];

	if ( CopyShader === undefined )
		console.error( "THREE.EffectComposer relies on THREE.CopyShader" );

	this.copyPass = new ShaderPass( CopyShader );

};

Object.assign( EffectComposer.prototype, {

	swapBuffers: function() {

		var tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;

	},

	addPass: function ( pass ) {

		this.passes.push( pass );

		var size = this.renderer.getSize();
		pass.setSize( size.width, size.height );

	},

	insertPass: function ( pass, index ) {

		this.passes.splice( index, 0, pass );

	},

	render: function ( delta ) {

		var maskActive = false;

		var pass, i, il = this.passes.length;

		for ( i = 0; i < il; i ++ ) {

			pass = this.passes[ i ];

			if ( pass.enabled === false ) continue;

			pass.render( this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive );

			if ( pass.needsSwap ) {

				if ( maskActive ) {

					var context = this.renderer.context;

					context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, delta );

					context.stencilFunc( context.EQUAL, 1, 0xffffffff );

				}

				this.swapBuffers();

			}

			if ( THREE.MaskPass !== undefined ) {

				if ( pass instanceof THREE.MaskPass ) {

					maskActive = true;

				} else if ( pass instanceof THREE.ClearMaskPass ) {

					maskActive = false;

				}

			}

		}

	},

	reset: function ( renderTarget ) {

		if ( renderTarget === undefined ) {

			var size = this.renderer.getSize();

			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( size.width, size.height );

		}

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

	},

	setSize: function ( width, height ) {

		this.renderTarget1.setSize( width, height );
		this.renderTarget2.setSize( width, height );

		for ( var i = 0; i < this.passes.length; i ++ ) {

			this.passes[i].setSize( width, height );

		}

	}

} );


function Pass() {

	// if set to true, the pass is processed by the composer
	this.enabled = true;

	// if set to true, the pass indicates to swap read and write buffer after rendering
	this.needsSwap = true;

	// if set to true, the pass clears its buffer before rendering
	this.clear = false;

	// if set to true, the result of the pass is rendered to screen
	this.renderToScreen = false;

};

Object.assign( Pass.prototype, {

	setSize: function( width, height ) {},

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		console.error( "THREE.Pass: .render() must be implemented in derived pass." );

	}

} );
/**
 * @author alteredq / http://alteredqualia.com/
 */

function RenderPass( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

	Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;

	this.clear = true;
	this.needsSwap = false;

};

RenderPass.prototype = Object.assign( Object.create( Pass.prototype ), {

	constructor: RenderPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		this.scene.overrideMaterial = this.overrideMaterial;

		var oldClearColor, oldClearAlpha;

		if ( this.clearColor ) {

			oldClearColor = renderer.getClearColor().getHex();
			oldClearAlpha = renderer.getClearAlpha();

			renderer.setClearColor( this.clearColor, this.clearAlpha );

		}

		renderer.render( this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear );

		if ( this.clearColor ) {

			renderer.setClearColor( oldClearColor, oldClearAlpha );

		}

		this.scene.overrideMaterial = null;
		renderer.autoClear = oldAutoClear;
	}

} );
/**
 * @author alteredq / http://alteredqualia.com/
 */

function ShaderPass( shader, textureID ) {

	Pass.call( this );

	this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";

	if ( shader instanceof THREE.ShaderMaterial ) {

		this.uniforms = shader.uniforms;

		this.material = shader;

	} else if ( shader ) {

		this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		this.material = new THREE.ShaderMaterial( {

			defines: shader.defines || {},
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader

		} );

	}

	this.camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene = new THREE.Scene();

	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.scene.add( this.quad );

};

ShaderPass.prototype = Object.assign( Object.create( Pass.prototype ), {

	constructor: ShaderPass,

	render: function( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.quad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.render( this.scene, this.camera );

		} else {

			renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		}

	}

} );
/**
 * @author alteredq / http://alteredqualia.com/
 */

function MaskPass( scene, camera ) {

	Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	this.clear = true;
	this.needsSwap = false;

	this.inverse = false;

};

MaskPass.prototype = Object.assign( Object.create( Pass.prototype ), {

	constructor: MaskPass,

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		var context = renderer.context;
		var state = renderer.state;

		// don't update color or depth

		state.buffers.color.setMask( false );
		state.buffers.depth.setMask( false );

		// lock buffers

		state.buffers.color.setLocked( true );
		state.buffers.depth.setLocked( true );

		// set up stencil

		var writeValue, clearValue;

		if ( this.inverse ) {

			writeValue = 0;
			clearValue = 1;

		} else {

			writeValue = 1;
			clearValue = 0;

		}

		state.buffers.stencil.setTest( true );
		state.buffers.stencil.setOp( context.REPLACE, context.REPLACE, context.REPLACE );
		state.buffers.stencil.setFunc( context.ALWAYS, writeValue, 0xffffffff );
		state.buffers.stencil.setClear( clearValue );

		// draw into the stencil buffer

		renderer.render( this.scene, this.camera, readBuffer, this.clear );
		renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		// unlock color and depth buffer for subsequent rendering

		state.buffers.color.setLocked( false );
		state.buffers.depth.setLocked( false );

		// only render where stencil is set to 1

		state.buffers.stencil.setFunc( context.EQUAL, 1, 0xffffffff );  // draw if == 1
		state.buffers.stencil.setOp( context.KEEP, context.KEEP, context.KEEP );

	}

} );


function ClearMaskPass() {

	Pass.call( this );

	this.needsSwap = false;

};

ClearMaskPass.prototype = Object.create( Pass.prototype );

Object.assign( ClearMaskPass.prototype, {

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		renderer.state.buffers.stencil.setTest( false );

	}

} );


/**
 * Screen-space ambient occlusion pass.
 *
 * Has the following parameters
 *  - radius
 *  	- Ambient occlusion shadow radius (numeric value).
 *  - onlyAO
 *  	- Display only ambient occlusion result (boolean value).
 *  - aoClamp
 *  	- Ambient occlusion clamp (numeric value).
 *  - lumInfluence
 *  	- Pixel luminosity influence in AO calculation (numeric value).
 * 
 * To output to screen set renderToScreens true
 *
 * @author alteredq / http://alteredqualia.com/
 * @author tentone
 * @class SSAOPass
 */
function SSAOPass( scene, camera, width, height ) {

	if ( SSAOShader === undefined) {

		console.warn( 'THREE.SSAOPass depends on THREE.SSAOShader' );
		return new ShaderPass();

	}

	ShaderPass.call( this, SSAOShader );

	this.width = ( width !== undefined ) ? width : 512;
	this.height = ( height !== undefined ) ? height : 256;

	this.renderToScreen = false;

	this.camera2 = camera;
	this.scene2 = scene;

	//Depth material
	this.depthMaterial = new THREE.MeshDepthMaterial({skinning: true});
	this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
	this.depthMaterial.blending = THREE.NoBlending;

	//Depth render target
	this.depthRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter } );
	//this.depthRenderTarget.texture.name = 'SSAOShader.rt';
	
	//Shader uniforms
	this.uniforms[ 'tDepth' ].value = this.depthRenderTarget.texture;
	this.uniforms[ 'size' ].value.set( this.width, this.height );
	this.uniforms[ 'cameraNear' ].value = this.camera2.near;
	this.uniforms[ 'cameraFar' ].value = this.camera2.far;

	this.uniforms[ 'radius' ].value = 4;
	this.uniforms[ 'onlyAO' ].value = false;
	this.uniforms[ 'aoClamp' ].value = 0.25;
	this.uniforms[ 'lumInfluence' ].value = 0.7;

	//Setters and getters for uniforms
	var self = this;
	Object.defineProperties(this, {

		radius: {
			get: function() { return this.uniforms[ 'radius' ].value; },
			set: function( value ) { this.uniforms[ 'radius' ].value = value; }
		},

		onlyAO: {
			get: function() { return this.uniforms[ 'onlyAO' ].value; },
			set: function( value ) { this.uniforms[ 'onlyAO' ].value = value; }
		},

		aoClamp: {
			get: function() { return this.uniforms[ 'aoClamp' ].value; },
			set: function( value ) { this.uniforms[ 'aoClamp' ].value = value; }
		},

		lumInfluence: {
			get: function() { return this.uniforms[ 'lumInfluence' ].value; },
			set: function( value ) { this.uniforms[ 'lumInfluence' ].value = value; }
		},

	});
}

SSAOPass.prototype = Object.create( ShaderPass.prototype );

/**
 * Render using this pass.
 * 
 * @method render
 * @param {WebGLRenderer} renderer
 * @param {WebGLRenderTarget} writeBuffer Buffer to write output.
 * @param {WebGLRenderTarget} readBuffer Input buffer.
 * @param {Number} delta Delta time in milliseconds.
 * @param {Boolean} maskActive Not used in this pass.
 */
SSAOPass.prototype.render = function( renderer, writeBuffer, readBuffer, delta, maskActive ) {

	//Render depth into depthRenderTarget
	this.scene2.overrideMaterial = this.depthMaterial;
	
	renderer.render( this.scene2, this.camera2, this.depthRenderTarget, true );
	
	this.scene2.overrideMaterial = null;


	//SSAO shaderPass
	ShaderPass.prototype.render.call( this, renderer, writeBuffer, readBuffer, delta, maskActive );

};

/**
 * Change scene to be renderer by this render pass.
 *
 * @method setScene
 * @param {Scene} scene
 */
SSAOPass.prototype.setScene = function(scene) {
	
	this.scene2 = scene;

};

/**
 * Set camera used by this render pass.
 *
 * @method setCamera
 * @param {Camera} camera
 */
SSAOPass.prototype.setCamera = function( camera ) {

	this.camera2 = camera;

	this.uniforms[ 'cameraNear' ].value = this.camera2.near;
	this.uniforms[ 'cameraFar' ].value = this.camera2.far;

};

/**
 * Set resolution of this render pass.
 * 
 * @method setSize
 * @param {Number} width
 * @param {Number} height
 */
SSAOPass.prototype.setSize = function( width, height ) {

	this.width = width;
	this.height = height;

	this.uniforms[ 'size' ].value.set( this.width, this.height );
	this.depthRenderTarget.setSize( this.width, this.height );

};

export { SSAOPass, SSAOShader, CopyShader, EffectComposer, Pass, RenderPass, ShaderPass };


