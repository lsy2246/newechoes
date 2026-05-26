import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const homeDioramaAstro = readFileSync("src/components/home/HomeDiorama.astro", "utf8");
const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");

test("home 3D scene is a desk figure object with the 2D story kept on the monitor", () => {
  assert.match(dioramaTs, /const deskFigure = new THREE\.Group\(\);/);
  assert.match(dioramaTs, /deskFigure\.name = "deskFigure";/);
  assert.match(dioramaTs, /const monitorScreen = laptop;/);
  assert.match(dioramaTs, /const screenHalfW = screenFaceW \/ 2;/);
  assert.match(dioramaTs, /const screenHalfH = screenFaceH \/ 2;/);

  assert.doesNotMatch(dioramaTs, /route: "\/(articles|projects|about)"/);
  assert.doesNotMatch(dioramaTs, /monitorBackMount/);

  for (const retiredObject of [
    "hiddenEnvironmentObjects",
    "const ceiling",
    "const leftWall",
    "const rightWall",
    "const winFrame",
    "const windowHitbox",
    "const skyPlane",
    "const cloudsGroup",
    "const lamp",
    "const bookStack",
    "const notebook",
    "const plant",
    "const tv",
  ]) {
    assert.doesNotMatch(dioramaTs, new RegExp(retiredObject));
  }
});

test("home 3D desk figure has no hover bob or object tooltips", () => {
  assert.doesNotMatch(dioramaTs, /const raycaster = new THREE\.Raycaster\(\);/);
  assert.doesNotMatch(dioramaTs, /const hitTest = /);
  assert.doesNotMatch(dioramaTs, /Hover bob/);
  assert.doesNotMatch(dioramaTs, /bobY/);
  assert.doesNotMatch(dioramaTs, /tooltip\.textContent/);
  assert.doesNotMatch(dioramaTs, /canvasEl\.style\.cursor = hit \? "pointer" : "grab";/);
  assert.match(dioramaTs, /canvasEl\.removeEventListener\("pointermove", pointerMoveHandler\);/);
  assert.doesNotMatch(dioramaTs, /canvasEl\.removeEventListener\("pointermove", pointerMove\);/);
});

test("home 3D monitor keeps the 2D final story visible above the black frame", () => {
  assert.match(dioramaTs, /mats\.screen = new THREE\.MeshBasicMaterial\(\{\s*map: screenTexture,\s*toneMapped: false,\s*depthWrite: false,\s*depthTest: true,/);
  assert.match(dioramaTs, /screenFace\.position\.set\(0, screenPreset\.screenFaceYOffset, 0\.018\);/);
  assert.match(dioramaTs, /screenFace\.renderOrder = 1;/);
  assert.match(dioramaTs, /let lastTexturedStoryProgress = -1;/);
  assert.match(dioramaTs, /const textureStoryInput = updateTexture && renderMode === "room"\s*\?\s*\{ \.\.\.storyInput, progress: 1 \}\s*:\s*storyInput;/);
  assert.match(dioramaTs, /drawHomeScreenStory\(ctx, textureStoryInput\);/);
  assert.match(dioramaTs, /lastTexturedStoryProgress = textureStoryInput\.progress;/);
  assert.match(dioramaTs, /if \(renderMode === "room" && lastTexturedStoryProgress < 0\.999\) needScreenRedraw = true;/);
});

test("home 3D monitor texture respects scene depth so it cannot overlay the head", () => {
  assert.match(dioramaTs, /mats\.screen = new THREE\.MeshBasicMaterial\(\{\s*map: screenTexture,\s*toneMapped: false,\s*depthWrite: false,\s*depthTest: true,/);
  assert.match(dioramaTs, /screenFace\.renderOrder = 1;/);
});

test("home 3D scene uses white office objects with a colored figure", () => {
  assert.match(dioramaTs, /floor: 0xf2f3f2,/);
  assert.match(dioramaTs, /wall: 0xffffff,/);
  assert.match(dioramaTs, /deskTop: 0xf8f8f6,/);
  assert.match(dioramaTs, /chairShell: 0xf1f2f0,/);
  assert.match(dioramaTs, /personCloth: 0xff7a59,/);
  assert.match(dioramaTs, /personPants: 0x20a7b8,/);
  assert.match(dioramaTs, /personShoe: 0x23272b,/);
  assert.doesNotMatch(dioramaTs, /personCloth: 0x4a6a8a,/);
  assert.doesNotMatch(dioramaTs, /lampShade: 0xe4a94a,/);
  assert.doesNotMatch(dioramaTs, /tvEmissive: 0xff8866,/);
});

test("home 3D desk figure uses soft product-style materials and rounded furniture", () => {
  assert.match(dioramaTs, /deskTop: new THREE\.MeshStandardMaterial\(\{ color: 0xf8f8f6, roughness: 0\.58/);
  assert.match(dioramaTs, /chairShell: new THREE\.MeshStandardMaterial\(\{ color: 0xf1f2f0, roughness: 0\.62/);
  assert.match(dioramaTs, /computerShell: new THREE\.MeshStandardMaterial\(\{ color: 0xf5f6f4, roughness: 0\.52/);
  assert.doesNotMatch(dioramaTs, /personSkin: new THREE\.MeshStandardMaterial\([^\n]*flatShading/);
  assert.doesNotMatch(dioramaTs, /personHair: new THREE\.MeshStandardMaterial\([^\n]*flatShading/);
  assert.doesNotMatch(dioramaTs, /personCloth: new THREE\.MeshStandardMaterial\([^\n]*flatShading/);
  assert.doesNotMatch(dioramaTs, /personPants: new THREE\.MeshStandardMaterial\([^\n]*flatShading/);
  assert.match(dioramaTs, /const makeChairRod = \(start: THREE\.Vector3, end: THREE\.Vector3, radius = 0\.014\) => \{/);
  assert.match(dioramaTs, /const chairSeat = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(0\.6, 0\.064, 0\.64, 8, 0\.05\),\s*mats\.chairShell,/);
  assert.match(dioramaTs, /chairSeat\.position\.set\(0, -0\.092, 0\.095\);/);
  assert.match(dioramaTs, /const chairUnderFrame = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(0\.52, 0\.032, 0\.5, 5, 0\.012\),\s*mats\.deskLeg,/);
  assert.match(dioramaTs, /const chairBack = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(0\.54, 0\.62, 0\.07, 8, 0\.055\),\s*mats\.chairShell,/);
  assert.match(dioramaTs, /chairBack\.position\.set\(0, 0\.2, 0\.39\);/);
  assert.match(dioramaTs, /chairBack\.rotation\.x = 0\.08;/);
  assert.match(dioramaTs, /new THREE\.Vector3\(0\.235 \* side, -0\.5, 0\.34\),/);
  assert.match(dioramaTs, /new THREE\.Vector3\(0\.235 \* side, 0\.48, 0\.43\),/);
  assert.match(dioramaTs, /chairBackCrossbar\.position\.set\(0, -0\.02, 0\.39\);/);
  assert.match(dioramaTs, /const lpBase = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(lpBaseW, lpBaseH, lpBaseD, 8, 0\.035\),\s*mats\.computerShell,/);
});

test("home 3D desk figure keeps monitor hardware behind the keyboard and bends arms clear of the computer", () => {
  assert.match(dioramaTs, /const desktopKeyboardInset = -0\.01;/);
  assert.match(dioramaTs, /const kbD = rows \* keyD \+ \(rows - 1\) \* keyGapZ;/);
  assert.match(dioramaTs, /const kbFullD = rows \* \(keyD \+ keyGapZ\) \+ keyD;/);
  assert.match(dioramaTs, /const kbZ0 = useMobileCarrier \? 0\.17 : desktopKeyboardDeckZ - kbFullD \/ 2 \+ desktopKeyboardInset;/);
  assert.match(dioramaTs, /const keyH = useMobileCarrier \? 0\.014 : 0\.01;/);
  assert.match(dioramaTs, /const monitorStandFootH = 0\.032;/);
  assert.match(dioramaTs, /const desktopMonitorY = 0\.09;/);
  assert.match(dioramaTs, /const desktopMonitorZ = -0\.4;/);
  assert.match(dioramaTs, /let desktopMonitorRearAnchorPoint: THREE\.Vector3 \| null = null;/);
  assert.match(dioramaTs, /const desktopRearAnchorY = screenPreset\.screenFaceYOffset - lpScreenH \* 0\.08;/);
  assert.match(dioramaTs, /const desktopRearAnchorZ = screenPreset\.screenBodyOffsetZ - lpScreenT \/ 2 - 0\.014;/);
  assert.match(dioramaTs, /desktopMonitorRearAnchorPoint = desktopRearAnchorLocal/);
  assert.match(dioramaTs, /\.applyEuler\(lpScreenGroup\.rotation\)/);
  assert.match(dioramaTs, /const monitorRearAnchorZ = desktopMonitorRearAnchorPoint\?\.z \?\? -0\.48;/);
  assert.match(dioramaTs, /const monitorStandZ = monitorRearAnchorZ - 0\.105;/);
  assert.match(dioramaTs, /const desktopKeyboardDeckZ = 0\.58;/);
  assert.match(dioramaTs, /const monitorStandTopY = desktopMonitorRearAnchorPoint\?\.y \?\? 0\.42;/);
  assert.match(dioramaTs, /monitorStandPost\.position\.set\(0, monitorStandFootH \+ monitorStandPostH \/ 2, monitorStandZ\);/);
  assert.match(dioramaTs, /monitorStandFoot\.position\.set\(0, monitorStandFootH \/ 2, monitorStandZ \+ 0\.045\);/);
  assert.match(dioramaTs, /const monitorBackSupportPlate = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /monitorBackSupportPlate\.name = "monitorBackSupportPlate";/);
  assert.match(dioramaTs, /const monitorBackSupportHub = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const monitorRearSupportArm = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /monitorRearSupportArm\.name = "monitorRearSupportArm";/);
  assert.doesNotMatch(dioramaTs, /monitorStandSaddle/);
  assert.match(dioramaTs, /lpScreenGroup\.position\.set\(0, desktopMonitorY, desktopMonitorZ\);/);
  assert.match(dioramaTs, /lpBase\.position\.set\(0, lpBaseH \/ 2 \+ 0\.002, useMobileCarrier \? 0\.12 : desktopKeyboardDeckZ\);/);
  assert.match(dioramaTs, /const sleeveExitLocal = new THREE\.Vector3\(0\.052 \* side, 0\.335, -0\.245\);/);
  assert.match(dioramaTs, /const bentSleeve = makeBentSleeve\(\[shoulderLocal, sleeveExitLocal, elbowLocal, wristLocal\], 0\.034, mats\.personCloth\);/);
  assert.match(dioramaTs, /const elbowBlend = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /hand\.position\.copy\(wristLocal\)\.add\(new THREE\.Vector3\(0\.015 \* side, -0\.006, -0\.02\)\);/);
  assert.doesNotMatch(dioramaTs, /arm\.elbowGroup\.rotation\.x = 0\.28 - ai\.dipValue;/);
  assert.doesNotMatch(dioramaTs, /arm\.elbowGroup\.rotation\.x = 0\.32 - ai\.dipValue;/);
  assert.match(dioramaTs, /person\.position\.set\(0, 0, 0\.58\);/);
});

test("home 3D desk figure uses a volumetric stylized seated person", () => {
  assert.match(dioramaTs, /const makeBone = \(/);
  assert.match(dioramaTs, /const makeBentSleeve = \(/);
  assert.match(dioramaTs, /new THREE\.TubeGeometry\(curve, 20, radius, 12, false\)/);
  assert.match(dioramaTs, /const torsoShell = new THREE\.Mesh\(\s*new THREE\.CapsuleGeometry\(0\.205, 0\.38, 10, 20\),\s*mats\.personCloth,/);
  assert.match(dioramaTs, /const lapBlend = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const headGroup = new THREE\.Group\(\);/);
  assert.match(dioramaTs, /headGroup\.position\.set\(0, 0\.795, -0\.018\);/);
  assert.match(dioramaTs, /const head = new THREE\.Mesh\(\s*new THREE\.SphereGeometry\(0\.148, 24, 16\),\s*mats\.personSkin,/);
  assert.match(dioramaTs, /const hairCap = new THREE\.Mesh\(\s*new THREE\.SphereGeometry\(0\.162, 28, 14\),\s*mats\.personHair,/);
  assert.match(dioramaTs, /const frontHairBand = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const sideHair = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const backHair = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const faceNose = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /new THREE\.ConeGeometry\(0\.018, 0\.04, 8\)/);
  assert.match(dioramaTs, /const visibleEar = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const leftEye = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const rightEye = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const mouth = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /hairCap\.position\.set\(0, 0\.035, 0\);/);
  assert.match(dioramaTs, /faceNose\.rotation\.x = -Math\.PI \/ 2;/);
  assert.match(dioramaTs, /person\.rotation\.set\(0, -0\.12, 0\);/);
  assert.doesNotMatch(dioramaTs, /const makeProfileSlab = \(/);
  assert.doesNotMatch(dioramaTs, /THREE\.ShapeUtils\.triangulateShape/);
  assert.match(dioramaTs, /person\.scale\.set\(0\.95, 1, 0\.95\);/);
});

test("home 3D desk figure balances the plinth around the desk and seated person", () => {
  assert.match(dioramaTs, /new RoundedBoxGeometry\(3\.35, 0\.12, 3\.32, 6, 0\.035\)/);
  assert.match(dioramaTs, /floor\.position\.set\(0, roomFloorY - 0\.06, -0\.105\);/);
  assert.match(dioramaTs, /const deskW = 2\.45;/);
  assert.match(dioramaTs, /const deskD = useMobileCarrier \? 1\.12 : 1\.74;/);
  assert.doesNotMatch(dioramaTs, /const deskW = 3;/);
});

test("home 3D desk figure avoids visible ball-joint assembly on the seated person", () => {
  assert.match(dioramaTs, /const leftArm = makeDeskArm\(-1\);/);
  assert.match(dioramaTs, /const rightArm = makeDeskArm\(1\);/);
  assert.match(dioramaTs, /const leftLeg = makeSeatedLeg\(-1\);/);
  assert.match(dioramaTs, /const rightLeg = makeSeatedLeg\(1\);/);
  assert.doesNotMatch(dioramaTs, /const hairStrands = new THREE\.Group\(\);/);
  assert.doesNotMatch(dioramaTs, /const fingers = new THREE\.Group\(\);/);
  assert.doesNotMatch(dioramaTs, /const shoulderGeo = new THREE\.SphereGeometry/);
  assert.doesNotMatch(dioramaTs, /const elbowSphere = new THREE\.Mesh/);
  assert.doesNotMatch(dioramaTs, /const wrist = new THREE\.Mesh\(\s*new THREE\.SphereGeometry/);
  assert.doesNotMatch(dioramaTs, /const knee = new THREE\.Mesh\(\s*new THREE\.SphereGeometry/);
  assert.doesNotMatch(dioramaTs, /const elbowBlend = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(0\.088, 0\.066, 0\.082/);
  assert.doesNotMatch(dioramaTs, /const upperArm = makeSleeve/);
  assert.doesNotMatch(dioramaTs, /const forearm = makeSleeve/);
});

test("home 3D desk figure blends the seated character into clear body masses", () => {
  assert.match(dioramaTs, /bodyGroup\.position\.z = 0\.018;/);
  assert.match(dioramaTs, /torsoShell\.scale\.set\(0\.94, 1\.02, 0\.72\);/);
  assert.match(dioramaTs, /const pelvis = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const lapBlend = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const neck = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const pantLeg = makeBentSleeve\(\[hipLocal, kneeLocal, ankleLocal\], 0\.062, mats\.personPants\);/);
  assert.match(dioramaTs, /torso\.rotation\.x = 0\.035;/);
  assert.match(dioramaTs, /torso\.rotation\.x = 0\.035 \+ Math\.sin\(now \* 0\.00032\) \* 0\.004;/);
  assert.match(dioramaTs, /bodyGroup\.rotation\.x = 0\.045 \+ Math\.sin\(now \* 0\.00035\) \* 0\.006;/);
  assert.doesNotMatch(dioramaTs, /const shoulderBlend = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const shirtHem = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const sideTorsoPanel = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const shoulderSleeve = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const kneeBlend = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const ankleCuff = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /bodyGroup\.rotation\.y = Math\.sin\(now \* 0\.0003\) \* 0\.012;/);
  assert.doesNotMatch(dioramaTs, /const shoulders = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(0\.48, 0\.12, 0\.16/);
  assert.doesNotMatch(dioramaTs, /const shoulderCape = new THREE\.Mesh/);
  assert.doesNotMatch(dioramaTs, /const hairFringe = /);
});

test("home 3D desk figure can replace the fallback figure with the Sketchfab typing character", () => {
  assert.match(dioramaTs, /import \{ GLTFLoader \} from "three\/addons\/loaders\/GLTFLoader\.js";/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_URL = "\/models\/home\/typing-character\.glb";/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_ATTRIBUTION =\s*"Typing character by Gagana Geesara Perera, character by Yury Misiyuk, CC BY 4\.0";/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_SOURCE =\s*"https:\/\/sketchfab\.com\/3d-models\/typing-character-c08db34e77274c5daa5612406f254a27";/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_TARGET_HEIGHT = 1\.72;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_MOBILE_TARGET_HEIGHT = 1\.38;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_FORWARD_LEAN_X = 0\.22;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_FLOOR_Y = -0\.518;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_SEAT_Z_OFFSET = -0\.02;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_TYPING_LOOP_START = 13\.5;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_TYPING_LOOP_END = 15\.08;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_HIP_LIFT_Y = 0\.16;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_CORRECTIVE_POSE = \[/);
  assert.match(dioramaTs, /\["mixamorigHips_00", 0\.075, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigLeftUpLeg_055", -0\.03, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigRightUpLeg_060", -0\.03, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigLeftLeg_056", -0\.06, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigRightLeg_061", -0\.06, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigLeftFoot_057", -0\.03, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigRightFoot_062", -0\.03, 0, 0\]/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_FINGER_CURL_BONE_NAMES = \[/);
  assert.match(dioramaTs, /const fallbackPersonBody = new THREE\.Group\(\);/);
  assert.match(dioramaTs, /fallbackPersonBody\.name = "fallbackVolumetricPersonBody";/);
  assert.match(dioramaTs, /const typingCharacterMount = new THREE\.Group\(\);/);
  assert.match(dioramaTs, /typingCharacterMount\.name = "typingCharacterModelMount";/);
  assert.match(dioramaTs, /const typingCharacterCorrectivePose: \{ bone: THREE\.Object3D; rotation: THREE\.Quaternion \}\[] = \[];/);
  assert.match(dioramaTs, /const typingCharacterFingerCurlPose: \{ bone: THREE\.Object3D; rotation: THREE\.Quaternion \}\[] = \[];/);
  assert.match(dioramaTs, /const bindTypingCharacterCorrectivePose = \(model: THREE\.Object3D\) => \{/);
  assert.match(dioramaTs, /const applyTypingCharacterCorrectivePose = \(\) => \{/);
  assert.match(dioramaTs, /typingCharacterHipLiftBone\.position\.y \+= TYPING_CHARACTER_HIP_LIFT_Y;/);
  assert.match(dioramaTs, /const gltfLoader = new GLTFLoader\(\);/);
  assert.match(dioramaTs, /gltfLoader\.load\(\s*TYPING_CHARACTER_MODEL_URL,/);
  assert.match(dioramaTs, /model\.name = "typingCharacterSketchfabModel";/);
  assert.match(dioramaTs, /fitTypingCharacterModel\(model\);/);
  assert.match(dioramaTs, /bindTypingCharacterCorrectivePose\(model\);/);
  assert.match(dioramaTs, /model\.rotation\.set\(TYPING_CHARACTER_MODEL_FORWARD_LEAN_X, TYPING_CHARACTER_MODEL_FACING_ROTATION_Y, 0\);/);
  assert.match(dioramaTs, /-typingCharacterBounds\.min\.y \+ TYPING_CHARACTER_MODEL_FLOOR_Y,/);
  assert.match(dioramaTs, /-typingCharacterCenter\.z \+ \(useMobileCarrier \? -0\.03 : TYPING_CHARACTER_MODEL_SEAT_Z_OFFSET\),/);
  assert.match(dioramaTs, /typingCharacterMixer\.setTime\(typingCharacterLoopTime\);/);
  assert.match(dioramaTs, /applyTypingCharacterCorrectivePose\(\);/);
  assert.match(dioramaTs, /typingCharacterMount\.add\(model\);/);
  assert.match(dioramaTs, /typingCharacterMount\.visible = true;/);
  assert.match(dioramaTs, /fallbackPersonBody\.visible = false;/);
  assert.match(dioramaTs, /typingCharacterMixer = new THREE\.AnimationMixer\(model\);/);
  assert.match(dioramaTs, /typingCharacterLoopTime \+= dt \/ 1000;/);
  assert.match(dioramaTs, /if \(typingCharacterLoopTime > TYPING_CHARACTER_TYPING_LOOP_END\) \{/);
  assert.match(dioramaTs, /typingCharacterMixer\.setTime\(typingCharacterLoopTime\);/);
  assert.match(dioramaTs, /syncTypingCharacterOpacity\(roomReveal\);/);
});

test("home diorama includes required attribution for the downloaded typing character asset", () => {
  assert.match(homeDioramaAstro, /class="diorama-asset-credit"/);
  assert.match(homeDioramaAstro, /Typing character/);
  assert.match(homeDioramaAstro, /Gagana Geesara Perera/);
  assert.match(homeDioramaAstro, /Yury Misiyuk/);
  assert.match(homeDioramaAstro, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(dioramaCss, /\.diorama-asset-credit \{/);
  assert.match(dioramaCss, /clip-path: inset\(50%\);/);
});

test("home 3D desk figure uses simple volumetric limbs instead of paper shards", () => {
  assert.match(dioramaTs, /const makeSeatedLeg = \(side: -1 \| 1\) => \{/);
  assert.match(dioramaTs, /const hipLocal = new THREE\.Vector3\(0\.088 \* side, 0\.005, -0\.08\);/);
  assert.match(dioramaTs, /const kneeLocal = new THREE\.Vector3\(0\.096 \* side, -0\.112, -0\.318\);/);
  assert.match(dioramaTs, /const ankleLocal = new THREE\.Vector3\(0\.096 \* side, -0\.46, -0\.318\);/);
  assert.match(dioramaTs, /legGroup\.add\(pantLeg\);/);
  assert.match(dioramaTs, /shoe\.position\.set\(0\.09 \* side, -0\.492, -0\.37\);/);
  assert.match(dioramaTs, /const makeDeskArm = \(side: -1 \| 1\) => \{/);
  assert.match(dioramaTs, /const shoulderLocal = new THREE\.Vector3\(0\.018 \* side, 0\.36, -0\.02\);/);
  assert.match(dioramaTs, /const sleeveExitLocal = new THREE\.Vector3\(0\.052 \* side, 0\.335, -0\.245\);/);
  assert.match(dioramaTs, /const elbowLocal = new THREE\.Vector3\(0\.12 \* side, 0\.285, -0\.335\);/);
  assert.match(dioramaTs, /const wristLocal = new THREE\.Vector3\(0\.1 \* side, 0\.285, -0\.5\);/);
  assert.match(dioramaTs, /armGroup\.add\(bentSleeve\);/);
  assert.doesNotMatch(dioramaTs, /new THREE\.BufferGeometry\(\)/);
  assert.match(dioramaTs, /person\.position\.set\(0, 0, 0\.58\);/);
});

test("home 3D desk figure keeps the monitor from overpowering the seated person", () => {
  assert.match(dioramaTs, /screen: \{ w: 1\.24, h: 0\.68, t: 0\.024 \},/);
  assert.match(dioramaTs, /const lpBaseW = useMobileCarrier \? 1\.18 : 1\.04;/);
  assert.match(dioramaTs, /const lpBaseD = useMobileCarrier \? 0\.32 : 0\.44;/);
  assert.match(dioramaTs, /const lpBaseH = useMobileCarrier \? 0\.028 : 0\.018;/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(0\.34, 0\.24, 0\.028, 6, 0\.018\),\s*mats\.computerShell,/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(0\.13, 0\.052, monitorSupportArmDepth, 6, 0\.018\),\s*mats\.computerShell,/);
  assert.doesNotMatch(dioramaTs, /monitorStandClamp/);
  assert.doesNotMatch(dioramaTs, /monitorBackPlate/);
  assert.doesNotMatch(dioramaTs, /monitorStandCollar/);
  assert.doesNotMatch(dioramaTs, /new RoundedBoxGeometry\(0\.22, 0\.12, 0\.035/);
  assert.doesNotMatch(dioramaTs, /new RoundedBoxGeometry\(0\.3, 0\.046, 0\.075/);
});

test("home 3D desk figure presents the final scene from a side-profile angle", () => {
  assert.match(dioramaTs, /roomCameraTarget\.set\(0\.02, 0\.38, -0\.18\);/);
  assert.match(dioramaTs, /useMobileCarrier \? 0\.68 : 3\.05,/);
  assert.match(dioramaTs, /useMobileCarrier \? 1\.26 : 1\.1,/);
  assert.match(dioramaTs, /useMobileCarrier \? 3\.7 : 0\.42,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 0\.36 : 0\.72,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 4\.0 : 3\.62,/);
});
