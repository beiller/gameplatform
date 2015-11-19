function SkinShaderPass(renderer, camera, geometry, object, diffuseTexture, specularTexture, normalTexture, SSSparameters) {
    this.scene = new THREE.Scene();
    this.firstPass = true;
    this.object = new THREE.SkinnedMesh(geometry);
    this.object.skeleton = object.skeleton;
    this.scene.add(this.object);
    if(SSSparameters === undefined) SSSparameters = {};

    var directionalLight = new THREE.DirectionalLight( 0xffeedd, 1.5 );
    directionalLight.position.set( 1, 0.5, 1 );
    this.scene.add( directionalLight );

    directionalLight = new THREE.DirectionalLight( 0xddddff, 0.5 );
    directionalLight.position.set( -1, 0.5, -1 );
    this.scene.add( directionalLight );

    var shader = THREE.ShaderSkinCustom[ "skin" ];
    var uniformsUV = THREE.UniformsUtils.clone( shader.uniforms );

    /*
        OPTIONS
     */

    var rtwidth = diffuseTexture.image.width / 8;
    var rtheight = diffuseTexture.image.height / 8;
    console.log("setting rendertarget size: ", [rtwidth, rtheight] );
    uniformsUV[ "uNormalScale" ].value = SSSparameters.normalScale || -1.5;
    uniformsUV[ "passID" ].value = 0;
    uniformsUV[ "diffuse" ].value.setHex( 0xbbbbbb );
    uniformsUV[ "specular" ].value.setHex( 0x555555 );
    uniformsUV[ "uRoughness" ].value = SSSparameters.roughness || 0.185;
    uniformsUV[ "uSpecularBrightness" ].value = SSSparameters.specular || 0.7;
    uniformsUV[ "tNormal" ].value = normalTexture;
    uniformsUV[ "tDiffuse" ].value = diffuseTexture;


    var uniforms = THREE.UniformsUtils.clone( uniformsUV );
    uniforms[ "passID" ].value = 1;
    uniforms[ "tDiffuse" ].value = uniformsUV[ "tDiffuse" ].value;
    uniforms[ "tNormal" ].value = uniformsUV[ "tNormal" ].value;
    uniforms[ "specularMap" ].value = specularTexture;

    var parameters = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms, lights: true, derivatives: true, transparent: true, skinning: true };
    var parametersUV = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShaderUV, uniforms: uniformsUV, lights: true, derivatives: true, transparent: false, skinning: true };
    this.shader = new THREE.ShaderMaterial( parameters );
    this.shaderUV = new THREE.ShaderMaterial( parametersUV );

    // POSTPROCESSING

    this.renderModelUV = new THREE.RenderPass( this.scene, camera, this.shaderUV, new THREE.Color( 0x575757 ) );

    this.effectCopy = new THREE.ShaderPass( THREE.CopyShader );

    this.effectBloom1 = new THREE.BloomPass( 1, 15, 2, 256 );
    this.effectBloom2 = new THREE.BloomPass( 1, 25, 3, 256 );
    this.effectBloom3 = new THREE.BloomPass( 1, 25, 4, 256 );

    this.effectBloom1.clear = true;
    this.effectBloom2.clear = true;
    this.effectBloom3.clear = true;

    this.effectCopy.renderToScreen = true;

    //

    var pars = {
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBFormat,
        stencilBuffer: false
    };

    this.composerScene = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );
    this.composerScene.addPass( this.renderModelUV );

    this.renderScene = new THREE.TexturePass( this.composerScene.renderTarget2 );

    this.composerUV1 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );

    this.composerUV1.addPass( this.renderScene );
    this.composerUV1.addPass( this.effectBloom1 );

    this.composerUV2 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );

    this.composerUV2.addPass( this.renderScene );
    this.composerUV2.addPass( this.effectBloom2 );

    this.composerUV3 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );

    this.composerUV3.addPass( this.renderScene );
    this.composerUV3.addPass( this.effectBloom3 );

    this.effectBeckmann = new THREE.ShaderPass( THREE.ShaderSkinCustom[ "beckmann" ] );
    this.composerBeckmann = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );
    this.composerBeckmann.addPass( this.effectBeckmann );

    uniforms[ "tBlur1" ].value = this.composerScene.renderTarget2;
    uniforms[ "tBlur2" ].value = this.composerUV1.renderTarget2;
    uniforms[ "tBlur3" ].value = this.composerUV2.renderTarget2;
    uniforms[ "tBlur4" ].value = this.composerUV3.renderTarget2;
    uniforms[ "tBeckmann" ].value = this.composerBeckmann.renderTarget1;

    //clean up
    this.renderModelUV.overrideMaterial = this.shaderUV;
    this.object.material = this.shader;
}
SkinShaderPass.prototype.render = function() {
    if ( this.firstPass ) {
        this.composerBeckmann.render();
        this.firstPass = false;
    }
    this.composerScene.render();
    this.composerUV1.render();
    this.composerUV2.render();
    this.composerUV3.render();

};
