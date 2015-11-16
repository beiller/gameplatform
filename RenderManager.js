function SkinShaderPass() {
	var diffuse = 0xbbbbbb, specular = 0x070707, shininess = 50;

	specular = 0x555555;

	var shader = THREE.ShaderSkinCustom[ "skin" ];

	// LOADER
	var uniformsUV = THREE.UniformsUtils.clone( shader.uniforms );
	uniformsUV[ "uNormalScale" ].value = -1;
	uniformsUV[ "passID" ].value = 0;
	uniformsUV[ "diffuse" ].value.setHex( diffuse );
	uniformsUV[ "specular" ].value.setHex( specular );
	uniformsUV[ "uRoughness" ].value = 0.205;
	uniformsUV[ "uSpecularBrightness" ].value = 2.0;
	var uniforms = THREE.UniformsUtils.clone( uniformsUV );
	uniforms[ "passID" ].value = 1;
}

function RenderManager() {
	var camera = null;
	var scene = null;
	var scene_skin = null;
	var renderer = null;

	var composer, composerUV1, composerUV2, composerUV3, composerBeckmann;
	var firstPass = true;
	var characters = {};

	var cubeCamera = null;
	var container = null;

	this.init();
}
RenderManager.prototype.init = function() {
	this.container = document.createElement( 'div' );
	document.body.appendChild( this.container );

	this.camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.01, 10000 );
	this.camera.position.z = 0.1;

	this.cubeCamera = new THREE.CubeCamera( 1, 1000, 256 );
	//this.cubeCamera.renderTarget.minFilter = THREE.LinearMipMapLinearFilter;

	//a scene containing all skin-rendering meshes and lights
	this.scene_skin = new THREE.Scene();
	//a scene to be rendered afterwards (all objects)
	this.scene = new THREE.Scene();

	addLight(THREE.DirectionalLight, 0xffeedd, 1.5, [0, 0.5, 1]);
	addLight(THREE.DirectionalLight, 0xddddff, 0.5, [0, 0.5, -1]);

}

RenderManager.prototype.addLight = function(lightType, color, strength, position) {
	var directionalLight = new lightType( color, strength );
	directionalLight.position.set( position[0], position[1], position[2] );
	this.scene.add( directionalLight );
	directionalLight = new lightType( color, strength );
	directionalLight.position.set( position[0], position[1], position[2] );
	this.scene_skin.add( directionalLight );
}
