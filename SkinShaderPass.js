function SkinShaderPass(renderer, camera, object, diffusePath, normalPath, specularPath) {
    this.scene = new THREE.Scene();
    this.firstPass = true;
    this.object = object;

    this.scene.add(object);

    var directionalLight = new THREE.DirectionalLight( 0xffeedd, 1.5 );
    directionalLight.position.set( 0, 0.5, 1 );
    this.scene.add( directionalLight );

    directionalLight = new THREE.DirectionalLight( 0xddddff, 0.5 );
    directionalLight.position.set( 0, 0.5, -1 );
    this.scene.add( directionalLight );

    var shader = THREE.ShaderSkinCustom[ "skin" ];

    // LOADER
    var uniformsUV = THREE.UniformsUtils.clone( shader.uniforms );
    uniformsUV[ "uNormalScale" ].value = -1;
    uniformsUV[ "passID" ].value = 0;
    uniformsUV[ "diffuse" ].value.setHex( 0xbbbbbb );
    uniformsUV[ "specular" ].value.setHex( 0x555555 );
    uniformsUV[ "uRoughness" ].value = 0.205;
    uniformsUV[ "uSpecularBrightness" ].value = 2.0;
    uniformsUV[ "tNormal" ].value = THREE.ImageUtils.loadTexture( normalPath );
    uniformsUV[ "tDiffuse" ].value = THREE.ImageUtils.loadTexture( diffusePath );
    var uniforms = THREE.UniformsUtils.clone( uniformsUV );
    uniforms[ "passID" ].value = 1;
    uniforms[ "tDiffuse" ].value = uniformsUV[ "tDiffuse" ].value;
    uniforms[ "tNormal" ].value = uniformsUV[ "tNormal" ].value;
    uniforms[ "specularMap" ].value = THREE.ImageUtils.loadTexture( specularPath );

    var parameters = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms, lights: true, derivatives: true, transparent: true, skinning: true };
    var parametersUV = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShaderUV, uniforms: uniformsUV, lights: true, derivatives: true };
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

    var rtwidth = 512;
    var rtheight = 512;

    //

    this.composerScene = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );
    this.composerScene.addPass( this.renderModelUV );

    this.renderScene = new THREE.TexturePass( this.composerScene.renderTarget2 );

    //

    this.composerUV1 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );

    this.composerUV1.addPass( this.renderScene );
    this.composerUV1.addPass( this.effectBloom1 );

    this.composerUV2 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );

    this.composerUV2.addPass( this.renderScene );
    this.composerUV2.addPass( this.effectBloom2 );

    this.composerUV3 = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );

    this.composerUV3.addPass( this.renderScene );
    this.composerUV3.addPass( this.effectBloom3 );

    //

    this.effectBeckmann = new THREE.ShaderPass( THREE.ShaderSkinCustom[ "beckmann" ] );
    this.composerBeckmann = new THREE.EffectComposer( renderer, new THREE.WebGLRenderTarget( rtwidth, rtheight, pars ) );
    this.composerBeckmann.addPass( this.effectBeckmann );

    //


    uniforms[ "tBlur1" ].value = this.composerScene.renderTarget2;
    uniforms[ "tBlur2" ].value = this.composerUV1.renderTarget2;
    uniforms[ "tBlur3" ].value = this.composerUV2.renderTarget2;
    uniforms[ "tBlur4" ].value = this.composerUV3.renderTarget2;
    uniforms[ "tBeckmann" ].value = this.composerBeckmann.renderTarget1;

    //clean up
    this.renderModelUV.overrideMaterial = this.shaderUV;
    object.material = this.shader;
}

SkinShaderPass.prototype.loadTextures = function(diffusePath, normalPath, specularPath, onComplete) {
    var shaderNR = this.shader;
    var shaderUV = this.shaderUV;
    var texloader = new THREE.TextureLoader();
    texloader.load(normalPath, function(texture) {
        shaderNR.uniforms.tNormal = texture;
        shaderUV.uniforms.tNormal = texture;
        texloader.load(diffusePath, function(texture) {
            shaderNR.uniforms.tDiffuse = texture;
            shaderUV.uniforms.tDiffuse = texture;
            texloader.load(specularPath, function(texture) {
                shaderNR.uniforms.specularMap = texture;
                if(onComplete !== undefined) onComplete();
            });
        });
    });
};

SkinShaderPass.prototype.render = function() {
    if ( this.firstPass ) {
        console.log(this);
        this.composerBeckmann.render();
        this.firstPass = false;
    }
    this.composerScene.render();
    this.composerUV1.render();
    this.composerUV2.render();
    this.composerUV3.render();

};
