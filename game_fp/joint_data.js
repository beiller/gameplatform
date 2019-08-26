
//-=-=-=-=--=-=-=- Map of Rigid Bodies -=-=-=-=--=-=-=-
const twoPI = Math.PI;
const PI2 = Math.PI / 4;
const PI4 = Math.PI / 8;
const EPS = 0.05;
const ARMLEG_TWIST = Math.PI * 0.20;
const THIGH_BEND = Math.PI;
const THIGH_ROTATE = Math.PI/2;
const KNEE = Math.PI;
const FOOT_BEND = Math.PI * 0.35;
const FOOT_TWIST = Math.PI * 0.15;
const SPINE_BEND = 0.5;
const CHEST = 0.25;
const SPINE_TWIST = 0.15;
/*
const THIGH_BEND = 0;
const THIGH_ROTATE = 0;
const KNEE = 0;
const FOOT_BEND = 0;
const FOOT_TWIST = 0;
const SPINE_BEND = 0;
const CHEST = 0;
const SPINE_TWIST = 0;*/

const COLLAR = Math.PI / 4;
const SHLDR = Math.PI;
const ELBOW = Math.PI;
const HAND_BEND = Math.PI * 0.5;
const HAND_TWIST = Math.PI * 0.15;


const jointData = {
	'xnalara': {
		pairs: [
		["Armature_pelvis", 0.1],
		["Armature_spine_lower", "Armature_spine_upper"],
		["Armature_spine_upper", 0.2],
		["Armature_head_neck_lower", "Armature_head_neck_upper"],
		["Armature_head_neck_upper", 0.1],
		//head?
		["Armature_leg_thighL", "Armature_leg_kneeL"],
		["Armature_leg_kneeL", "Armature_leg_ankleL"],
		["Armature_leg_ankleL", "Armature_leg_toesL"],
		["Armature_leg_toesL", 0.1],

		["Armature_leg_thighR", "Armature_leg_kneeR"],
		["Armature_leg_kneeR", "Armature_leg_ankleR"],
		["Armature_leg_ankleR", "Armature_leg_toesR"],
		["Armature_leg_toesR", 0.1],

		["Armature_arm_shoulder_1L", "Armature_arm_shoulder_2L"],
		["Armature_arm_shoulder_2L", "Armature_arm_elbowL"],
		["Armature_arm_elbowL", "Armature_arm_wristL"],
		["Armature_arm_wristL", 0.1],
		["Armature_arm_shoulder_1R", "Armature_arm_shoulder_2R"],
		["Armature_arm_shoulder_2R", "Armature_arm_elbowR"],
		["Armature_arm_elbowR", "Armature_arm_wristR"],
		["Armature_arm_wristR", 0.1]
		],

		// -=-=-=-=--=-=-=- Map of Joints -=-=-=-=--=-=-=-
		pairs2: [
		["Armature_spine_lower", "Armature_pelvis", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_spine_upper", "Armature_spine_lower", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_head_neck_lower", "Armature_spine_upper", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_head_neck_upper", "Armature_head_neck_lower", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_arm_shoulder_1L", "Armature_spine_upper"],
		["Armature_arm_shoulder_2L", "Armature_arm_shoulder_1L", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_arm_elbowL", "Armature_arm_shoulder_2L", [-PI2, EPS, EPS], [EPS, EPS, EPS]],
		["Armature_arm_wristL", "Armature_arm_elbowL", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_arm_shoulder_1R", "Armature_spine_upper"],
		["Armature_arm_shoulder_2R", "Armature_arm_shoulder_1R", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_arm_elbowR", "Armature_arm_shoulder_2R", [EPS, EPS, EPS], [EPS, EPS, PI2]],
		["Armature_arm_wristR", "Armature_arm_elbowR", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_leg_thighL", "Armature_pelvis", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_leg_kneeL", "Armature_leg_thighL", [EPS, -PI4, EPS], [PI2, PI4, EPS]],
		["Armature_leg_ankleL", "Armature_leg_kneeL", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_leg_toesL", "Armature_leg_ankleL", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],

		["Armature_leg_thighR", "Armature_pelvis", [-twoPI, -PI2, -twoPI], [twoPI, PI2, twoPI]],
		["Armature_leg_kneeR", "Armature_leg_thighR", [EPS, -PI4, EPS], [PI2, PI4, EPS]],
		["Armature_leg_ankleR", "Armature_leg_kneeR", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]],
		["Armature_leg_toesR", "Armature_leg_ankleR", [-PI4, -PI4, -PI4], [PI4, PI4, PI4]]
		]
	},
	'princess': {
		pairs: [
		["RootNode_pelvis", 0.05],
		["RootNode_abdomenLower", "RootNode_abdomenUpper"],
		["RootNode_abdomenUpper", "RootNode_chestLower"],
		["RootNode_chestLower", "RootNode_chestUpper"],
	
		["RootNode_rPectoral", 0.2],
		["RootNode_lPectoral", 0.2],
	
		["RootNode_chestUpper", "RootNode_neckLower"],
		["RootNode_neckLower", "RootNode_neckUpper"],
		["RootNode_neckUpper", "RootNode_head"],
		["RootNode_head", 0.15],
	
		["RootNode_rCollar", "RootNode_rShldrBend"],
		["RootNode_rShldrBend", "RootNode_rShldrTwist"],
		["RootNode_rShldrTwist", "RootNode_rForearmBend"],
		["RootNode_rForearmBend", "RootNode_rForearmTwist"],
		["RootNode_rForearmTwist", "RootNode_rHand"],
		["RootNode_rHand", 0.1],
		["RootNode_lCollar", "RootNode_lShldrBend"],
		["RootNode_lShldrBend", "RootNode_lShldrTwist"],
		["RootNode_lShldrTwist", "RootNode_lForearmBend"],
		["RootNode_lForearmBend", "RootNode_lForearmTwist"],
		["RootNode_lForearmTwist", "RootNode_lHand"],
		["RootNode_lHand", 0.1],
	
		["RootNode_rThighBend", "RootNode_rThighTwist"],
		["RootNode_rThighTwist", "RootNode_rShin"],
		["RootNode_rShin", "RootNode_rFoot"],
		["RootNode_rFoot", "RootNode_rMetatarsals"],
		["RootNode_rMetatarsals", 0.12],
	
		["RootNode_lThighBend", "RootNode_lThighTwist"],
		["RootNode_lThighTwist", "RootNode_lShin"],
		["RootNode_lShin", "RootNode_lFoot"],
		["RootNode_lFoot", "RootNode_lMetatarsals"],
		["RootNode_lMetatarsals", 0.12],
		],
		pairs2: [
		["RootNode_abdomenLower", "RootNode_pelvis", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_abdomenUpper", "RootNode_abdomenLower", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_chestLower", "RootNode_abdomenUpper", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_chestUpper", "RootNode_chestLower", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
		["RootNode_neckLower", "RootNode_chestUpper", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],
		["RootNode_neckUpper", "RootNode_neckLower", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],
		["RootNode_head", "RootNode_neckUpper", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],
	
		["RootNode_rPectoral", "RootNode_chestLower", [-CHEST, -CHEST, -CHEST], [CHEST, CHEST, CHEST]],
		["RootNode_lPectoral", "RootNode_chestLower", [-CHEST, -CHEST, -CHEST], [CHEST, CHEST, CHEST]],
	
		["RootNode_rCollar", "RootNode_chestUpper", [-COLLAR, -COLLAR, -COLLAR], [COLLAR, COLLAR, COLLAR]],
		["RootNode_rShldrBend", "RootNode_rCollar", [-SHLDR, -EPS, -SHLDR], [SHLDR, EPS, SHLDR]],
		["RootNode_rShldrTwist", "RootNode_rShldrBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_rForearmBend", "RootNode_rShldrTwist", [-EPS, -EPS, -EPS], [EPS, EPS, ELBOW]],
		["RootNode_rForearmTwist", "RootNode_rForearmBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_rHand", "RootNode_rForearmTwist", [-HAND_BEND, -HAND_TWIST, -HAND_TWIST], [HAND_BEND, HAND_TWIST, HAND_TWIST]],
	
		["RootNode_lCollar", "RootNode_chestUpper", [-COLLAR, -COLLAR, -COLLAR], [COLLAR, COLLAR, COLLAR]],
		["RootNode_lShldrBend", "RootNode_lCollar", [-SHLDR, -EPS, -SHLDR], [SHLDR, EPS, SHLDR]],
		["RootNode_lShldrTwist", "RootNode_lShldrBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_lForearmBend", "RootNode_lShldrTwist", [-EPS, -EPS, -ELBOW], [EPS, EPS, EPS]],
		["RootNode_lForearmTwist", "RootNode_lForearmBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_lHand", "RootNode_lForearmTwist", [-HAND_BEND, -HAND_TWIST, -HAND_TWIST], [HAND_BEND, HAND_TWIST, HAND_TWIST]],
	
		["RootNode_rThighBend", "RootNode_pelvis", [-THIGH_BEND, -EPS, -THIGH_ROTATE], [EPS, EPS, THIGH_ROTATE]],
		["RootNode_rThighTwist", "RootNode_rThighBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_rShin", "RootNode_rThighTwist", [-EPS, -ARMLEG_TWIST, -EPS], [KNEE, ARMLEG_TWIST, EPS]],
		["RootNode_rFoot", "RootNode_rShin", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
		["RootNode_rMetatarsals", "RootNode_rFoot", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
	
		["RootNode_lThighBend", "RootNode_pelvis", [-THIGH_BEND, -EPS, -THIGH_ROTATE], [EPS, EPS, THIGH_ROTATE]],
		["RootNode_lThighTwist", "RootNode_lThighBend", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
		["RootNode_lShin", "RootNode_lThighTwist", [-EPS, -ARMLEG_TWIST, -EPS], [KNEE, ARMLEG_TWIST, EPS]],
		["RootNode_lFoot", "RootNode_lShin", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
		["RootNode_lMetatarsals", "RootNode_lFoot", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]]
	]
	},
	'princessRigify': {
		pairs: [
			["DEF-spine", "DEF-spine_001"],
			["DEF-spine_001", "DEF-spine_002"],
			["DEF-spine_002", "DEF-spine_003"],
			["DEF-spine_003", "DEF-spine_004"],
			["DEF-spine_004", "DEF-spine_005"],
			["DEF-spine_005", "DEF-spine_006"],
			["DEF-spine_006", 0.2],

			["DEF-thigh_R", "DEF-thigh_R_001"],
			["DEF-thigh_R_001", "DEF-shin_R"],
			["DEF-shin_R", "DEF-shin_R_001"],
			["DEF-shin_R_001", "DEF-foot_R"],
			["DEF-foot_R", "DEF-toe_R"],
			["DEF-toe_R", 0.1],
			["DEF-thigh_L", "DEF-thigh_L_001"],
			["DEF-thigh_L_001", "DEF-shin_L"],
			["DEF-shin_L", "DEF-shin_L_001"],
			["DEF-shin_L_001", "DEF-foot_L"],
			["DEF-foot_L", "DEF-toe_L"],
			["DEF-toe_L", 0.1],

			["DEF-shoulder_L", 0.2],
			["DEF-upper_arm_L", 0.2],
			["DEF-upper_arm_L_001", 0.2],
			["DEF-forearm_L", 0.2],
			["DEF-forearm_L_001", 0.2],
			["DEF-hand_L", 0.2],
			["DEF-shoulder_R", 0.2],
			["DEF-upper_arm_R", 0.2],
			["DEF-upper_arm_R_001", 0.2],
			["DEF-forearm_R", 0.2],
			["DEF-forearm_R_001", 0.2],
			["DEF-hand_R", 0.2]
		], 
		pairs2: [
			["DEF-spine", "DEF-spine_001", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
			["DEF-spine_001", "DEF-spine_002", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
			["DEF-spine_002", "DEF-spine_003", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
			["DEF-spine_003", "DEF-spine_004", [-SPINE_BEND, -SPINE_TWIST, -SPINE_TWIST], [SPINE_BEND, SPINE_TWIST, SPINE_TWIST]],
			["DEF-spine_004", "DEF-spine_005", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],
			["DEF-spine_005", "DEF-spine_006", [-EPS, -EPS, -EPS], [EPS, EPS, EPS]],

			["DEF-thigh_R", "DEF-spine", [-THIGH_BEND, -EPS, -THIGH_ROTATE], [EPS, EPS, THIGH_ROTATE]],
			["DEF-thigh_R_001", "DEF-thigh_R", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-shin_R", "DEF-thigh_R_001", [-EPS, -ARMLEG_TWIST, -EPS], [KNEE, ARMLEG_TWIST, EPS]],
			["DEF-shin_R_001", "DEF-shin_R", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-foot_R", "DEF-shin_R_001", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
			["DEF-toe_R", "DEF-foot_R", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],

			["DEF-thigh_L", "DEF-spine", [-THIGH_BEND, -EPS, -THIGH_ROTATE], [EPS, EPS, THIGH_ROTATE]],
			["DEF-thigh_L_001", "DEF-thigh_L", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-shin_L", "DEF-thigh_L_001", [-EPS, -ARMLEG_TWIST, -EPS], [KNEE, ARMLEG_TWIST, EPS]],
			["DEF-shin_L_001", "DEF-shin_L", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-foot_L", "DEF-shin_L_001", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],
			["DEF-toe_L", "DEF-foot_L", [-FOOT_BEND, -FOOT_TWIST, -FOOT_TWIST], [FOOT_BEND, FOOT_TWIST, FOOT_TWIST]],

			["DEF-shoulder_R", "DEF-spine_003", [-COLLAR, -COLLAR, -COLLAR], [COLLAR, COLLAR, COLLAR]],
			["DEF-upper_arm_R", "DEF-shoulder_R", [-SHLDR, -EPS, -SHLDR], [SHLDR, EPS, SHLDR]],
			["DEF-upper_arm_R_001", "DEF-upper_arm_R", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-forearm_R", "DEF-upper_arm_R_001", [-EPS, -EPS, -ELBOW], [EPS, EPS, EPS]],
			["DEF-forearm_R_001", "DEF-forearm_R", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-hand_R", "DEF-forearm_R_001", [-HAND_BEND, -HAND_TWIST, -HAND_TWIST], [HAND_BEND, HAND_TWIST, HAND_TWIST]],
			
			["DEF-shoulder_L", "DEF-spine_003", [-COLLAR, -COLLAR, -COLLAR], [COLLAR, COLLAR, COLLAR]],
			["DEF-upper_arm_L", "DEF-shoulder_L", [-SHLDR, -EPS, -SHLDR], [SHLDR, EPS, SHLDR]],
			["DEF-upper_arm_L_001", "DEF-upper_arm_L", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-forearm_L", "DEF-upper_arm_L_001", [-EPS, -EPS, -ELBOW], [EPS, EPS, EPS]],
			["DEF-forearm_L_001", "DEF-forearm_L", [-EPS, -ARMLEG_TWIST, -EPS], [EPS, ARMLEG_TWIST, EPS]],
			["DEF-hand_L", "DEF-forearm_L_001", [-HAND_BEND, -HAND_TWIST, -HAND_TWIST], [HAND_BEND, HAND_TWIST, HAND_TWIST]],
		]
	}
};

export { jointData }