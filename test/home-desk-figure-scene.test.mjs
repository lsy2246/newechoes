import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home 3D scene is a desk figure object with the 2D story kept on the monitor", () => {
  assert.match(dioramaTs, /const deskFigure = new THREE\.Group\(\);/);
  assert.match(dioramaTs, /deskFigure\.name = "deskFigure";/);
  assert.match(dioramaTs, /const monitorScreen = laptop;/);
  assert.match(dioramaTs, /const screenHalfW = screenFaceW \/ 2;/);
  assert.match(dioramaTs, /const screenHalfH = screenFaceH \/ 2;/);

  assert.doesNotMatch(dioramaTs, /route: "\/(articles|projects|about)"/);

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
  assert.match(dioramaTs, /const chairSeat = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(0\.5, 0\.06, 0\.46, 8, 0\.052\),\s*mats\.chairShell,/);
  assert.match(dioramaTs, /const lpBase = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(lpBaseW, lpBaseH, lpBaseD, 8, 0\.035\),\s*mats\.computerShell,/);
});

test("home 3D desk figure keeps monitor hardware behind the keyboard and bends arms clear of the computer", () => {
  assert.match(dioramaTs, /const kbZ0 = 0\.17;/);
  assert.match(dioramaTs, /monitorStandPost\.position\.set\(0, 0\.128, -0\.44\);/);
  assert.match(dioramaTs, /monitorStandFoot\.position\.set\(0, 0\.018, -0\.41\);/);
  assert.match(dioramaTs, /lpScreenGroup\.position\.set\(0, 0\.09, -0\.4\);/);
  assert.match(dioramaTs, /lpBase\.position\.set\(0, lpBaseH \/ 2 \+ 0\.002, 0\.12\);/);
  assert.match(dioramaTs, /const bentSleeve = makeBentSleeve\(\[shoulderLocal, elbowLocal, wristLocal\], 0\.032, mats\.personCloth\);/);
  assert.match(dioramaTs, /const shoulderSocket = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const elbowBlend = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /hand\.position\.copy\(wristLocal\)\.add\(new THREE\.Vector3\(0\.015 \* side, -0\.006, -0\.02\)\);/);
  assert.doesNotMatch(dioramaTs, /arm\.elbowGroup\.rotation\.x = 0\.28 - ai\.dipValue;/);
  assert.doesNotMatch(dioramaTs, /arm\.elbowGroup\.rotation\.x = 0\.32 - ai\.dipValue;/);
  assert.match(dioramaTs, /person\.position\.set\(0, 0, 0\.68\);/);
});

test("home 3D desk figure uses a volumetric stylized seated person", () => {
  assert.match(dioramaTs, /const makeBone = \(/);
  assert.match(dioramaTs, /const makeBentSleeve = \(/);
  assert.match(dioramaTs, /new THREE\.TubeGeometry\(curve, 20, radius, 12, false\)/);
  assert.match(dioramaTs, /const torsoShell = new THREE\.Mesh\(\s*new THREE\.CapsuleGeometry\(0\.18, 0\.32, 8, 18\),\s*mats\.personCloth,/);
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
  assert.match(dioramaTs, /const shoulderBlend = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /shoulderBlend\.scale\.set\(0\.72, 0\.56, 0\.58\);/);
  assert.match(dioramaTs, /const pelvis = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const neck = new THREE\.Mesh\(/);
  assert.match(dioramaTs, /const thigh = makeBone\(/);
  assert.match(dioramaTs, /const shin = makeBone\(/);
  assert.match(dioramaTs, /bodyGroup\.rotation\.y = Math\.sin\(now \* 0\.0003\) \* 0\.012;/);
  assert.doesNotMatch(dioramaTs, /const shoulders = new THREE\.Mesh\(\s*new RoundedBoxGeometry\(0\.48, 0\.12, 0\.16/);
  assert.doesNotMatch(dioramaTs, /const shoulderCape = new THREE\.Mesh/);
  assert.doesNotMatch(dioramaTs, /const hairFringe = /);
});

test("home 3D desk figure uses simple volumetric limbs instead of paper shards", () => {
  assert.match(dioramaTs, /const makeSeatedLeg = \(side: -1 \| 1\) => \{/);
  assert.match(dioramaTs, /const hipLocal = new THREE\.Vector3\(0\.08 \* side, 0\.02, -0\.02\);/);
  assert.match(dioramaTs, /const kneeLocal = new THREE\.Vector3\(0\.09 \* side, -0\.12, -0\.31\);/);
  assert.match(dioramaTs, /const ankleLocal = new THREE\.Vector3\(0\.09 \* side, -0\.46, -0\.31\);/);
  assert.match(dioramaTs, /shoe\.position\.set\(0\.09 \* side, -0\.492, -0\.37\);/);
  assert.match(dioramaTs, /const makeDeskArm = \(side: -1 \| 1\) => \{/);
  assert.match(dioramaTs, /const shoulderLocal = new THREE\.Vector3\(0\.1 \* side, 0\.43, -0\.045\);/);
  assert.match(dioramaTs, /const elbowLocal = new THREE\.Vector3\(0\.13 \* side, 0\.27, -0\.24\);/);
  assert.match(dioramaTs, /const wristLocal = new THREE\.Vector3\(0\.1 \* side, 0\.285, -0\.5\);/);
  assert.match(dioramaTs, /armGroup\.add\(bentSleeve\);/);
  assert.doesNotMatch(dioramaTs, /new THREE\.BufferGeometry\(\)/);
  assert.match(dioramaTs, /person\.position\.set\(0, 0, 0\.68\);/);
});

test("home 3D desk figure keeps the monitor from overpowering the seated person", () => {
  assert.match(dioramaTs, /screen: \{ w: 1\.24, h: 0\.68, t: 0\.024 \},/);
  assert.match(dioramaTs, /const lpBaseW = useMobileCarrier \? 1\.18 : 1\.04;/);
  assert.match(dioramaTs, /const lpBaseD = useMobileCarrier \? 0\.32 : 0\.48;/);
  assert.match(dioramaTs, /monitorStandPost\.position\.set\(0, 0\.128, -0\.44\);/);
  assert.match(dioramaTs, /monitorStandFoot\.position\.set\(0, 0\.018, -0\.41\);/);
});

test("home 3D desk figure presents the final scene from a side-profile angle", () => {
  assert.match(dioramaTs, /roomCameraTarget\.set\(0\.02, 0\.38, -0\.18\);/);
  assert.match(dioramaTs, /useMobileCarrier \? 0\.68 : 3\.05,/);
  assert.match(dioramaTs, /useMobileCarrier \? 1\.26 : 1\.1,/);
  assert.match(dioramaTs, /useMobileCarrier \? 3\.7 : 0\.42,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 0\.36 : 0\.72,/);
  assert.doesNotMatch(dioramaTs, /useMobileCarrier \? 4\.0 : 3\.62,/);
});
