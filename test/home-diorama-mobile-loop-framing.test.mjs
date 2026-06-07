import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as THREE from "three";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

const getNumericConst = (name) => {
  const match = dioramaTs.match(new RegExp(`const ${name} = ([0-9.]+);`));
  assert.ok(match, `${name} should be defined`);
  return Number(match[1]);
};

const getMobileTernaryConst = (name) => {
  const match = dioramaTs.match(new RegExp(`const ${name} = useMobileCarrier \\? (-?[0-9.]+) : (-?[0-9.]+);`));
  assert.ok(match, `${name} should be defined as a mobile/desktop ternary`);
  return Number(match[1]);
};

const getMobileVectorSet = (name) => {
  const match = dioramaTs.match(
    new RegExp(
      `${name}\\.set\\(\\s*useMobileCarrier \\? (-?[0-9.]+) : -?[0-9.]+,\\s*useMobileCarrier \\? (-?[0-9.]+) : -?[0-9.]+,\\s*useMobileCarrier \\? (-?[0-9.]+) : -?[0-9.]+,\\s*\\);`,
    ),
  );
  assert.ok(match, `${name} mobile vector should be defined`);
  return new THREE.Vector3(Number(match[1]), Number(match[2]), Number(match[3]));
};

const getProjectedBounds = ({ cameraPos, cameraTarget, fov, aspect, points }) => {
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 60);
  camera.position.copy(cameraPos);
  camera.lookAt(cameraTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  return points.reduce(
    (bounds, point) => {
      const projected = point.clone().project(camera);
      bounds.minX = Math.min(bounds.minX, projected.x);
      bounds.maxX = Math.max(bounds.maxX, projected.x);
      bounds.minY = Math.min(bounds.minY, projected.y);
      bounds.maxY = Math.max(bounds.maxY, projected.y);
      return bounds;
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
};

const assertPortraitSafeBounds = (bounds, label) => {
  assert.ok(bounds.minX >= -0.98, `${label} left side should stay inside portrait frame: ${bounds.minX}`);
  assert.ok(bounds.maxX <= 0.98, `${label} right side should stay inside portrait frame: ${bounds.maxX}`);
};

const getMobileFloorPoints = () => {
  const floorW = 2.15;
  const floorD = 2.08;
  const floorCenterY = -0.56;
  const floorCenterZ = -0.105;
  const floorHalfH = 0.06;
  const points = [];

  for (const x of [-floorW / 2, floorW / 2]) {
    for (const y of [floorCenterY - floorHalfH, floorCenterY + floorHalfH]) {
      for (const z of [floorCenterZ - floorD / 2, floorCenterZ + floorD / 2]) {
        points.push(new THREE.Vector3(x, y, z));
      }
    }
  }

  return points;
};

const getMobileRoomCamera = () => {
  const distanceScale = getNumericConst("MOBILE_ROOM_CAMERA_DISTANCE_SCALE");
  const target = new THREE.Vector3(0.07, 0.2, 0.02);
  const basePos = new THREE.Vector3(1.46, 0.98, 2.46);
  return {
    cameraPos: target.clone().add(basePos.clone().sub(target).multiplyScalar(distanceScale)),
    cameraTarget: target,
    fov: 50,
  };
};

const getMobileComponentCamera = () => {
  const target = getMobileVectorSet("componentCameraTarget");
  const basePos = getMobileVectorSet("componentCameraPos");
  return {
    cameraPos: basePos,
    cameraTarget: target,
    fov: getMobileTernaryConst("componentFov"),
  };
};

test("mobile loop-return starts from a portrait-safe room camera framing", () => {
  const roomCamera = getMobileRoomCamera();
  const bounds = getProjectedBounds({
    ...roomCamera,
    aspect: 430 / 932,
    points: getMobileFloorPoints(),
  });

  assertPortraitSafeBounds(bounds, "room camera");
  assert.match(
    dioramaTs,
    /roomCameraPos\.sub\(roomCameraTarget\)\.multiplyScalar\(MOBILE_ROOM_CAMERA_DISTANCE_SCALE\)\.add\(roomCameraTarget\);/,
  );
});

test("mobile loop-return ends in a portrait-safe compact framing", () => {
  const componentCamera = getMobileComponentCamera();
  const bounds = getProjectedBounds({
    ...componentCamera,
    aspect: 430 / 932,
    points: getMobileFloorPoints(),
  });

  assertPortraitSafeBounds(bounds, "component camera");
});

test("mobile loop-return stays portrait-safe near the 60% cue", () => {
  const roomCamera = getMobileRoomCamera();
  const componentCamera = getMobileComponentCamera();
  const rawLoopAmountAtSixtyPercentCue = 0.4;
  const visualAmount = 1 - Math.pow(1 - rawLoopAmountAtSixtyPercentCue, 2);
  const bounds = getProjectedBounds({
    cameraPos: roomCamera.cameraPos.clone().lerp(componentCamera.cameraPos, visualAmount),
    cameraTarget: roomCamera.cameraTarget.clone().lerp(componentCamera.cameraTarget, visualAmount),
    fov: roomCamera.fov + (componentCamera.fov - roomCamera.fov) * visualAmount,
    aspect: 430 / 932,
    points: getMobileFloorPoints(),
  });

  assertPortraitSafeBounds(bounds, "60% cue");
});

test("mobile loop camera falls back to the safe room framing before controls activate", () => {
  assert.match(
    dioramaTs,
    /if \(useMobileCarrier && !sceneControlActivated\) \{\s*loopCameraStartPos\.copy\(roomCameraPos\);\s*loopCameraStartTarget\.copy\(roomCameraTarget\);\s*loopCameraStartFov = roomFov;\s*\} else \{\s*loopCameraStartPos\.copy\(camera\.position\);/s,
  );
});

test("desktop room camera keeps its existing framing values", () => {
  assert.match(
    dioramaTs,
    /roomCameraTarget\.set\(\s*useMobileCarrier \? 0\.07 : 0\.02,\s*useMobileCarrier \? 0\.2 : 0\.28,\s*useMobileCarrier \? 0\.02 : 0\.04,\s*\);/,
  );
  assert.match(
    dioramaTs,
    /roomCameraPos\.set\(\s*useMobileCarrier \? 1\.46 : 1\.88,\s*useMobileCarrier \? 0\.98 : 1\.46,\s*useMobileCarrier \? 2\.46 : 2\.78,\s*\);/,
  );
});
