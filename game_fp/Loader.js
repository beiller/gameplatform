import * as THREE from './lib/three.module.js';
import * as GLTF from './GLTFLoader.js';
import * as MESH_UTILS from './mesh_utils.js';
import * as RENDER_LOADER from './renderer/loader.js';

// Instantiate a loader
let loader = new GLTF.GLTFLoader();
let texloader = new THREE.TextureLoader();
let jsonloader = new THREE.JSONLoader();

const loadedFiles = {};

function loadGLTF(state, callback, numTimesCalled) {
	const filename = state.filename;
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

//hacks
let materialData = {};
let itemData = {};

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
			newMaterialsList.push(materialList[i]);
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
function parseMetaData(rootMeshData, listOfMetadata) {
	if(!listOfMetadata) listOfMetadata = [];
	if('material' in rootMeshData) {
		rootMeshData.material = resolveMaterials(rootMeshData.material);
	} else {
		rootMeshData.material = resolveMaterials(rootMeshData.options.material);
	}
	listOfMetadata.push(rootMeshData);
	if('equipment' in rootMeshData) {
		for(let i in rootMeshData.equipment) {
			parseMetaData(itemData[rootMeshData.equipment[i]], listOfMetadata);
		}
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

function jsonLibraryPromise(url) {
    return new Promise(function (resolve, reject) {
        fetch(url).then(function(response) {
            resolve(response.json());
        });
    });
}

function loadTexture(url) {
	return new Promise(function (resolve, reject) {
		texloader.load(url + '?cache=' + new Date().getTime(), function(tex) {
        	resolve(tex);
        });
    });
}

function texturePromise(meshIndex, materialIndex, slot, url) {
	return new Promise(function (resolve, reject) {
        /*texloader.load(url + '?cache=' + new Date().getTime(), function(tex) {
        	resolve([meshIndex, materialIndex, slot, tex]);
		});*/
		RENDER_LOADER.loadTextureOnce(url, function(tex) {
			resolve([meshIndex, materialIndex, slot, tex]);
		})
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
	'diffuse': 'map', 'roughness': 'roughnessMap', 'bump': 'bumpMap'/*, 'normal': 'normalMap'*/
};
function loadAllTextures(metaData, callback) {
	let promises = [];
	for(let i in metaData) {
		for(let j in metaData[i].material) {
			let material = metaData[i].material[j];
			for(let prop in material) {
				if(prop.endsWith('Path')) {
					let slot = prop.replace('Path', '')
					if(slot in slotMapping) {
						promises.push(texturePromise(i, j, slotMapping[slot], '/'+material[prop]));
					}
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
	if(meshList[0].geometry.bones) {
		singleGeometry.bones = meshList[0].geometry.bones;
		scene.add(new THREE.SkinnedMesh(singleGeometry, materials));
	} else {
		scene.add(new THREE.Mesh(singleGeometry, materials));
	}
	callback({scene: scene, animations: meshList[0].geometry.animations || []});
}


function loadThreeJS(state, callback, numTimesCalled) {
	const meshToLoad = state.lookup;
    jsonLibraryPromise("/js/data/items.json").then(function(itemJSONData) {
        itemData = itemJSONData; //hack
        jsonLibraryPromise("/js/data/materials.json").then(function(materialJSONData) {
            materialData = materialJSONData; //hack
            jsonLibraryPromise("/js/data/level1.json").then(function(levelData) {
                if(state.jsonType == "item") {
                    const rootMeshData = itemData[meshToLoad];
                    loadRoot(rootMeshData, callback);   
                } else {
                    const rootMeshData = levelData.characters[meshToLoad];
                    loadRoot(rootMeshData, callback);    
                }
            });
        });
    });
}

function loadRoot(rootMeshData, callback) {
	let metaData = parseMetaData(rootMeshData);
	console.log(metaData);
	loadAllMeshes(metaData, function(meshList) { 
		for(let meshId in meshList) {
			for(let materialId in meshList[meshId].materials) {
				meshList[meshId].materials[materialId] = new THREE.MeshStandardMaterial({
					...metaData[meshId].material[materialId],
					skinning: true,
					envMap: undefined,
					shadowSide: THREE.BackSide, side: THREE.DoubleSide
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

export { loadGLTF, loadThreeJS, loadTexture }

