import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const homeDioramaAstro = readFileSync("src/components/home/HomeDiorama.astro", "utf8");
const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");
const homeScreenStoryTs = readFileSync("src/components/home/homeScreenStory.ts", "utf8");

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
  assert.match(dioramaTs, /mats\.screen = new THREE\.MeshBasicMaterial\(\{\s*map: screenTexture,\s*toneMapped: false,\s*depthWrite: true,\s*depthTest: true,/);
  assert.match(dioramaTs, /screenFace\.position\.set\(0, screenPreset\.screenFaceYOffset, 0\.018\);/);
  assert.match(dioramaTs, /screenFace\.renderOrder = 1;/);
  assert.match(dioramaTs, /let lastTexturedStoryProgress = -1;/);
  assert.match(dioramaTs, /const textureStoryInput = updateTexture && renderMode === "room"\s*\?\s*storyInput\s*:\s*\{ \.\.\.storyInput, revealCenterDiorama: false \};/);
  assert.match(dioramaTs, /drawHomeScreenStory\(ctx, textureStoryInput\);/);
  assert.match(dioramaTs, /lastTexturedStoryProgress = textureStoryInput\.progress;/);
  assert.match(dioramaTs, /if \(needScreenRedraw\) \{\s*needScreenRedraw = false;\s*drawScreen\(undefined, now\);/);
});

test("home 3D monitor texture respects scene depth so it cannot overlay the head", () => {
  assert.match(dioramaTs, /mats\.screen = new THREE\.MeshBasicMaterial\(\{\s*map: screenTexture,\s*toneMapped: false,\s*depthWrite: true,\s*depthTest: true,/);
  assert.match(dioramaTs, /screenFace\.renderOrder = 1;/);
});

test("home 3D scene uses fixed light office materials in both themes", () => {
  assert.match(dioramaTs, /const DESK_TOP_FIXED_COLOR = 0xf8f8f6;/);
  assert.match(dioramaTs, /const FLOOR_FIXED_COLOR = DESK_TOP_FIXED_COLOR;/);
  assert.match(dioramaTs, /const COMPUTER_FIXED_GREY = DESK_TOP_FIXED_COLOR;/);
  assert.match(dioramaTs, /wall: 0xffffff,/);
  assert.match(dioramaTs, /mats\.floor\.color\.setHex\(FLOOR_FIXED_COLOR\);/);
  assert.match(dioramaTs, /mats\.deskTop\.color\.setHex\(DESK_TOP_FIXED_COLOR\);/);
  assert.match(dioramaTs, /mats\.screen\.color\.setHex\(useMobileCarrier \? mobileScreenTint : 0xffffff\);/);
  assert.doesNotMatch(dioramaTs, /personCloth: 0x4a6a8a,/);
});

test("home 3D desk figure uses soft product-style materials and rounded furniture", () => {
  assert.match(dioramaTs, /deskTop: new THREE\.MeshStandardMaterial\(\{ color: DESK_TOP_FIXED_COLOR, roughness: 0\.58/);
  assert.match(dioramaTs, /chairShell: 0xf1f2f0,/);
  assert.match(dioramaTs, /chairShell: new THREE\.MeshStandardMaterial\(\{ color: 0xf1f2f0, roughness: 0\.62/);
  assert.match(dioramaTs, /computerShell: new THREE\.MeshStandardMaterial\(\{ color: COMPUTER_FIXED_GREY, roughness: 0\.58/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(floorW, 0\.12, floorD, 6, 0\.035\)/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(deskW, deskTopH, deskD, 9, 0\.055\)/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(chairSeatW, chairSeatH, chairSeatD, 8, 0\.045\)/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(chairBackW, chairBackH, chairBackT, 8, 0\.04\)/);
});

test("home 3D desk figure keeps monitor hardware behind the keyboard and bends arms clear of the computer", () => {
  assert.match(dioramaTs, /const desktopKeyboardInset = -0\.01;/);
  assert.match(dioramaTs, /keyboardModelMount\.name = "keyboardModelMount";/);
  assert.match(dioramaTs, /model\.name = "keyboardGlbModel";/);
  assert.match(dioramaTs, /const monitorStandFootH = 0\.032;/);
  assert.match(dioramaTs, /const desktopMonitorY = 0\.09;/);
  assert.match(dioramaTs, /const desktopMonitorZ = 0\.14;/);
  assert.match(dioramaTs, /let desktopMonitorRearAnchorPoint: THREE\.Vector3 \| null = null;/);
  assert.match(dioramaTs, /desktopMonitorRearAnchorPoint = desktopRearAnchorLocal/);
  assert.match(dioramaTs, /const monitorRearAnchorZ = desktopMonitorRearAnchorPoint\?\.z \?\? -0\.48;/);
  assert.match(dioramaTs, /const monitorStandZ = monitorRearAnchorZ - 0\.105;/);
  assert.match(dioramaTs, /const desktopKeyboardDeckZ = 0\.58;/);
  assert.match(dioramaTs, /const monitorBackSupportPlate = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /monitorBackSupportPlate\.name = "monitorBackSupportPlate";/);
  assert.match(dioramaTs, /const monitorBackSupportHub = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const monitorRearSupportArm = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /monitorRearSupportArm\.name = "monitorRearSupportArm";/);
  assert.match(dioramaTs, /lpScreenGroup\.position\.set\(0, desktopMonitorY, desktopMonitorZ\);/);
  assert.match(dioramaTs, /person\.position\.set\(0, 0, 0\.58\);/);
});

test("home 3D desk figure uses the GLB typing character as the seated person", () => {
  assert.match(dioramaTs, /const typingCharacterMount = new THREE\.Group\(\);/);
  assert.match(dioramaTs, /typingCharacterMount\.name = "typingCharacterModelMount";/);
  assert.match(dioramaTs, /model\.name = "typingCharacterSketchfabModel";/);
  assert.match(dioramaTs, /applyTypingCharacterLegProportions\(model\);/);
  assert.match(dioramaTs, /tuneTypingCharacterMaterial\(mat\);/);
  assert.match(dioramaTs, /typingCharacterMount\.visible = true;/);
  assert.match(dioramaTs, /syncTypingCharacterOpacity\(renderMode === "story" && !useMobileCarrier \? 1 : 0\);/);
  assert.doesNotMatch(dioramaTs, /const makeProfileSlab = \(/);
  assert.doesNotMatch(dioramaTs, /THREE\.ShapeUtils\.triangulateShape/);
  assert.match(dioramaTs, /person\.scale\.set\(0\.95, 1, 0\.95\);/);
});

test("home 3D desk figure balances the plinth around the desk and seated person", () => {
  assert.match(dioramaTs, /const floorW = useMobileCarrier \? 2\.15 : 2\.68;/);
  assert.match(dioramaTs, /const floorD = useMobileCarrier \? 2\.08 : 2\.52;/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(floorW, 0\.12, floorD, 6, 0\.035\)/);
  assert.match(dioramaTs, /floor\.position\.set\(0, roomFloorY - 0\.06, -0\.105\);/);
  assert.match(dioramaTs, /const deskW = useMobileCarrier \? 1\.66 : 2\.02;/);
  assert.match(dioramaTs, /const deskD = useMobileCarrier \? 1\.02 : 1\.34;/);
  assert.doesNotMatch(dioramaTs, /const deskW = 3;/);
});

test("home first-screen diorama removes the old desk caption and restores the centered lsy hero", () => {
  assert.doesNotMatch(dioramaTs, /lsyLabel/);
  assert.match(homeScreenStoryTs, /ctx\.fillText\("lsy", titleX, dioramaTitleY\);/);
  assert.match(homeScreenStoryTs, /ctx\.textAlign = "center";/);
  assert.doesNotMatch(homeScreenStoryTs, /inside the desk/);
  assert.doesNotMatch(homeScreenStoryTs, /drawEditorialRule\(railX/);
});

test("home first-screen diorama keeps lsy as the centered hero while the model stays subordinate", () => {
  assert.match(homeScreenStoryTs, /const dioramaTitleX = centerX \+ stageW \* 0\.015;/);
  assert.match(homeScreenStoryTs, /const dioramaCoreX = dioramaTitleX;/);
  assert.match(homeScreenStoryTs, /const dioramaFocusGuardX = clamp\(stageW \* 0\.15, 158 \* unit, 220 \* unit\);/);
  assert.match(homeScreenStoryTs, /const horizontalArc = clamp\(Math\.abs\(toX - fromX\) \* 0\.08, 18 \* unit, 46 \* unit\);/);
  assert.doesNotMatch(homeScreenStoryTs, /const dioramaTrackTargets = \[/);
  assert.match(homeScreenStoryTs, /const drawDioramaIdentityPanel = \(alpha: number\) => \{/);
  assert.doesNotMatch(homeScreenStoryTs, /rawProgress/);
  assert.match(homeScreenStoryTs, /drawDesktopStory\(ctx, input, palette, progress, layoutWidth, layoutHeight\);/);
  assert.match(homeScreenStoryTs, /ctx\.fillText\("lsy", titleX, dioramaTitleY\);/);
  assert.match(homeScreenStoryTs, /ctx\.fillText\("today in echoes", titleX, dioramaTitleY \+ 84 \* unit\);/);
  assert.match(homeScreenStoryTs, /ctx\.textAlign = "center";/);
  assert.match(homeScreenStoryTs, /const mindOffsets = \[/);
  assert.match(homeScreenStoryTs, /const dioramaMindOffsets = \[/);
  assert.match(homeScreenStoryTs, /\{ x: stageW \* 0\.32, y: height \* 0\.04 \},/);
  assert.match(homeScreenStoryTs, /const relationAlpha = \(1 - phase\(progress, 0\.16, 0\.22\)\) \* \(1 - classify\);/);
  assert.match(homeScreenStoryTs, /const orbit: Rect = \{/);
  assert.match(homeScreenStoryTs, /const collected = moveRect\(orbit, inputRects\[index\], gather\);/);
  assert.match(homeScreenStoryTs, /const panelAlpha = alpha;/);
  assert.match(homeScreenStoryTs, /drawDioramaIdentityPanel\(\(1 - classify\) \* \(1 - phase\(progress, 0\.16, 0\.24\)\)\);/);
});

test("home first-screen diorama hands directly into the 2D input story", () => {
  assert.match(homeScreenStoryTs, /const dioramaHandoff = dioramaMode \? phase\(progress, 0\.08, 0\.24\) : 1;/);
  assert.doesNotMatch(homeScreenStoryTs, /dioramaInputRects/);
  assert.match(homeScreenStoryTs, /const collected = moveRect\(orbit, inputRects\[index\], gather\);/);
  assert.match(homeScreenStoryTs, /const classify = phase\(progress, 0\.34, 0\.56\);/);
  assert.match(homeScreenStoryTs, /const inputHeaderAlpha = phase\(progress, 0\.16, 0\.26\) \* inputHeaderReadability;/);
  assert.doesNotMatch(dioramaTs, /rawProgress/);
});

test("home 3D desk figure avoids visible ball-joint assembly on the seated person", () => {
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

test("home 3D desk figure keeps the loaded character visually unified", () => {
  assert.match(dioramaTs, /const TYPING_CHARACTER_FIXED_COLOR = 0xe8e8e4;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_EMISSIVE_COLOR = 0x343432;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_LOWER_LEG_LENGTH_SCALE = 1\.14;/);
  assert.match(dioramaTs, /if \("roughness" in shadedMat\) shadedMat\.roughness = 0\.74;/);
  assert.match(dioramaTs, /if \("metalness" in shadedMat\) shadedMat\.metalness = 0;/);
  assert.doesNotMatch(dioramaTs, /const shoulderBlend = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const shirtHem = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const sideTorsoPanel = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const shoulderSleeve = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const kneeBlend = new THREE\.Mesh\(/);
  assert.doesNotMatch(dioramaTs, /const ankleCuff = new THREE\.Mesh\(/);
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
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_FLOOR_Y = -0\.5;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_MODEL_SEAT_Z_OFFSET = -0\.02;/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_CORRECTIVE_POSE = \[/);
  assert.match(dioramaTs, /\["mixamorigSpine_01", -0\.015, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigLeftUpLeg_055", -0\.24, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigRightUpLeg_060", -0\.24, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigLeftLeg_056", 0\.16, 0, 0\]/);
  assert.match(dioramaTs, /\["mixamorigRightLeg_061", 0\.16, 0, 0\]/);
  assert.match(dioramaTs, /const TYPING_CHARACTER_FINGER_CURL_BONE_NAMES = \[/);
  assert.match(dioramaTs, /const typingCharacterMount = new THREE\.Group\(\);/);
  assert.match(dioramaTs, /typingCharacterMount\.name = "typingCharacterModelMount";/);
  assert.match(dioramaTs, /const typingCharacterCorrectivePose: \{ bone: THREE\.Object3D; rotation: THREE\.Quaternion \}\[] = \[];/);
  assert.match(dioramaTs, /const typingCharacterFingerCurlPose: \{ bone: THREE\.Object3D; rotation: THREE\.Quaternion \}\[] = \[];/);
  assert.match(dioramaTs, /const bindTypingCharacterCorrectivePose = \(model: THREE\.Object3D\) => \{/);
  assert.match(dioramaTs, /const applyTypingCharacterCorrectivePose = \(\) => \{/);
  assert.match(dioramaTs, /const gltfLoader = new GLTFLoader\(\);/);
  assert.match(dioramaTs, /gltfLoader\.load\(\s*TYPING_CHARACTER_MODEL_URL,/);
  assert.match(dioramaTs, /model\.name = "typingCharacterSketchfabModel";/);
  assert.match(dioramaTs, /fitTypingCharacterModel\(model\);/);
  assert.match(dioramaTs, /bindTypingCharacterCorrectivePose\(model\);/);
  assert.match(dioramaTs, /model\.rotation\.set\(TYPING_CHARACTER_MODEL_FORWARD_LEAN_X, TYPING_CHARACTER_MODEL_FACING_ROTATION_Y, 0\);/);
  assert.match(dioramaTs, /-typingCharacterBounds\.min\.y \+ TYPING_CHARACTER_MODEL_FLOOR_Y,/);
  assert.match(dioramaTs, /-typingCharacterCenter\.z \+ \(useMobileCarrier \? -0\.03 : TYPING_CHARACTER_MODEL_SEAT_Z_OFFSET\),/);
  assert.match(dioramaTs, /applyTypingCharacterCorrectivePose\(\);/);
  assert.match(dioramaTs, /typingCharacterMount\.add\(model\);/);
  assert.match(dioramaTs, /typingCharacterMount\.visible = true;/);
  assert.match(dioramaTs, /const typingCharacterMixer = new THREE\.AnimationMixer\(model\);/);
  assert.match(dioramaTs, /typingCharacterMixer\.setTime\(TYPING_CHARACTER_STATIC_POSE_TIME\);/);
  assert.match(dioramaTs, /syncTypingCharacterOpacity\(roomReveal\);/);
});

test("home diorama does not render model attribution in the page shell", () => {
  assert.doesNotMatch(homeDioramaAstro, /class="diorama-asset-credit"/);
  assert.doesNotMatch(homeDioramaAstro, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.doesNotMatch(dioramaCss, /\.diorama-asset-credit \{/);
});

test("home 3D desk figure uses a loaded character model instead of paper shards", () => {
  assert.match(dioramaTs, /gltfLoader\.load\(\s*TYPING_CHARACTER_MODEL_URL,/);
  assert.match(dioramaTs, /typingCharacterMount\.add\(model\);/);
  assert.match(dioramaTs, /model\.scale\.setScalar\(scale\);/);
  assert.doesNotMatch(dioramaTs, /new THREE\.BufferGeometry\(\)/);
  assert.doesNotMatch(dioramaTs, /const makeSeatedLeg = \(side: -1 \| 1\) => \{/);
  assert.doesNotMatch(dioramaTs, /const makeDeskArm = \(side: -1 \| 1\) => \{/);
  assert.match(dioramaTs, /person\.position\.set\(0, 0, 0\.58\);/);
});

test("home 3D desk figure keeps the monitor from overpowering the seated person", () => {
  assert.match(dioramaTs, /screen: \{ w: 1\.06, h: 0\.58, t: 0\.024 \},/);
  assert.match(dioramaTs, /const lpBaseH = useMobileCarrier \? 0\.022 : 0\.018;/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(0\.34, 0\.24, 0\.028, 6, 0\.018\),\s*mats\.computerShell,/);
  assert.match(dioramaTs, /new RoundedBoxGeometry\(0\.13, 0\.052, monitorSupportArmDepth, 6, 0\.018\),\s*mats\.computerShell,/);
  assert.doesNotMatch(dioramaTs, /monitorStandClamp/);
  assert.doesNotMatch(dioramaTs, /monitorBackPlate/);
  assert.doesNotMatch(dioramaTs, /monitorStandCollar/);
  assert.doesNotMatch(dioramaTs, /new RoundedBoxGeometry\(0\.22, 0\.12, 0\.035/);
  assert.doesNotMatch(dioramaTs, /new RoundedBoxGeometry\(0\.3, 0\.046, 0\.075/);
});

test("home 3D desk figure presents the final scene from an elevated rear angle", () => {
  assert.match(dioramaTs, /useMobileCarrier \? 0\.2 : 0\.28,/);
  assert.match(dioramaTs, /useMobileCarrier \? 0\.02 : 0\.04,/);
  assert.match(dioramaTs, /useMobileCarrier \? 1\.46 : 1\.88,/);
  assert.match(dioramaTs, /useMobileCarrier \? 0\.98 : 1\.46,/);
  assert.match(dioramaTs, /useMobileCarrier \? 2\.46 : 2\.78,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 0\.68 : 3\.05,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 1\.26 : 1\.1,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 3\.7 : 0\.42,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 0\.36 : 0\.72,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 4\.0 : 3\.62,/);
});

test("home first-screen 3D component stays small enough to support the lsy hero", () => {
  assert.match(dioramaTs, /const componentFov = useMobileCarrier \? 42 : 49;/);
  assert.match(dioramaTs, /const CENTER_DIORAMA_FADE_START = 0\.16;/);
  assert.match(dioramaTs, /const CENTER_DIORAMA_PROGRESS_END = 0\.24;/);
  assert.match(dioramaTs, /const centerDioramaProgress = clamp\(visualProgress \/ STORY_PROGRESS_END\);/);
  assert.match(dioramaTs, /const componentAlpha = 1 - easeInOutSine\(clamp\(\(centerDioramaProgress - CENTER_DIORAMA_FADE_START\) \/ \(CENTER_DIORAMA_PROGRESS_END - CENTER_DIORAMA_FADE_START\)\)\);/);
  assert.match(dioramaTs, /const componentLayout = renderMode === "loop" \? loopReturn : renderMode === "story" \? 1 : 0;/);
  assert.match(dioramaTs, /const componentScale = lerp\(1, useMobileCarrier \? 0\.2 : 0\.4, componentLayout\);/);
  assert.match(dioramaTs, /const componentX = \(useMobileCarrier \? 16\.5 : 6\.5\) \* componentLayout;/);
  assert.match(dioramaTs, /const componentY = \(useMobileCarrier \? -3\.5 : 2\.8\) \* componentLayout;/);
  assert.match(dioramaTs, /docEl\.style\.setProperty\("--component-scene-scale", componentScale\.toFixed\(4\)\);/);
  assert.doesNotMatch(dioramaTs, /const componentLayout = renderMode === "loop" \? loopReturn : componentAlpha;/);
  assert.doesNotMatch(dioramaTs, /componentAlpha > 0 \? 1 : 0/);
});

test("home 3D renderer sizes from the untransformed canvas box", () => {
  assert.match(dioramaTs, /const w = Math\.max\(1, canvasEl\.clientWidth \|\| window\.innerWidth\);/);
  assert.match(dioramaTs, /const h = Math\.max\(1, canvasEl\.clientHeight \|\| window\.innerHeight\);/);
  assert.doesNotMatch(dioramaTs, /const rect = canvasEl\.getBoundingClientRect\(\);\s*const w = Math\.max\(1, rect\.width/);
});

test("home 3D loop return camera is scrubbed with the component transform", () => {
  assert.match(dioramaTs, /const loopDesiredFov = getLoopCameraState\(homeProgress, desiredCameraPos, desiredCameraTarget\);\s*applyCameraPose\(loopDesiredFov, dt, true, LOOP_CAMERA_FOLLOW_RATE\);/);
  assert.doesNotMatch(dioramaTs, /const loopDesiredFov = getLoopCameraState\(homeProgress, desiredCameraPos, desiredCameraTarget\);\s*applyCameraPose\(loopDesiredFov, dt, false, LOOP_CAMERA_FOLLOW_RATE\);/);
});
