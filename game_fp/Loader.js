import * as THREE from './lib/three.module.js';
import * as GLTF from './GLTFLoader.js';
import * as MESH_UTILS from './mesh_utils.js';

// Instantiate a loader
let loader = new GLTF.GLTFLoader();
let texloader = new THREE.TextureLoader();
let jsonloader = new THREE.JSONLoader();

const loadedFiles = {};

function loadGLTF(filename, callback, numTimesCalled) {
	// Load a glTF resource*/
	loader.load(
		filename, callback,
		function ( xhr ) {
			console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
		},
		function ( error ) {
			console.log( 'An error happened' );
			console.log(error);
		}
	);
}

const materialData = {
	"body": {
    	"roughness": 1.5, "name": "body",
    	"diffusePath": "uunp_test/femalebody_2.png",
    	"roughnessPath": "uunp_test/body_roughness.png",
        "bumpPath": "uunp_test/femalebody_b.png",
    	"normalScale": 0.9,
    	"bumpScale": 0.0003
	},
	"gens_f": {
    	"roughness": 0.6, "name": "body",
    	"diffusePath": "uunp_test/femalebody_2.png"
	},
	"hands": {
    	"roughness": 1.5, "name": "hands",
    	"diffusePath": "uunp_test/femalehands_1.png",
    	"roughnessPath": "uunp_test/hands_roughness.png",
    	"normalPath": "mr/hands_normal.png",
    	"normalScale": 1
	},
	"eye_glass": {
        "roughness": 0.01, "transparent": true, "opacity": 0.25, "metalness": 1.0
    },
	"head": {
    	"roughness": 1.5, "name": "head",
    	"diffusePath": "uunp_test/femalehead.png",
    	"roughnessPath": "uunp_test/head_roughness.png",
    	"normalPath": "uunp_test/head_normal.png",
    	"normalScale": 2.0,
    	"bumpScale": 0.0005
	},
	"eyes": {
		"color": "0xFFFFFF",
    	"name": "eyes", "transparent": false,
    	"roughness": 1.0,
    	"diffusePath": "mr/eyes_blue.png"
	},
	"eyes.lashes": {
    	"name": "eyes", "transparent": true,
    	"diffusePath": "mr/eyes_blue.png"
	},
	"brows": {
    	"roughness": 1.0, "name": "brows", "transparent": true,
    	"diffusePath": "mr/brow.png"
	},
	"metal": {
		"roughness": 0.05, "color": "0xAAAAAA", "metalness": 1.0, "name": "metal" 
	},
	"hair1": {
		"color": "0xDDDDDD",
    	"diffusePath": "uunp_test/Angels.png",
    	"transparent": true, 
    	"name": "hair1"
	},
	"boots1": {
		"color": "0xDDDDDD",
    	"diffusePath": "uunp_test/PC_Event_30_F_A.png",
    	"normalPath": "uunp_test/PC_Event_30_F_A_n.png",
    	"normalScale": 2.0,
    	"name": "boots1",
    	"roughness": 0.250
	},
	"boots2": {
		"color": "0xDDDDDD",
    	"diffusePath": "uunp_test/Castanic_F_L21_Leg.png",
    	"normalPath": "uunp_test/Castanic_F_L21_Leg_n.png",
    	"normalScale": 4.0,
    	"roughness": 0.25,
    	"transparent": false, 
    	"name": "boots2"
	},
	"boots2_metal": {
		"color": "0xAAAAAA",
    	"normalPath": "uunp_test/Castanic_F_L21_Leg_n.png",
    	"transparent": false, 
    	"roughness": 0.2,
    	"metalness": 1.0,
    	"name": "boots2_metal"
	},
	"corset1": {
		"color": "0xDDDDDD",
    	"diffusePath": "uunp_test/Castanic_F_L21_Body.png",
    	"normalPath": "uunp_test/Castanic_F_L21_Body_n.png",
    	"normalScale": 8.0,
    	"roughness": 0.6,
    	"transparent": true, 
    	"name": "corset1"
	},
	"corset1_metal": {
		"color": "0xAAAAAA",
    	"normalPath": "uunp_test/Castanic_F_L21_Body_n.png",
    	"roughness": 0.2,
    	"transparent": false,
    	"metalness": 1.0, 
    	"name": "corset1_metal"
	},
	"bra1": {
		"color": "0xDDDDDD",
    	"diffusePath": "uunp_test/Castanic_F_H20_Body_diff.png",
    	"transparent": true, 
    	"name": "bra1"
	},
};
const characterData = {
	"uunp_test": {
	    "model": "uunp_test/body.json",
	    "sss": false,
	    "material": [
	        { "$ref": "#/materials/body" }
	    ],
	    "equipment": [
			"uunp_head1","uunp_hands","uunp_gens_f","uunp_boots1","uunp_corset1","uunp_bra1",
			"uunp_leg_armor1","uunp_hair2"
	    ]
	}
}
const itemData = {
    "uunp_head1": {"name": "uunp_head1",  "model": "uunp_test/head1_ultra.json", "slot": "head", "options": { 
            "material": [
                { "$ref": "#/materials/eyes" },
                { "$ref": "#/materials/head" },
                {"roughness": 0.2, "color": "0xDDDDDD", "name": "teeth" },
                { "$ref": "#/materials/body" },
                {"roughness": 0.2, "color": "0x664444", "name": "mouth" },
                { "$ref": "#/materials/brows" },
                { "$ref": "#/materials/eye_glass" },
                { "$ref": "#/materials/eyes.lashes" },
                {"roughness": 1, "color": "0x000000", "name": "eye_black" }
            ]
        }
    },
    "uunp_hands": {"name": "uunp_hands",  "model": "uunp_test/hands_ultra.json", "slot": "hands", "options": { 
            "material": [
                { "$ref": "#/materials/hands" }
            ]
        }
    },
    "uunp_gens_f": {"name": "gens",  "model": "uunp_test/gens_f.json", "slot": "gens_f", "options": { 
            "material": [
                { "$ref": "#/materials/gens_f" }
            ]
        }
    },
    "uunp_boots1": {"name": "uunp_boots1",  "model": "uunp_test/boots1.json", "slot": "boots", "options": { 
            "material": [
                { "$ref": "#/materials/boots1" },
                { "$ref": "#/materials/metal" }
            ]
        }
    },
    "uunp_corset1": {"name": "uunp_corset1",  "model": "uunp_test/corset1.json", "slot": "bottom", "options": { 
            "material": [
                { "$ref": "#/materials/corset1" }
            ]
        }
    },
    "uunp_shawl1": {"name": "Fur Shawl",  "model": "uunp_test/shawl1.json", "slot": "shoulders", "options": { 
            "material": [
                { "$ref": "#/materials/corset1" }
            ]
        }
    },
    "uunp_bra1": {"name": "uunp_bra1",  "model": "uunp_test/bra1.json", "slot": "top", "options": { 
            "material": [
                { "$ref": "#/materials/bra1" }
            ]
        }
    },
    "uunp_stocking1": {"name": "uunp_stocking1",  "model": "uunp_test/stocking1.json", "slot": "stocking", "options": { 
            "material": [
                { "$ref": "#/materials/corset1" }
            ]
        }
    },
    "uunp_leg_armor1": {"name": "Steel Leg Armor",  "model": "uunp_test/leg_armor1.json", "slot": "leg", "options": { 
            "material": [
                { "$ref": "#/materials/corset1_metal" }
            ]
        }
    },
    "uunp_hair1": {"name": "uunp_hair1",  "model": "uunp_test/hair1.json", "slot": "hair", "options": { 
            "material": [
                { "$ref": "#/materials/hair1" }
            ]
        }
    },
    "uunp_hair2": {"name": "uunp_hair2",  "model": "uunp_test/hair2.json", "slot": "hair", "options": { 
            "material": [
                { "$ref": "#/materials/hair1" }
            ]
        }
    },
    "uunp_hair3": {"name": "uunp_hair3",  "model": "uunp_test/hair3.json", "slot": "hair", "options": { 
            "material": [
                { "$ref": "#/materials/hair1" }
            ]
        }
    },
}

function resolveMaterials(materialList) {
	let newMaterialsList = [];
	for(let i in materialList) {
		if('$ref' in materialList[i]) {
			try{
				newMaterialsList.push(materialData[materialList[i]['$ref'].split('/').pop()]);
			} catch(e) {
				newMaterialsList.push({});
			}
		} else {
			newMaterialsList.push(materialData[materialList[i]]);
		}
	}
	for(let i in newMaterialsList) {
		for(let k in newMaterialsList[i]) {
			if(typeof newMaterialsList[i][k] == 'string' && newMaterialsList[i][k].startsWith('0x')) {
				newMaterialsList[i][k] = new THREE.Color(parseInt(newMaterialsList[i][k], 16));
			}
			if(k == 'normalScale') {
				newMaterialsList[i][k] = new THREE.Vector2(newMaterialsList[i][k], newMaterialsList[i][k]);
			}
		}
	}
	return newMaterialsList;
}
function parseMetaData(rootMeshData) {
	let listOfMetadata = [];
	rootMeshData.material = resolveMaterials(rootMeshData.material);
	listOfMetadata.push(rootMeshData);
	for(let i in rootMeshData.equipment) {
		let childMeshData = itemData[rootMeshData.equipment[i]];
		childMeshData.material = resolveMaterials(childMeshData.options.material);
		listOfMetadata.push(childMeshData);
	}
	return listOfMetadata;
}

function jsonPromise(url) {
	return new Promise(function (resolve, reject) {
        jsonloader.load(url + '?cache=' + new Date().getTime(), function(geometry, materials) {
			var bufferGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
			//THREE.js issue# 6869
	    	bufferGeometry.animations = geometry.animations;
	    	bufferGeometry.bones = geometry.bones;
	        geometry.dispose();
        	resolve({geometry: bufferGeometry, materials: materials});
        });
    });
}

function texturePromise(meshIndex, materialIndex, slot, url) {
	return new Promise(function (resolve, reject) {
        texloader.load(url + '?cache=' + new Date().getTime(), function(tex) {
        	resolve([meshIndex, materialIndex, slot, tex]);
        });
    });
}

function loadAllMeshes(metaData, callback) {
	let promises = [];
	for(let i in metaData) {
		promises.push(jsonPromise('/'+metaData[i].model))
	}
	Promise.all(promises).then(function(results) {
	    callback(results);
	}, function(err) {
		console.log(err);
	});
}
const slotMapping = {
	'diffuse': 'map', 'roughness': 'roughnessMap', 'bump': 'bumpMap', 'normal': 'normalMap'
};
function loadAllTextures(metaData, callback) {
	let promises = [];
	for(let i in metaData) {
		for(let j in metaData[i].material) {
			let materialData = metaData[i].material[j];
			for(let prop in materialData) {
				if(prop.endsWith('Path')) {
					let slot = prop.replace('Path', '')
					promises.push(texturePromise(i, j, slotMapping[slot], '/'+materialData[prop]));
				}
			}
		}
	}
	Promise.all(promises).then(function(results) {
	    callback(results);
	}, function(err) {
		console.log(err);
	});
}

function finalize(meshList, callback) {
	let scene = new THREE.Scene();
	scene.add(new THREE.Object3D());
	let singleGeometry = null;
	let materials = new Array();

	for(let i in meshList) {
		
		if(singleGeometry === null) {
			singleGeometry = new THREE.BufferGeometry().copy(meshList[i].geometry);
			materials = materials.concat(meshList[i].materials);
		} else {
    		singleGeometry = MESH_UTILS.mergeGeometry(
    			singleGeometry,
    			meshList[i].geometry,
    			materials.length
    		);
    		materials = materials.concat(meshList[i].materials);
		}
		
	}
	singleGeometry.bones = meshList[0].geometry.bones;
	scene.add(new THREE.SkinnedMesh(singleGeometry, materials));
	callback({scene: scene, animations: meshList[0].geometry.animations});
}

function loadThreeJS(url, callback, numTimesCalled) {
	let meshToLoad = "uunp_test";
	let rootMeshData = characterData[meshToLoad];
	let metaData = parseMetaData(rootMeshData);
	console.log(metaData);
	loadAllMeshes(metaData, function(meshList) { 
		for(let meshId in meshList) {
			for(let materialId in meshList[meshId].materials) {
				meshList[meshId].materials[materialId] = new THREE.MeshStandardMaterial({
					...metaData[meshId].material[materialId],
					skinning: true,
					envMap: 'test'
				});
			}
		}
		loadAllTextures(metaData, function(textureData) {
			for(let i in textureData) {
				let meshIndex = textureData[i][0];
				let materialIndex = textureData[i][1];
				let slot = textureData[i][2];
				let tex = textureData[i][3];
				meshList[meshIndex].materials[materialIndex][slot] = tex;
				meshList[meshIndex].materials[materialIndex].needsUpdate = true;
			}
			finalize(meshList, callback);	
		});
	});
};

export { loadGLTF, loadThreeJS }