import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HOME_PROFILE } from "@/consts";
import {
  drawHomeScreenBackdrop,
  drawHomeScreenStory,
  type HomeScreenStoryDevice,
} from "./homeScreenStory";

const CLEANUP_KEY = "__homeDioramaCleanup";
const HOME_DIORAMA_PIXEL_RATIO_CAP = 2;

type ThemeName = "light" | "dark";

type OutdoorPalette = {
  fogTint: number;
};

const OUTDOOR_PALETTES: Record<ThemeName, OutdoorPalette> = {
  light: {
    fogTint: 0xf1e7d9,
  },
  dark: {
    fogTint: 0x0f1828,
  },
};

type Theme = {
  floor: number;
  wall: number;
  deskTop: number;
  deskLeg: number;
  chairShell: number;
  computerShell: number;
  laptopBody: number;
  laptopFrame: number;
  personSkin: number;
  personHair: number;
  personCloth: number;
  personPants: number;
  personShoe: number;
  screenBg: string;
  screenText: string;
  screenMuted: string;
  screenAccent: string;
  keyTop: number;
  sceneBg: number;
};

const THEMES: Record<ThemeName, Theme> = {
  light: {
    floor: 0xf2f3f2,
    wall: 0xffffff,
    deskTop: 0xf8f8f6,
    deskLeg: 0xc6c9c8,
    chairShell: 0xf1f2f0,
    computerShell: 0xf5f6f4,
    laptopBody: 0xe7e8e6,
    laptopFrame: 0x202326,
    personSkin: 0xd7b49b,
    personHair: 0x17335f,
    personCloth: 0xff7a59,
    personPants: 0x20a7b8,
    personShoe: 0x23272b,
    screenBg: "#ffffff",
    screenText: "#101010",
    screenMuted: "#3f3f3f",
    screenAccent: "#101010",
    keyTop: 0x202326,
    sceneBg: 0xf7f8f7,
  },
  dark: {
    floor: 0x181a1d,
    wall: 0x111315,
    deskTop: 0x25282c,
    deskLeg: 0x8b9096,
    chairShell: 0xdadcd8,
    computerShell: 0x30343a,
    laptopBody: 0x30343a,
    laptopFrame: 0xe6e9ec,
    personSkin: 0xa8a6a0,
    personHair: 0xb8d3ff,
    personCloth: 0xff8a68,
    personPants: 0x2bb8c7,
    personShoe: 0x111315,
    screenBg: "#111315",
    screenText: "#f5f7fa",
    screenMuted: "#bdc5cf",
    screenAccent: "#eef2f6",
    keyTop: 0xe6e9ec,
    sceneBg: 0x111315,
  },
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type ScreenCarrierPreset = {
  canvas: { width: number; height: number };
  screen: { w: number; h: number; t: number };
  groupPosition: THREE.Vector3;
  groupRotationX: number;
  screenFaceYOffset: number;
  screenBodyOffsetZ: number;
  cameraFit: number;
  roomDistance: number;
  roomUp: number;
  roomRight: number;
  introTargetUp: number;
  roomTargetUp: number;
  roomTargetRight: number;
};

const getDeviceClass = (width: number, height: number): HomeScreenStoryDevice => {
  return width > height ? "desktop" : "mobile";
};

const SCREEN_CARRIER_PRESETS: Record<HomeScreenStoryDevice, ScreenCarrierPreset> = {
  desktop: {
    canvas: { width: 2560, height: 1440 },
    screen: { w: 1.24, h: 0.68, t: 0.024 },
    groupPosition: new THREE.Vector3(0, 0.055, -0.4),
    groupRotationX: -0.22,
    screenFaceYOffset: 0.39,
    screenBodyOffsetZ: -0.013,
    cameraFit: 1,
    roomDistance: 4.1,
    roomUp: 1.45,
    roomRight: 0.62,
    introTargetUp: -0.015,
    roomTargetUp: -0.18,
    roomTargetRight: -0.04,
  },
  mobile: {
    canvas: { width: 1120, height: 2400 },
    screen: { w: 0.31, h: 0.6, t: 0.022 },
    groupPosition: new THREE.Vector3(0, 0.08, -0.055),
    groupRotationX: -0.1,
    screenFaceYOffset: 0,
    screenBodyOffsetZ: -0.01,
    cameraFit: 1,
    roomDistance: 6.35,
    roomUp: 2.2,
    roomRight: 0.62,
    introTargetUp: 0,
    roomTargetUp: 0.22,
    roomTargetRight: 0.04,
  },
};

const createScreenCarrierPreset = (
  device: HomeScreenStoryDevice,
  viewportAspect: number,
): ScreenCarrierPreset => {
  const base = SCREEN_CARRIER_PRESETS[device];
  if (device !== "mobile") return base;

  const screenFaceH = base.screen.h - 0.06;
  const screenFaceAspect = clamp(viewportAspect, 0.44, 0.78);
  return {
    ...base,
    canvas: {
      width: Math.round(base.canvas.height * screenFaceAspect),
      height: base.canvas.height,
    },
    screen: {
      ...base.screen,
      w: screenFaceH * screenFaceAspect + 0.06,
    },
  };
};

export function initDiorama() {
  if (typeof window === "undefined") return () => {};

  const prev = (window as unknown as Record<string, (() => void) | undefined>)[CLEANUP_KEY];
  if (typeof prev === "function") prev();

  const canvasEl = document.querySelector<HTMLCanvasElement>("[data-diorama-canvas]");
  if (!canvasEl) return () => {};

  const shellEl = document.querySelector<HTMLElement>("[data-home-shell]");
  const sceneEl = document.querySelector<HTMLElement>("[data-home-scene]");
  const storyEl = document.querySelector<HTMLElement>("[data-home-story]");
  const storyCanvasEl = document.querySelector<HTMLCanvasElement>("[data-story-canvas]");
  const storyCtx = storyCanvasEl?.getContext("2d") ?? null;
  const hintEl = document.querySelector<HTMLElement>("[data-diorama-hint]");
  const cueEl = document.querySelector<HTMLElement>("[data-home-scroll-cue]");
  const cuePercentEl = document.querySelector<HTMLElement>("[data-home-cue-percent]");
  const docEl = document.documentElement;
  const deviceClass = getDeviceClass(window.innerWidth, window.innerHeight);
  const screenPreset = createScreenCarrierPreset(
    deviceClass,
    window.innerWidth / Math.max(1, window.innerHeight),
  );
  const useMobileCarrier = deviceClass === "mobile";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8ecff, 7, 16);

  // ===== Camera (starts from the screen's internal view, then eases back into the room) =====
  const roomCameraPos = new THREE.Vector3();
  const roomCameraTarget = new THREE.Vector3();
  const screenCameraPos = new THREE.Vector3();
  const screenCameraTarget = new THREE.Vector3();
  const screenFov = 20;
  const roomFov = 50;

  const camera = new THREE.PerspectiveCamera(screenFov, 1, 0.1, 60);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, HOME_DIORAMA_PIXEL_RATIO_CAP));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const controls = new OrbitControls(camera, canvasEl);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.target.copy(roomCameraTarget);
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.5;
  // No azimuth limits — user can orbit freely around the diorama
  controls.rotateSpeed = 0.75;
  controls.enabled = false;
  controls.disconnect();

  // ===== Lights =====
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
  sunLight.position.set(3, 5, 1.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.3;
  sunLight.shadow.camera.far = 14;
  sunLight.shadow.camera.left = -4;
  sunLight.shadow.camera.right = 4;
  sunLight.shadow.camera.top = 4;
  sunLight.shadow.camera.bottom = -3;
  sunLight.shadow.bias = -0.0006;
  scene.add(sunLight);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const windowLight = new THREE.DirectionalLight(0xffffff, 0.55);
  windowLight.position.set(0, 2, -5);
  windowLight.target.position.set(0, 0.5, 0);
  scene.add(windowLight);
  scene.add(windowLight.target);

  const screenLight = new THREE.PointLight(
    0xe8edf8,
    0,
    useMobileCarrier ? 0.56 : 1.2,
    useMobileCarrier ? 2.2 : 1.5,
  );
  screenLight.position.set(
    useMobileCarrier ? 0.01 : 0.1,
    useMobileCarrier ? 0.46 : 0.6,
    useMobileCarrier ? -0.27 : -0.25,
  );
  scene.add(screenLight);

  // ===== Materials =====
  const mats = {
    floor: new THREE.MeshStandardMaterial({ color: 0xb89068, roughness: 0.92, transparent: true }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.96, transparent: true }),
    deskTop: new THREE.MeshStandardMaterial({ color: 0xf8f8f6, roughness: 0.58, metalness: 0.02 }),
    deskLeg: new THREE.MeshStandardMaterial({ color: 0xc6c9c8, roughness: 0.46, metalness: 0.28 }),
    chairShell: new THREE.MeshStandardMaterial({ color: 0xf1f2f0, roughness: 0.62, metalness: 0.02 }),
    computerShell: new THREE.MeshStandardMaterial({ color: 0xf5f6f4, roughness: 0.52, metalness: 0.04 }),
    laptopBody: new THREE.MeshStandardMaterial({ color: 0xf5f6f4, roughness: 0.52, metalness: 0.04 }),
    laptopFrame: new THREE.MeshStandardMaterial({ color: 0x202326, roughness: 0.5, metalness: 0.12 }),
    screen: null as unknown as THREE.MeshBasicMaterial,
    personSkin: new THREE.MeshStandardMaterial({ color: 0xd7b49b, roughness: 0.82, metalness: 0 }),
    personHair: new THREE.MeshStandardMaterial({ color: 0x17335f, roughness: 0.78, metalness: 0 }),
    personCloth: new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.82, metalness: 0 }),
    personPants: new THREE.MeshStandardMaterial({ color: 0x20a7b8, roughness: 0.78, metalness: 0 }),
    personShoe: new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.52, metalness: 0.05 }),
    key: new THREE.MeshStandardMaterial({ color: 0x202326, roughness: 0.56, metalness: 0.08 }),
  };
  const revealMaterials: THREE.Material[] = [
    mats.floor,
    mats.wall,
    mats.deskTop,
    mats.deskLeg,
    mats.chairShell,
    mats.computerShell,
    mats.laptopBody,
    mats.laptopFrame,
    mats.personSkin,
    mats.personHair,
    mats.personCloth,
    mats.personPants,
    mats.personShoe,
    mats.key,
  ];
  for (const mat of revealMaterials) {
    mat.transparent = true;
    mat.opacity = 0;
  }
  let revealMaterialsOpaque = false;
  const syncRevealMaterialTransparency = (opaque: boolean) => {
    if (revealMaterialsOpaque === opaque) return;
    revealMaterialsOpaque = opaque;
    const transparent = !opaque;
    for (const mat of revealMaterials) {
      mat.transparent = transparent;
      mat.needsUpdate = true;
    }
  };

  // ===== Desk figure object =====
  const roomFloorY = -0.5;
  const deskFigure = new THREE.Group();
  deskFigure.name = "deskFigure";
  scene.add(deskFigure);

  // A simple plinth keeps the 3D scene readable as one article component.
  const floor = new THREE.Mesh(
    new RoundedBoxGeometry(3.35, 0.12, 3.32, 6, 0.035),
    mats.floor,
  );
  floor.position.set(0, roomFloorY - 0.06, -0.105);
  floor.receiveShadow = true;
  deskFigure.add(floor);

  // ===== Desk =====
  const desk = new THREE.Group();
  const deskW = 2.45;
  const deskD = 1.12;
  const deskTopH = 0.07;
  const deskTopY = 0.22; // top surface at y=0.26 world, so thighs clear underneath

  const deskTopMesh = new THREE.Mesh(
    new RoundedBoxGeometry(deskW, deskTopH, deskD, 9, 0.055),
    mats.deskTop,
  );
  deskTopMesh.position.y = deskTopY;
  deskTopMesh.castShadow = true;
  deskTopMesh.receiveShadow = true;
  desk.add(deskTopMesh);

  // Legs: from floor y=-0.5 to desk bottom y=0.18. Height 0.68, center y=-0.16.
  const legH = 0.68;
  const legW = 0.08;
  [[-deskW / 2 + 0.1, -deskD / 2 + 0.1], [deskW / 2 - 0.1, -deskD / 2 + 0.1],
   [-deskW / 2 + 0.1, deskD / 2 - 0.1], [deskW / 2 - 0.1, deskD / 2 - 0.1]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legW * 0.18, legW * 0.18, legH, 12), mats.deskLeg);
    leg.position.set(x, -0.16, z);
    leg.castShadow = true;
    desk.add(leg);
  });
  desk.position.set(0, 0, -0.6);
  deskFigure.add(desk);
  const deskTopWorldY = desk.position.y + deskTopY + deskTopH / 2; // world y of top surface


  // ===== Laptop (→ /projects) =====
  const laptop = new THREE.Group();

  const lpBaseW = useMobileCarrier ? 1.18 : 1.04;
  const lpBaseD = useMobileCarrier ? 0.32 : 0.48;
  const lpBaseH = 0.028;

  const lpBase = new THREE.Mesh(
    new RoundedBoxGeometry(lpBaseW, lpBaseH, lpBaseD, 8, 0.035),
    mats.computerShell,
  );
  lpBase.position.set(0, lpBaseH / 2 + 0.002, 0.12);
  lpBase.castShadow = true;
  lpBase.receiveShadow = true;
  lpBase.visible = true;
  laptop.add(lpBase);

  // Screen (hinged at back edge)
  const lpScreenGroup = new THREE.Group();
  lpScreenGroup.position.copy(screenPreset.groupPosition);
  if (!useMobileCarrier) lpScreenGroup.position.set(0, 0.09, -0.4);
  const lpScreenW = screenPreset.screen.w;
  const lpScreenH = screenPreset.screen.h;
  const lpScreenT = screenPreset.screen.t;
  const lpScreenBody = new THREE.Mesh(
    new RoundedBoxGeometry(lpScreenW, lpScreenH, lpScreenT, 10, 0.035),
    mats.laptopFrame,
  );
  lpScreenBody.position.y = screenPreset.screenFaceYOffset;
  lpScreenBody.position.z = screenPreset.screenBodyOffsetZ;
  lpScreenBody.castShadow = true;
  lpScreenBody.visible = true;
  lpScreenGroup.add(lpScreenBody);

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = screenPreset.canvas.width;
  screenCanvas.height = screenPreset.canvas.height;
  const screenCtx = screenCanvas.getContext("2d")!;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  screenTexture.generateMipmaps = false;
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.LinearFilter;
  mats.screen = new THREE.MeshBasicMaterial({
    map: screenTexture,
    toneMapped: false,
    depthWrite: false,
    depthTest: true,
    color: useMobileCarrier ? 0xd9e1ee : 0xffffff,
  });

  const screenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(lpScreenW - 0.075, lpScreenH - 0.075),
    mats.screen,
  );
  const screenFaceW = lpScreenW - 0.075;
  const screenFaceH = lpScreenH - 0.075;
  let introBackdropTexture: THREE.CanvasTexture | null = null;
  let introBackdropMaterial: THREE.MeshBasicMaterial | null = null;
  let introBackdropCtx: CanvasRenderingContext2D | null = null;
  if (useMobileCarrier) {
    const introBackdropCanvas = document.createElement("canvas");
    introBackdropCanvas.width = 1180;
    introBackdropCanvas.height = 1240;
    introBackdropCtx = introBackdropCanvas.getContext("2d");
    introBackdropTexture = new THREE.CanvasTexture(introBackdropCanvas);
    introBackdropTexture.colorSpace = THREE.SRGBColorSpace;
    introBackdropTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    introBackdropTexture.generateMipmaps = false;
    introBackdropTexture.minFilter = THREE.LinearFilter;
    introBackdropTexture.magFilter = THREE.LinearFilter;
    introBackdropMaterial = new THREE.MeshBasicMaterial({
      map: introBackdropTexture,
      transparent: true,
      opacity: 1,
      toneMapped: false,
      depthWrite: false,
      color: 0xd9e1ee,
    });
    const introBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(screenFaceH * 1.12, screenFaceH * 1.18),
      introBackdropMaterial,
    );
    introBackdrop.position.set(0, screenPreset.screenFaceYOffset, -0.026);
    introBackdrop.renderOrder = -2;
    lpScreenGroup.add(introBackdrop);
  }
  screenFace.position.set(0, screenPreset.screenFaceYOffset, 0.018);
  screenFace.renderOrder = 1;
  lpScreenGroup.add(screenFace);

  lpScreenGroup.rotation.x = useMobileCarrier ? screenPreset.groupRotationX : -0.06;
  laptop.add(lpScreenGroup);

  // Keyboard (InstancedMesh)
  const cols = 11;
  const rows = 4;
  const keyW = 0.075;
  const keyD = 0.068;
  const keyH = 0.014;
  const keyGapX = 0.012;
  const keyGapZ = 0.013;
  const kbW = cols * keyW + (cols - 1) * keyGapX;
  const kbX0 = -kbW / 2;
  const kbZ0 = 0.17;
  const totalKeys = rows * cols + 1;
  const keyGeo = new THREE.BoxGeometry(keyW, keyH, keyD);
  const keyMesh = new THREE.InstancedMesh(keyGeo, mats.key, totalKeys);
  keyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  keyMesh.castShadow = true;
  const keyStates: { baseY: number; press: number; x: number; z: number; side: -1 | 1 }[] = [];
  const keyBaseY = lpBaseH + keyH / 2 + 0.003;
  const keyDummy = new THREE.Object3D();
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = kbX0 + c * (keyW + keyGapX) + keyW / 2;
      const z = kbZ0 + r * (keyD + keyGapZ) + keyD / 2;
      const side: -1 | 1 = c < cols / 2 ? -1 : 1;
      keyStates.push({ baseY: keyBaseY, press: 0, x, z, side });
      keyDummy.position.set(x, keyBaseY, z);
      keyDummy.updateMatrix();
      keyMesh.setMatrixAt(k++, keyDummy.matrix);
    }
  }
  // Space bar
  const spaceW = keyW * 5 + keyGapX * 4;
  const spaceZ = kbZ0 + rows * (keyD + keyGapZ) + keyD / 2;
  keyStates.push({ baseY: keyBaseY, press: 0, x: 0, z: spaceZ, side: 1 });
  keyDummy.position.set(0, keyBaseY, spaceZ);
  keyDummy.scale.set(spaceW / keyW, 1, 1);
  keyDummy.updateMatrix();
  keyMesh.setMatrixAt(k++, keyDummy.matrix);
  keyDummy.scale.set(1, 1, 1);
  keyMesh.instanceMatrix.needsUpdate = true;
  keyMesh.visible = true;
  laptop.add(keyMesh);

  // Trackpad (visual only)
  const trackpad = new THREE.Mesh(
    new RoundedBoxGeometry(0.38, 0.006, 0.22, 5, 0.018),
    mats.computerShell,
  );
  trackpad.position.set(0, lpBaseH + 0.002, -0.1);
  trackpad.visible = useMobileCarrier;
  laptop.add(trackpad);

  if (useMobileCarrier) {
    const shellPaddingX = 0.04;
    const shellPaddingTop = 0.054;
    const shellPaddingBottom = 0.064;
    const shellDepth = 0.044;
    const shellRadius = 0.07;
    const shellW = screenFaceW + shellPaddingX * 2;
    const shellH = screenFaceH + shellPaddingTop + shellPaddingBottom;

    const phoneShell = new THREE.Mesh(
      new RoundedBoxGeometry(shellW, shellH, shellDepth, 8, shellRadius),
      mats.laptopBody,
    );
    phoneShell.position.set(0, screenPreset.screenFaceYOffset, 0);
    phoneShell.castShadow = true;
    phoneShell.receiveShadow = true;
    lpScreenGroup.add(phoneShell);

    const innerFrame = new THREE.Mesh(
      new RoundedBoxGeometry(screenFaceW + 0.036, screenFaceH + 0.036, 0.016, 6, shellRadius * 0.78),
      mats.laptopFrame,
    );
    innerFrame.position.set(0, screenPreset.screenFaceYOffset, shellDepth / 2 - 0.008);
    innerFrame.visible = false;

    screenFace.position.z = shellDepth / 2 + 0.003;

    const sensor = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 16, 16),
      mats.key,
    );
    sensor.position.set(0, screenPreset.screenFaceYOffset + shellH / 2 - 0.042, shellDepth / 2 + 0.001);
    lpScreenGroup.add(sensor);

    const speaker = new THREE.Mesh(
      new RoundedBoxGeometry(0.09, 0.012, 0.01, 4, 0.005),
      mats.laptopBody,
    );
    speaker.position.set(0, screenPreset.screenFaceYOffset + shellH / 2 - 0.068, shellDepth / 2 + 0.001);
    lpScreenGroup.add(speaker);

  }

  if (!useMobileCarrier) {
    const monitorStandPost = new THREE.Mesh(
      new RoundedBoxGeometry(0.07, 0.24, 0.055, 8, 0.02),
      mats.computerShell,
    );
    monitorStandPost.position.set(0, 0.128, -0.44);
    monitorStandPost.castShadow = true;
    laptop.add(monitorStandPost);

    const monitorStandFoot = new THREE.Mesh(
      new RoundedBoxGeometry(0.52, 0.036, 0.24, 10, 0.035),
      mats.computerShell,
    );
    monitorStandFoot.position.set(0, 0.018, -0.41);
    monitorStandFoot.castShadow = true;
    monitorStandFoot.receiveShadow = true;
    laptop.add(monitorStandFoot);

    const monitorBackMount = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.12, 0.035, 6, 0.018),
      mats.computerShell,
    );
    monitorBackMount.position.set(0, 0.245, -0.425);
    monitorBackMount.rotation.x = -0.04;
    monitorBackMount.castShadow = true;
    laptop.add(monitorBackMount);
  }

  laptop.position.set(
    useMobileCarrier ? -0.02 : 0,
    deskTopWorldY + (useMobileCarrier ? 0.22 : 0),
    useMobileCarrier ? -0.26 : -0.42,
  );
  laptop.rotation.set(0, 0, 0);
  deskFigure.add(laptop);


  // ===== Person (seated on chair, feet on floor, facing -Z toward laptop) =====
  // Coordinate system: person group at world y=0 (so floor at local y=-0.5)
  //   hip  local y = 0.03 (just above chair seat)
  //   shoulder local y = 0.58
  //   head center local y = 0.85
  //   feet bottom local y = -0.5 (exactly on floor)
  const person = new THREE.Group();

  // ---- Chair ----
  const chairSeat = new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.06, 0.46, 8, 0.052),
    mats.chairShell,
  );
  chairSeat.position.set(0, -0.012, 0.05);
  chairSeat.castShadow = true;
  chairSeat.receiveShadow = true;
  person.add(chairSeat);

  const chairBack = new THREE.Mesh(
    new RoundedBoxGeometry(0.48, 0.42, 0.07, 8, 0.05),
    mats.chairShell,
  );
  chairBack.position.set(0, 0.15, 0.315);
  chairBack.rotation.x = -0.12;
  chairBack.castShadow = true;
  person.add(chairBack);

  // Chair legs (4 short legs under seat)
  [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.21], [0.2, 0.21]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.46, 10),
      mats.deskLeg,
    );
    leg.position.set(x, -0.26, z);
    leg.castShadow = true;
    person.add(leg);
  });

  const makeBone = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    radiusTop: number,
    radiusBottom: number,
    material: THREE.Material,
    segments = 10,
  ) => {
    const delta = end.clone().sub(start);
    const length = Math.max(0.001, delta.length());
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments, 1),
      material,
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const makeBentSleeve = (
    points: THREE.Vector3[],
    radius: number,
    material: THREE.Material,
  ) => {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 20, radius, 12, false),
      material,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // ---- Body: simple volumetric low-poly character, not paper shards ----
  const bodyGroup = new THREE.Group();
  person.add(bodyGroup);

  const torso = new THREE.Group();
  bodyGroup.add(torso);

  const torsoShell = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.32, 8, 18),
    mats.personCloth,
  );
  torsoShell.position.set(0, 0.315, 0.01);
  torsoShell.scale.set(0.82, 1.03, 0.62);
  torsoShell.rotation.x = -0.04;
  torsoShell.castShadow = true;
  torso.add(torsoShell);

  const shoulderBlend = new THREE.Mesh(
    new RoundedBoxGeometry(0.34, 0.1, 0.2, 6, 0.04),
    mats.personCloth,
  );
  shoulderBlend.position.set(0, 0.53, -0.005);
  shoulderBlend.scale.set(0.72, 0.56, 0.58);
  shoulderBlend.rotation.x = -0.03;
  shoulderBlend.castShadow = true;
  torso.add(shoulderBlend);

  const pelvis = new THREE.Mesh(
    new RoundedBoxGeometry(0.35, 0.14, 0.28, 6, 0.05),
    mats.personPants,
  );
  pelvis.position.set(0, 0.035, 0.005);
  pelvis.scale.set(0.94, 0.9, 0.82);
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.095, 10),
    mats.personSkin,
  );
  neck.position.set(0, 0.64, 0.012);
  neck.castShadow = true;
  person.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.795, -0.018);
  person.add(headGroup);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.148, 24, 16),
    mats.personSkin,
  );
  head.scale.set(0.86, 1.04, 0.92);
  head.castShadow = true;
  headGroup.add(head);

  const faceNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.018, 0.04, 8),
    mats.personSkin,
  );
  faceNose.position.set(0.012, 0.012, -0.138);
  faceNose.rotation.x = -Math.PI / 2;
  faceNose.scale.set(0.78, 0.92, 0.68);
  faceNose.castShadow = true;
  headGroup.add(faceNose);

  const leftEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 10, 8),
    mats.laptopFrame,
  );
  leftEye.position.set(-0.044, 0.036, -0.126);
  leftEye.scale.set(0.72, 1, 0.48);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 10, 8),
    mats.laptopFrame,
  );
  rightEye.position.set(0.055, 0.036, -0.126);
  rightEye.scale.set(0.72, 1, 0.48);
  headGroup.add(rightEye);

  const visibleEar = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 8, 6),
    mats.personSkin,
  );
  visibleEar.position.set(0.102, 0.002, 0.02);
  visibleEar.scale.set(0.7, 1, 0.42);
  visibleEar.castShadow = true;
  headGroup.add(visibleEar);

  const hair = new THREE.Group();
  headGroup.add(hair);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.162, 28, 14),
    mats.personHair,
  );
  hairCap.position.set(0, 0.035, 0);
  hairCap.scale.set(0.94, 0.72, 0.68);
  hairCap.rotation.x = -0.08;
  hairCap.castShadow = true;
  hair.add(hairCap);

  const frontHairBand = new THREE.Mesh(
    new RoundedBoxGeometry(0.19, 0.052, 0.04, 8, 0.022),
    mats.personHair,
  );
  frontHairBand.position.set(-0.006, 0.072, -0.108);
  frontHairBand.rotation.set(-0.16, 0, -0.035);
  frontHairBand.castShadow = true;
  hair.add(frontHairBand);

  const sideHair = new THREE.Mesh(
    new RoundedBoxGeometry(0.038, 0.1, 0.052, 7, 0.02),
    mats.personHair,
  );
  sideHair.position.set(0.1, -0.012, 0.045);
  sideHair.rotation.set(0.02, 0.08, -0.035);
  sideHair.castShadow = true;
  hair.add(sideHair);

  const backHair = new THREE.Mesh(
    new THREE.SphereGeometry(0.116, 16, 10),
    mats.personHair,
  );
  backHair.position.set(0, -0.02, 0.088);
  backHair.scale.set(0.9, 0.95, 0.66);
  backHair.rotation.x = 0.06;
  backHair.castShadow = true;
  hair.add(backHair);

  const mouth = new THREE.Mesh(
    new RoundedBoxGeometry(0.064, 0.008, 0.008, 4, 0.003),
    mats.laptopFrame,
  );
  mouth.position.set(0.018, -0.038, -0.133);
  mouth.rotation.z = -0.04;
  headGroup.add(mouth);

  const makeDeskArm = (side: -1 | 1) => {
    const armGroup = new THREE.Group();
    const shoulderLocal = new THREE.Vector3(0.1 * side, 0.43, -0.045);
    const elbowLocal = new THREE.Vector3(0.13 * side, 0.27, -0.24);
    const wristLocal = new THREE.Vector3(0.1 * side, 0.285, -0.5);

    const shoulderSocket = new THREE.Mesh(
      new RoundedBoxGeometry(0.12, 0.095, 0.12, 6, 0.045),
      mats.personCloth,
    );
    shoulderSocket.position.copy(shoulderLocal).add(new THREE.Vector3(-0.006 * side, 0.012, 0.018));
    shoulderSocket.rotation.set(-0.18, 0.18 * side, 0.12 * side);
    shoulderSocket.castShadow = true;
    armGroup.add(shoulderSocket);

    const bentSleeve = makeBentSleeve([shoulderLocal, elbowLocal, wristLocal], 0.032, mats.personCloth);
    armGroup.add(bentSleeve);

    const elbowBlend = new THREE.Mesh(
      new RoundedBoxGeometry(0.076, 0.052, 0.07, 6, 0.026),
      mats.personCloth,
    );
    elbowBlend.position.copy(elbowLocal).add(new THREE.Vector3(0.004 * side, 0.006, -0.004));
    elbowBlend.rotation.set(-0.1, 0.12 * side, 0.08 * side);
    elbowBlend.castShadow = true;
    armGroup.add(elbowBlend);

    const cuff = new THREE.Mesh(
      new RoundedBoxGeometry(0.07, 0.035, 0.052, 5, 0.016),
      mats.personCloth,
    );
    cuff.position.copy(wristLocal).add(new THREE.Vector3(0.003 * side, 0.009, 0.006));
    cuff.rotation.set(0.12, 0.12 * side, 0.04 * side);
    cuff.castShadow = true;
    armGroup.add(cuff);

    const hand = new THREE.Mesh(
      new RoundedBoxGeometry(0.07, 0.026, 0.06, 5, 0.016),
      mats.personSkin,
    );
    hand.position.copy(wristLocal).add(new THREE.Vector3(0.015 * side, -0.006, -0.02));
    hand.rotation.set(0.28, 0.16 * side, 0.06 * side);
    hand.castShadow = true;
    armGroup.add(hand);

    person.add(armGroup);
    return { armGroup, hand };
  };

  const leftArm = makeDeskArm(-1);
  const rightArm = makeDeskArm(1);

  const makeSeatedLeg = (side: -1 | 1) => {
    const legGroup = new THREE.Group();
    const hipLocal = new THREE.Vector3(0.08 * side, 0.02, -0.02);
    const kneeLocal = new THREE.Vector3(0.09 * side, -0.12, -0.31);
    const ankleLocal = new THREE.Vector3(0.09 * side, -0.46, -0.31);

    const thigh = makeBone(hipLocal, kneeLocal, 0.066, 0.058, mats.personPants, 10);
    legGroup.add(thigh);

    const shin = makeBone(kneeLocal, ankleLocal, 0.058, 0.05, mats.personPants, 10);
    legGroup.add(shin);

    const shoe = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.07, 0.25, 5, 0.025),
      mats.personShoe,
    );
    shoe.position.set(0.09 * side, -0.492, -0.37);
    shoe.castShadow = true;
    shoe.receiveShadow = true;
    legGroup.add(shoe);

    person.add(legGroup);
    return { legGroup, thigh, shin, shoe };
  };

  const leftLeg = makeSeatedLeg(-1);
  const rightLeg = makeSeatedLeg(1);
  leftLeg.legGroup.position.z = 0.012;
  rightLeg.legGroup.position.z = -0.012;

  // Seated at the front edge of the desk, looking into the monitor.
  person.position.set(0, 0, 0.68);
  person.scale.set(0.95, 1, 0.95);
  person.rotation.set(0, -0.12, 0);
  leftArm.armGroup.rotation.z = 0.08;
  rightArm.armGroup.rotation.z = -0.08;
  torso.rotation.x = 0;
  torso.rotation.y = 0;
  headGroup.position.z = -0.018;
  if (useMobileCarrier) {
    person.position.set(-0.02, 0, 0.74);
    person.scale.setScalar(0.84);
    person.rotation.y = 0;
    chairSeat.scale.z = 0.84;
    chairBack.scale.z = 0.86;
    chairBack.position.z = 0.31;
    torso.scale.set(0.92, 1, 0.72);
    bodyGroup.scale.z = 0.82;
    pelvis.scale.z = 0.72;
    leftArm.armGroup.visible = false;
    rightArm.armGroup.visible = false;
    torso.rotation.x = -0.1;
    torso.rotation.y = 0;
    headGroup.position.z = -0.032;
    faceNose.position.z = -0.148;
    visibleEar.position.z = 0.012;

    const makeMobileArm = (side: -1 | 1) => {
      const armGroup = new THREE.Group();
      const shoulderLocal = new THREE.Vector3(0.12 * side, 0.45, -0.04);
      const elbowLocal = new THREE.Vector3(0.15 * side, 0.34, -0.25);
      const wristLocal = new THREE.Vector3(0.1 * side, 0.31, -0.58);

      const shoulderSocket = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.085, 0.11, 6, 0.04),
        mats.personCloth,
      );
      shoulderSocket.position.copy(shoulderLocal).add(new THREE.Vector3(-0.004 * side, 0.01, 0.016));
      shoulderSocket.rotation.set(-0.16, 0.16 * side, 0.1 * side);
      shoulderSocket.castShadow = true;
      armGroup.add(shoulderSocket);

      const bentSleeve = makeBentSleeve([shoulderLocal, elbowLocal, wristLocal], side === 1 ? 0.04 : 0.032, mats.personCloth);
      armGroup.add(bentSleeve);

      const elbowBlend = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.058, 0.074, 6, 0.025),
        mats.personCloth,
      );
      elbowBlend.position.copy(elbowLocal).add(new THREE.Vector3(0.004 * side, 0.004, -0.004));
      elbowBlend.rotation.set(-0.1, 0.1 * side, 0.08 * side);
      elbowBlend.castShadow = true;
      armGroup.add(elbowBlend);

      const cuff = new THREE.Mesh(
        new RoundedBoxGeometry(0.074, 0.035, 0.056, 5, 0.016),
        mats.personCloth,
      );
      cuff.position.copy(wristLocal).add(new THREE.Vector3(0.004 * side, 0.012, 0.012));
      cuff.rotation.set(0.28, 0.14 * side, 0.08 * side);
      cuff.castShadow = true;
      armGroup.add(cuff);

      const hand = new THREE.Mesh(
        new RoundedBoxGeometry(0.07, 0.026, 0.06, 5, 0.016),
        mats.personSkin,
      );
      hand.position.copy(wristLocal).add(new THREE.Vector3(0.02 * side, -0.004, -0.026));
      hand.rotation.set(0.28, 0.16 * side, 0.06 * side);
      hand.castShadow = true;
      armGroup.add(hand);

      person.add(armGroup);
    };

    makeMobileArm(-1);
    makeMobileArm(1);
  }
  deskFigure.add(person);

  if (useMobileCarrier) {
    const standBaseW = clamp(screenFaceW * 0.72, 0.17, 0.34);
    const standBraceW = clamp(screenFaceW * 0.58, 0.13, 0.28);
    const standLipW = clamp(screenFaceW * 0.48, 0.11, 0.22);
    const standBase = new THREE.Mesh(
      new RoundedBoxGeometry(standBaseW, 0.02, 0.12, 6, 0.014),
      mats.computerShell,
    );
    standBase.position.set(laptop.position.x, deskTopWorldY + 0.01, laptop.position.z - 0.03);
    standBase.castShadow = true;
    standBase.receiveShadow = true;
    deskFigure.add(standBase);

    const standPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.14, 0.03),
      mats.computerShell,
    );
    standPost.position.set(laptop.position.x, deskTopWorldY + 0.08, laptop.position.z - 0.07);
    standPost.castShadow = true;
    deskFigure.add(standPost);

    const standBrace = new THREE.Mesh(
      new RoundedBoxGeometry(standBraceW, 0.18, 0.026, 6, 0.016),
      mats.computerShell,
    );
    standBrace.position.set(
      laptop.position.x,
      deskTopWorldY + 0.16,
      laptop.position.z - 0.055,
    );
    standBrace.rotation.x = -0.34;
    standBrace.castShadow = true;
    deskFigure.add(standBrace);

    const standLip = new THREE.Mesh(
      new RoundedBoxGeometry(standLipW, 0.026, 0.026, 6, 0.01),
      mats.computerShell,
    );
    standLip.position.set(
      laptop.position.x,
      deskTopWorldY + 0.023,
      laptop.position.z + 0.02,
    );
    standLip.castShadow = true;
    deskFigure.add(standLip);
  }

  const monitorScreen = laptop;
  monitorScreen.name = "monitorScreen";

  const screenWorldNormal = new THREE.Vector3();
  const screenWorldUp = new THREE.Vector3();
  const screenWorldRight = new THREE.Vector3();
  const screenCenterWorld = new THREE.Vector3();
  const screenHalfW = screenFaceW / 2;
  const screenHalfH = screenFaceH / 2;
  const syncScreenIntroCamera = () => {
    scene.updateMatrixWorld(true);
    const screenQuat = screenFace.getWorldQuaternion(new THREE.Quaternion());
    screenCenterWorld.copy(screenFace.localToWorld(new THREE.Vector3(0, 0, 0.002)));
    screenWorldNormal.set(0, 0, 1).applyQuaternion(screenQuat).normalize();
    screenWorldUp.set(0, 1, 0).applyQuaternion(screenQuat).normalize();
    screenWorldRight.set(1, 0, 0).applyQuaternion(screenQuat).normalize();

    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(screenFov) / 2);
    const fitByHeight = screenHalfH / Math.max(0.0001, tanHalfFov);
    const fitByWidth = screenHalfW / Math.max(0.0001, tanHalfFov * camera.aspect);
    // Mobile uses contain-fit so wider portrait devices don't crop the hand-screen
    // vertically. Desktop keeps the cover-fit cinematic screen reveal.
    const introFitDistance = useMobileCarrier
      ? Math.max(fitByHeight, fitByWidth)
      : Math.min(fitByHeight, fitByWidth);
    const introDistance = introFitDistance * screenPreset.cameraFit;

    screenCameraTarget
      .copy(screenCenterWorld)
      .addScaledVector(screenWorldUp, screenPreset.introTargetUp);
    screenCameraPos
      .copy(screenCenterWorld)
      .addScaledVector(screenWorldNormal, introDistance)
      .addScaledVector(screenWorldUp, screenPreset.introTargetUp);

    roomCameraTarget.set(0.02, 0.38, -0.18);
    roomCameraPos.set(
      useMobileCarrier ? 0.68 : 3.05,
      useMobileCarrier ? 1.26 : 1.1,
      useMobileCarrier ? 3.7 : 0.42,
    );
  };
  syncScreenIntroCamera();
  camera.position.copy(screenCameraPos);
  controls.target.copy(screenCameraTarget);

  // ===== Theme =====
  const getTheme = (): ThemeName => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  let theme: ThemeName = getTheme();

  const applyTheme = (t: ThemeName) => {
    const p = THEMES[t];
    mats.floor.color.setHex(p.floor);
    mats.wall.color.setHex(p.wall);
    mats.deskTop.color.setHex(p.deskTop);
    mats.deskLeg.color.setHex(p.deskLeg);
    mats.chairShell.color.setHex(p.chairShell);
    mats.computerShell.color.setHex(p.computerShell);
    mats.laptopBody.color.setHex(p.laptopBody);
    mats.laptopFrame.color.setHex(p.laptopFrame);
    const mobileScreenTint = t === "dark" ? 0xc1ccd8 : 0xd9e1ee;
    mats.screen.color.setHex(useMobileCarrier ? mobileScreenTint : 0xffffff);
    introBackdropMaterial?.color.setHex(mobileScreenTint);
    mats.personSkin.color.setHex(p.personSkin);
    mats.personHair.color.setHex(p.personHair);
    mats.personCloth.color.setHex(p.personCloth);
    mats.personPants.color.setHex(p.personPants);
    mats.personShoe.color.setHex(p.personShoe);
    mats.key.color.setHex(p.keyTop);
  };
  applyTheme(theme);

  const themeObserver = new MutationObserver(() => {
    const t = getTheme();
    if (t !== theme) {
      theme = t;
      applyTheme(t);
      needScreenRedraw = true;
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // ===== Scroll-driven homepage state =====
  type RenderMode = "story" | "handoff" | "room";
  const STORY_MODE_END = 0.7;
  const HANDOFF_MODE_END = 0.735;
  const STORY_PROGRESS_END = 0.7;
  const STORY_FRAME_STEPS = useMobileCarrier ? 120 : 140;
  const SCREEN_REDRAW_STEP = 1 / STORY_FRAME_STEPS;
  const STORY_FRAME_CACHE_LIMIT = useMobileCarrier ? 3 : 5;
  const STORY_CANVAS_DPR = HOME_DIORAMA_PIXEL_RATIO_CAP;
  const STORY_LAYOUT_DPR_CAP = useMobileCarrier ? 1.35 : 1.5;
  const STORY_FADE_START = 0.695;
  const STORY_FADE_END = 0.71;
  const SCENE_FADE_START = 0.708;
  const SCENE_FADE_END = 0.735;
  const INTERACTIVE_PROGRESS = 0.965;
  const CAMERA_REJOIN_START = 0.925;
  const CAMERA_REJOIN_END = INTERACTIVE_PROGRESS;
  const CAMERA_REJOIN_FOLLOW_RATE = 0.0075;
  const CAMERA_CATCHUP_FOLLOW_RATE = 0.012;
  const getRenderMode = (progress: number): RenderMode => {
    if (progress < STORY_MODE_END) return "story";
    if (progress < HANDOFF_MODE_END) return "handoff";
    return "room";
  };
  let homeProgress = 0;
  let scrollTargetProgress = 0;
  let renderMode = getRenderMode(homeProgress);
  let cameraRejoinActive = false;
  let cameraInertialCatchup = false;
  let initialCameraSyncPending = true;
  let lastDrawnStoryProgress = -1;
  let lastTexturedStoryProgress = -1;
  let lastStoryOverlayKey = "";
  const storyFrameCache = new Map<string, HTMLCanvasElement>();
  const cameraRejoinStartPos = new THREE.Vector3();
  const cameraRejoinStartTarget = new THREE.Vector3();
  const cameraRejoinEndPos = new THREE.Vector3();
  const cameraRejoinEndTarget = new THREE.Vector3();
  const cameraRejoinStartDir = new THREE.Vector3();
  const cameraRejoinEndDir = new THREE.Vector3();
  const cameraRejoinStepDir = new THREE.Vector3();
  const cameraRejoinDeltaQuat = new THREE.Quaternion();
  const cameraRejoinStepQuat = new THREE.Quaternion();
  const desiredCameraPos = new THREE.Vector3();
  const desiredCameraTarget = new THREE.Vector3();
  let cameraRejoinStartFov = roomFov;
  let cameraRejoinEndFov = roomFov;
  let sceneControlActivated = false;
  const getCameraPull = (progress: number) => easeInOutSine(clamp((progress - 0.7) / 0.27));
  const getScrollCameraState = (
    progress: number,
    outPos: THREE.Vector3,
    outTarget: THREE.Vector3,
  ) => {
    const pull = getCameraPull(progress);
    outPos.lerpVectors(screenCameraPos, roomCameraPos, pull);
    outTarget.lerpVectors(screenCameraTarget, roomCameraTarget, pull);
    return pull;
  };
  const captureCameraRejoin = () => {
    cameraRejoinStartPos.copy(camera.position);
    cameraRejoinStartTarget.copy(controls.target);
    const endPull = getScrollCameraState(CAMERA_REJOIN_START, cameraRejoinEndPos, cameraRejoinEndTarget);
    cameraRejoinStartFov = camera.fov;
    cameraRejoinEndFov = lerp(screenFov, roomFov, endPull);
    cameraRejoinActive = true;
    cameraInertialCatchup = true;
  };
  const getCameraRejoinState = (
    progress: number,
    outPos: THREE.Vector3,
    outTarget: THREE.Vector3,
  ) => {
    const t = easeInOutSine(clamp((CAMERA_REJOIN_END - progress) / (CAMERA_REJOIN_END - CAMERA_REJOIN_START)));
    outTarget.lerpVectors(cameraRejoinStartTarget, cameraRejoinEndTarget, t);
    cameraRejoinStartDir.subVectors(cameraRejoinStartPos, cameraRejoinStartTarget);
    cameraRejoinEndDir.subVectors(cameraRejoinEndPos, cameraRejoinEndTarget);
    const startRadius = Math.max(0.0001, cameraRejoinStartDir.length());
    const endRadius = Math.max(0.0001, cameraRejoinEndDir.length());
    cameraRejoinStartDir.normalize();
    cameraRejoinEndDir.normalize();
    cameraRejoinDeltaQuat.setFromUnitVectors(cameraRejoinStartDir, cameraRejoinEndDir);
    cameraRejoinStepQuat.identity().slerp(cameraRejoinDeltaQuat, t);
    cameraRejoinStepDir.copy(cameraRejoinStartDir).applyQuaternion(cameraRejoinStepQuat).normalize();
    outPos
      .copy(outTarget)
      .addScaledVector(cameraRejoinStepDir, lerp(startRadius, endRadius, t));
    return lerp(cameraRejoinStartFov, cameraRejoinEndFov, t);
  };
  const getCameraFollowAlpha = (dt: number, rate: number) =>
    reduceMotion ? 1 : 1 - Math.exp(-dt * rate);
  const isCameraCloseToDesired = (desiredFov: number) =>
    camera.position.distanceToSquared(desiredCameraPos) < 0.000025 &&
    controls.target.distanceToSquared(desiredCameraTarget) < 0.000025 &&
    Math.abs(camera.fov - desiredFov) < 0.04;
  const applyCameraPose = (desiredFov: number, dt: number, snap: boolean, rate: number) => {
    const alpha = snap ? 1 : getCameraFollowAlpha(dt, rate);
    camera.position.lerp(desiredCameraPos, alpha);
    controls.target.lerp(desiredCameraTarget, alpha);
    camera.fov = lerp(camera.fov, desiredFov, alpha);
    camera.lookAt(controls.target);
  };
  const syncCameraToScrollState = (progress: number) => {
    const desiredFov = lerp(
      screenFov,
      roomFov,
      getScrollCameraState(progress, desiredCameraPos, desiredCameraTarget),
    );
    camera.position.copy(desiredCameraPos);
    controls.target.copy(desiredCameraTarget);
    camera.fov = desiredFov;
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
  };
  const syncSceneOverlay = () => {
    const storyOut = easeInOutSine(clamp((homeProgress - STORY_FADE_START) / (STORY_FADE_END - STORY_FADE_START)));
    const sceneIn = easeInOutSine(clamp((homeProgress - SCENE_FADE_START) / (SCENE_FADE_END - SCENE_FADE_START)));
    docEl.style.setProperty("--scene-opacity", sceneIn.toFixed(4));
    docEl.style.setProperty("--story-opacity", (1 - storyOut).toFixed(4));
  };

  const getScrollProgress = () => {
    if (!shellEl) return 1;
    const rect = shellEl.getBoundingClientRect();
    const total = Math.max(1, rect.height - window.innerHeight);
    return clamp(-rect.top / total);
  };
  const syncScrollProgress = () => {
    scrollTargetProgress = getScrollProgress();
  };
  syncScrollProgress();
  homeProgress = scrollTargetProgress;
  renderMode = getRenderMode(homeProgress);
  window.addEventListener("scroll", syncScrollProgress, { passive: true });
  const handleBreakpointResize = () => {
    const nextDevice = getDeviceClass(window.innerWidth, window.innerHeight);
    if (nextDevice !== deviceClass) {
      cleanup();
      requestAnimationFrame(() => {
        initDiorama();
      });
      return;
    }
    syncScrollProgress();
  };
  window.addEventListener("resize", handleBreakpointResize);

  const applyHomeState = (progress: number) => {
    const value = progress.toFixed(4);
    const homeHeaderPhase = getRenderMode(progress) === "story" ? "story" : "room";
    const storyProgress = clamp(progress / STORY_PROGRESS_END);
    docEl.style.setProperty("--home-progress", value);
    docEl.dataset.homeHeaderPhase = homeHeaderPhase;
    docEl.style.setProperty("--story-progress", storyProgress.toFixed(4));
    docEl.style.setProperty("--story-local", storyProgress.toFixed(4));
    sceneEl?.style.setProperty("--home-progress", value);
    storyEl?.style.setProperty("--story-progress", storyProgress.toFixed(4));
    storyEl?.style.setProperty("--story-local", storyProgress.toFixed(4));
    sceneEl?.setAttribute("data-home-phase", progress > 0.76 ? "room" : "page");
    const cueMode = progress > 0.965 ? "explore" : progress > 0.9 ? "settle" : "scroll";
    const cueProgress = clamp(progress / 0.965);
    cueEl?.style.setProperty("--cue-progress", cueProgress.toFixed(4));
    cueEl?.setAttribute("data-home-visible", "true");
    cueEl?.setAttribute("data-cue-mode", cueMode);
    if (cuePercentEl) cuePercentEl.textContent = `${Math.round(cueProgress * 100)}%`;
  };

  let needScreenRedraw = true;
  let cursorOn = true;
  let cursorLastToggle = performance.now();

  // ===== Time formatter (Beijing: YYYY-MM-DD HH:mm · 周X) =====
  const dateFmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const weekdayFmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short",
  });
  const formatNowBeijing = () => {
    const d = new Date();
    // zh-CN date format returns e.g. "2026/04/19" — normalize to "2026-04-19"
    const date = dateFmt.format(d).replace(/\//g, "-");
    return `${date} ${timeFmt.format(d)} · ${weekdayFmt.format(d)}`;
  };
  let lastTimeStr = "";

  // ===== Typewriter state (rotating status line at bottom of screen) =====
  type TyperPhase = "typing" | "hold" | "deleting" | "idle";
  const TYPEWRITER_LINES: string[] = HOME_PROFILE.typewriter.length
    ? HOME_PROFILE.typewriter
    : ["now building ·"];
  const TYPER_SPEED_TYPE = 55;    // ms per char while typing
  const TYPER_SPEED_DELETE = 26;  // ms per char while deleting
  const TYPER_HOLD_MS = 1800;     // pause after finishing typing
  const TYPER_IDLE_MS = 250;      // pause after fully deleted before next line
  let typerIndex = 0;
  let typerPhase: TyperPhase = "typing";
  let typerText = "";
  let typerLastTick = performance.now();
  let typerHoldUntil = 0;
  let storyCanvasDpr = 1;
  let storyLayoutDpr = 1;

  const resizeStoryCanvas = () => {
    if (!storyCanvasEl) return false;
    const rect = storyCanvasEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, STORY_CANVAS_DPR);
    const layoutDpr = Math.min(window.devicePixelRatio || 1, STORY_LAYOUT_DPR_CAP);
    const dprChanged = storyCanvasDpr !== dpr || storyLayoutDpr !== layoutDpr;
    storyCanvasDpr = dpr;
    storyLayoutDpr = layoutDpr;
    const nextW = Math.max(1, Math.round((rect.width || window.innerWidth) * dpr));
    const nextH = Math.max(1, Math.round((rect.height || window.innerHeight) * dpr));
    const changed = storyCanvasEl.width !== nextW || storyCanvasEl.height !== nextH;
    if (changed) {
      storyCanvasEl.width = nextW;
      storyCanvasEl.height = nextH;
    }
    if (changed || dprChanged) {
      storyFrameCache.clear();
      lastStoryOverlayKey = "";
    }
    return changed;
  };

  const drawStoryOverlay = (storyInput: Parameters<typeof drawHomeScreenStory>[1]) => {
    if (!storyCanvasEl || !storyCtx) return;
    resizeStoryCanvas();
    const W = storyCanvasEl.width;
    const H = storyCanvasEl.height;
    const isWideOverlay = W > H;
    const overlayDevice = isWideOverlay ? storyInput.device : "mobile";
    const frameIndex = Math.round(clamp(storyInput.progress) * STORY_FRAME_STEPS);
    const cachedProgress = frameIndex / STORY_FRAME_STEPS;
    const connectorMotionActive = storyInput.progress < 0.22 && !reduceMotion;
    const cacheMotionKey = connectorMotionActive ? storyInput.motion?.toFixed(2) : "static";
    const overlaySourceAspect = screenCanvas.width / screenCanvas.height;
    const overlayTargetAspect = W / H;
    const sourceW = isWideOverlay
      ? overlayTargetAspect >= overlaySourceAspect
        ? Math.max(screenCanvas.width, W)
        : Math.round(Math.max(screenCanvas.height, H) * overlaySourceAspect)
      : W;
    const sourceH = isWideOverlay
      ? overlayTargetAspect >= overlaySourceAspect
        ? Math.round(Math.max(screenCanvas.width, W) / overlaySourceAspect)
        : Math.max(screenCanvas.height, H)
      : H;
    const cacheKey = [
      overlayDevice,
      theme,
      frameIndex,
      cacheMotionKey,
      sourceW,
      sourceH,
      storyLayoutDpr.toFixed(3),
      storyInput.now,
      storyInput.postsLabel,
      storyInput.stack,
      storyInput.contact,
    ].join("|");

    if (cacheKey === lastStoryOverlayKey) return;

    let cachedFrame = storyFrameCache.get(cacheKey);
    if (cachedFrame) {
      storyFrameCache.delete(cacheKey);
      storyFrameCache.set(cacheKey, cachedFrame);
    } else {
      cachedFrame = document.createElement("canvas");
      cachedFrame.width = sourceW;
      cachedFrame.height = sourceH;
      const cacheCtx = cachedFrame.getContext("2d");
      if (!cacheCtx) return;
      drawHomeScreenStory(cacheCtx, {
        ...storyInput,
        device: overlayDevice,
        progress: cachedProgress,
        pixelRatio: storyCanvasDpr,
        layoutPixelRatio: storyLayoutDpr,
      });
      storyFrameCache.set(cacheKey, cachedFrame);
      while (storyFrameCache.size > STORY_FRAME_CACHE_LIMIT) {
        const oldestKey = storyFrameCache.keys().next().value;
        if (!oldestKey) break;
        storyFrameCache.delete(oldestKey);
      }
    }

    storyCtx.setTransform(1, 0, 0, 1, 0, 0);
    storyCtx.clearRect(0, 0, W, H);
    storyCtx.imageSmoothingEnabled = true;
    storyCtx.imageSmoothingQuality = "high";
    if (isWideOverlay) {
      const scale = Math.max(W / cachedFrame.width, H / cachedFrame.height);
      const drawW = cachedFrame.width * scale;
      const drawH = cachedFrame.height * scale;
      storyCtx.drawImage(cachedFrame, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
    } else {
      storyCtx.drawImage(cachedFrame, 0, 0);
    }
    lastStoryOverlayKey = cacheKey;
  };

  // Screen canvas drawing
  const drawScreen = (targets?: { overlay?: boolean; texture?: boolean }, now = performance.now()) => {
    const drawOverlay = targets?.overlay ?? renderMode !== "room";
    const updateTexture = targets?.texture ?? renderMode !== "story";
    const ctx = screenCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const storyAutoPosts = (window as unknown as { __HOME_POSTS_LABEL?: string }).__HOME_POSTS_LABEL;
    const profileRows = Object.fromEntries(HOME_PROFILE.rows.map((row) => [row.label, row.value]));
    const storyProgress = reduceMotion ? 1 : clamp(homeProgress / STORY_PROGRESS_END);
    const storyInput: Parameters<typeof drawHomeScreenStory>[1] = {
      device: deviceClass,
      theme,
      progress: storyProgress,
      pixelRatio: 1,
      layoutPixelRatio: 1,
      motion: now * 0.001,
      now: formatNowBeijing(),
      stack: profileRows.stack ?? "Rust · TypeScript",
      contact: profileRows.contact ?? "lsy22@vip.qq.com",
      postsLabel: storyAutoPosts ?? "ongoing",
    };

    const textureStoryInput = updateTexture && renderMode === "room"
      ? { ...storyInput, progress: 1 }
      : storyInput;

    if (updateTexture) {
      drawHomeScreenStory(ctx, textureStoryInput);
    }
    if (updateTexture && introBackdropCtx && introBackdropTexture) {
      introBackdropCtx.setTransform(1, 0, 0, 1, 0, 0);
      drawHomeScreenBackdrop(introBackdropCtx, {
        theme,
        progress: storyProgress,
      });
      introBackdropTexture.needsUpdate = true;
    }
    if (updateTexture) {
      screenTexture.needsUpdate = true;
      lastTexturedStoryProgress = textureStoryInput.progress;
    }
    if (drawOverlay) drawStoryOverlay(storyInput);
    lastDrawnStoryProgress = storyProgress;

  };
  drawScreen();

  // ===== Resize =====
  const resize = () => {
    const rect = canvasEl.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    syncScreenIntroCamera();
    camera.updateProjectionMatrix();
    syncSceneOverlay();
    drawScreen();
  };
  resize();
  if (initialCameraSyncPending) {
    initialCameraSyncPending = false;
    syncCameraToScrollState(homeProgress);
  }
  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(canvasEl);
  applyHomeState(homeProgress);

  // ===== Input =====
  let hintHidden = false;
  const markInteracted = () => {
    if (hintHidden) return;
    hintHidden = true;
    hintEl?.classList.add("is-hidden");
  };

  let sceneInputActive = false;
  let canvasCapturesInput = false;
  let controlsConnected = false;
  let sceneCapturesInput = true;
  type MobileGestureIntent = "pending" | "scroll" | "orbit";
  let mobileGestureIntent: MobileGestureIntent | null = null;
  let mobileGesturePointerId: number | null = null;
  let mobileGestureStartX = 0;
  let mobileGestureStartY = 0;
  let mobileGestureLastX = 0;
  let mobileGestureLastY = 0;
  const mobileOrbitOffset = new THREE.Vector3();
  const mobileOrbitSpherical = new THREE.Spherical();

  const resetMobileGesture = () => {
    mobileGestureIntent = null;
    mobileGesturePointerId = null;
    if (useMobileCarrier && sceneInputActive) canvasEl.style.cursor = "grab";
  };

  const startMobileGesture = (e: PointerEvent) => {
    if (!useMobileCarrier || e.pointerType !== "touch" || !sceneInputActive) return;
    mobileGestureIntent = "pending";
    mobileGesturePointerId = e.pointerId;
    mobileGestureStartX = e.clientX;
    mobileGestureStartY = e.clientY;
    mobileGestureLastX = e.clientX;
    mobileGestureLastY = e.clientY;
  };

  const handleMobileGestureMove = (e: PointerEvent) => {
    if (!useMobileCarrier || e.pointerType !== "touch" || mobileGesturePointerId !== e.pointerId) return false;
    if (!sceneInputActive) {
      resetMobileGesture();
      return true;
    }

    const dx = e.clientX - mobileGestureStartX;
    const dy = e.clientY - mobileGestureStartY;
    if (mobileGestureIntent === "pending") {
      if (Math.hypot(dx, dy) < 9) return true;
      mobileGestureIntent = Math.abs(dy) >= Math.abs(dx) * 0.75 ? "scroll" : "orbit";
      canvasEl.style.cursor = mobileGestureIntent === "orbit" ? "grabbing" : "default";
    }

    e.preventDefault();
    if (mobileGestureIntent === "scroll") {
      window.scrollBy({ top: mobileGestureLastY - e.clientY, left: 0, behavior: "auto" });
      syncScrollProgress();
    } else if (mobileGestureIntent === "orbit") {
      const deltaX = e.clientX - mobileGestureLastX;
      mobileOrbitOffset.subVectors(camera.position, controls.target);
      mobileOrbitSpherical.setFromVector3(mobileOrbitOffset);
      mobileOrbitSpherical.theta -= deltaX * 0.0052;
      mobileOrbitSpherical.phi = clamp(mobileOrbitSpherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
      mobileOrbitOffset.setFromSpherical(mobileOrbitSpherical);
      camera.position.copy(controls.target).add(mobileOrbitOffset);
      camera.lookAt(controls.target);
      markInteracted();
    }

    mobileGestureLastX = e.clientX;
    mobileGestureLastY = e.clientY;
    return true;
  };

  const syncCanvasInputMode = (interactive: boolean) => {
    if (canvasCapturesInput === interactive) return;
    canvasCapturesInput = interactive;
    canvasEl.style.pointerEvents = interactive ? "auto" : "none";
    canvasEl.style.touchAction = interactive && useMobileCarrier ? "none" : "pan-y";
    if (!interactive) {
      canvasEl.style.cursor = "default";
      resetMobileGesture();
    }
  };
  syncCanvasInputMode(false);

  const syncSceneInputMode = (interactive: boolean) => {
    if (!sceneEl || sceneCapturesInput === interactive) return;
    sceneCapturesInput = interactive;
    sceneEl.style.pointerEvents = interactive ? "auto" : "none";
    sceneEl.style.touchAction = interactive && useMobileCarrier ? "none" : "pan-y";
  };
  syncSceneInputMode(false);

  const syncControlsConnection = (interactive: boolean) => {
    const shouldConnect = interactive && !useMobileCarrier;
    if (controlsConnected === shouldConnect) return;
    controlsConnected = shouldConnect;
    if (shouldConnect) {
      controls.connect(canvasEl);
    } else {
      controls.disconnect();
    }
  };
  syncControlsConnection(false);

  const pointerMoveHandler = (e: PointerEvent) => {
    handleMobileGestureMove(e);
  };
  canvasEl.addEventListener("pointermove", pointerMoveHandler);
  canvasEl.addEventListener("pointerleave", () => {
    resetMobileGesture();
    canvasEl.style.cursor = sceneInputActive ? "grab" : "default";
  });
  canvasEl.style.cursor = "default";

  const pointerDownHandler = (e: PointerEvent) => {
    startMobileGesture(e);
  };
  canvasEl.addEventListener("pointerdown", pointerDownHandler);

  const pointerUpHandler = (e: PointerEvent) => {
    if (useMobileCarrier && e.pointerType === "touch" && mobileGestureIntent !== null) resetMobileGesture();
  };
  canvasEl.addEventListener("pointerup", pointerUpHandler);
  canvasEl.addEventListener("pointercancel", resetMobileGesture);

  const passWheelThrough = (e: WheelEvent) => {
    if (!controlsConnected) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.scrollBy({ top: e.deltaY, left: 0, behavior: "auto" });
  };
  canvasEl.addEventListener("wheel", passWheelThrough, { passive: false, capture: true });
  sceneEl?.addEventListener("wheel", passWheelThrough, { passive: false, capture: true });

  // ===== Animation loop =====
  let rafId = 0;
  let lastFrame = performance.now();

  // Arm AI — each arm picks a target key, lerps its shoulder rotation toward it,
  // and dips the elbow onto that specific key at the end of the move.
  type ArmAI = {
    startRotZ: number;
    targetRotZ: number;
    currentRotZ: number;
    targetKeyIdx: number;
    moveStart: number;
    moveEnd: number;
    holdUntil: number;
    phase: "moving" | "hold";
    dipValue: number;
  };
  const leftAI: ArmAI = {
    startRotZ: 0.06, targetRotZ: 0.06, currentRotZ: 0.06,
    targetKeyIdx: 0, moveStart: 0, moveEnd: 0,
    holdUntil: performance.now(), phase: "hold", dipValue: 0,
  };
  const rightAI: ArmAI = {
    startRotZ: -0.06, targetRotZ: -0.06, currentRotZ: -0.06,
    targetKeyIdx: 0, moveStart: 0, moveEnd: 0,
    holdUntil: performance.now() + 120, phase: "hold", dipValue: 0,
  };
  const planNextKey = (ai: ArmAI, side: -1 | 1, nowTs: number) => {
    // Each arm only targets keys near its own shoulder — narrow home-row range
    // so the hand never over-reaches beyond the keyboard.
    const shoulderWorldX = 0.15 + 0.26 * side;
    const candidates = keyStates
      .map((s, i) => ({ s, i }))
      .filter((k) => k.s.side === side)
      .filter((k) => {
        const worldX = 0.1 + k.s.x;
        return Math.abs(worldX - shoulderWorldX) < 0.18;
      });
    if (!candidates.length) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const keyWorldX = 0.1 + pick.s.x;
    const deltaX = keyWorldX - shoulderWorldX;
    const baseRotZ = -0.06 * side;
    // SIGN FIX: for right arm (side=1), a key to the RIGHT of shoulder (deltaX > 0)
    // needs POSITIVE rotation.z to swing arm outward (previous code had wrong sign).
    const raw = baseRotZ + side * deltaX * 1.2;
    const targetRotZ = clamp(raw, -0.3, 0.3);
    ai.startRotZ = ai.currentRotZ;
    ai.targetRotZ = targetRotZ;
    ai.targetKeyIdx = pick.i;
    ai.moveStart = nowTs;
    ai.moveEnd = nowTs + 180 + Math.random() * 220;
    ai.phase = "moving";
  };

  const outdoorFogColor = new THREE.Color();

  const animate = () => {
    const now = performance.now();
    const dt = Math.min(64, now - lastFrame);
    lastFrame = now;

    const nextProgress = scrollTargetProgress;
    const prevProgress = homeProgress;
    const prevMode = renderMode;
    homeProgress = nextProgress;
    renderMode = getRenderMode(homeProgress);
    const storyProgress = reduceMotion ? 1 : clamp(homeProgress / STORY_PROGRESS_END);
    const progressChanged = Math.abs(prevProgress - homeProgress) > 0.0005;
    const modeChanged = prevMode !== renderMode;
    if (
      modeChanged ||
      (progressChanged &&
        renderMode !== "room" &&
        Math.abs(storyProgress - lastDrawnStoryProgress) >= SCREEN_REDRAW_STEP)
    ) {
      needScreenRedraw = true;
    }
    if (renderMode === "room" && lastTexturedStoryProgress < 0.999) needScreenRedraw = true;

    applyHomeState(homeProgress);
    syncSceneOverlay();

    if (renderMode === "story") {
      if (controls.enabled) controls.enabled = false;
      syncSceneInputMode(false);
      syncCanvasInputMode(false);
      syncControlsConnection(false);
      sceneInputActive = false;
      const connectorMotionActive = storyProgress < 0.22 && !reduceMotion;
      if (connectorMotionActive) needScreenRedraw = true;
      if (needScreenRedraw) {
        needScreenRedraw = false;
        drawScreen({ overlay: true, texture: false }, now);
      }
      rafId = requestAnimationFrame(animate);
      return;
    }

    if (homeProgress >= INTERACTIVE_PROGRESS) {
      cameraRejoinActive = false;
      cameraInertialCatchup = false;
    }
    const shouldStartCameraRejoin =
      prevProgress >= INTERACTIVE_PROGRESS &&
      homeProgress < INTERACTIVE_PROGRESS;
    if (shouldStartCameraRejoin) captureCameraRejoin();
    if (homeProgress <= CAMERA_REJOIN_START || renderMode !== "room") cameraRejoinActive = false;

    const outsideReveal = easeInOutSine(clamp((homeProgress - 0.66) / 0.3));
    const roomReveal = easeInOutSine(clamp((homeProgress - 0.7) / 0.26));
    if (introBackdropMaterial) {
      const backdropFade = 1 - easeInOutSine(clamp((homeProgress - 0.56) / 0.18));
      introBackdropMaterial.opacity = backdropFade;
      introBackdropMaterial.visible = backdropFade > 0.01;
    }
    const inCameraRejoin = cameraRejoinActive && homeProgress > CAMERA_REJOIN_START && homeProgress < CAMERA_REJOIN_END;
    const controlsShouldEnable = homeProgress >= INTERACTIVE_PROGRESS;
    if (!controlsShouldEnable) sceneControlActivated = false;
    syncSceneOverlay();
    syncSceneInputMode(controlsShouldEnable);
    syncCanvasInputMode(controlsShouldEnable);
    syncControlsConnection(controlsShouldEnable);
    sceneInputActive = controlsShouldEnable;

    if (controls.enabled !== controlsShouldEnable) {
      controls.enabled = controlsShouldEnable;
      if (!controlsShouldEnable) {
        canvasEl.style.cursor = "default";
      } else {
        if (!sceneControlActivated) {
          getScrollCameraState(1, desiredCameraPos, desiredCameraTarget);
          camera.position.copy(desiredCameraPos);
          controls.target.copy(desiredCameraTarget);
          camera.fov = roomFov;
          camera.lookAt(controls.target);
          camera.updateProjectionMatrix();
          sceneControlActivated = true;
        }
        canvasEl.style.cursor = "grab";
        markInteracted();
      }
    }

    // Typewriter tick (types → holds → deletes → idle → next line)
    const typerTarget = TYPEWRITER_LINES[typerIndex];
    if (typerPhase === "typing") {
      if (now - typerLastTick >= TYPER_SPEED_TYPE) {
        typerLastTick = now;
        if (typerText.length < typerTarget.length) {
          typerText = typerTarget.slice(0, typerText.length + 1);
          if (renderMode !== "room") needScreenRedraw = true;
        } else {
          typerPhase = "hold";
          typerHoldUntil = now + TYPER_HOLD_MS;
        }
      }
    } else if (typerPhase === "hold") {
      if (now >= typerHoldUntil) {
        typerPhase = "deleting";
        typerLastTick = now;
      }
    } else if (typerPhase === "deleting") {
      if (now - typerLastTick >= TYPER_SPEED_DELETE) {
        typerLastTick = now;
        if (typerText.length > 0) {
          typerText = typerText.slice(0, -1);
          if (renderMode !== "room") needScreenRedraw = true;
        } else {
          typerPhase = "idle";
          typerHoldUntil = now + TYPER_IDLE_MS;
        }
      }
    } else if (typerPhase === "idle") {
      if (now >= typerHoldUntil) {
        typerIndex = (typerIndex + 1) % TYPEWRITER_LINES.length;
        typerPhase = "typing";
        typerLastTick = now;
      }
    }
    // Time tick — redraw when formatted time string changes (minute change)
    const newTimeStr = formatNowBeijing();
    if (newTimeStr !== lastTimeStr) {
      lastTimeStr = newTimeStr;
      if (renderMode !== "room") needScreenRedraw = true;
    }

    const outdoor = OUTDOOR_PALETTES[theme];
    const objectSceneLight = theme === "dark" ? 0xcfd5dc : 0xffffff;
    outdoorFogColor.setHex(outdoor.fogTint);

    sunLight.color.setHex(objectSceneLight);
    sunLight.intensity = lerp(0.75, theme === "dark" ? 1.05 : 1.22, outsideReveal);
    ambient.color.setHex(objectSceneLight);
    ambient.intensity = theme === "dark" ? 0.46 : 0.62;
    windowLight.color.setHex(objectSceneLight);
    windowLight.intensity = lerp(0.2, theme === "dark" ? 0.38 : 0.46, outsideReveal);
    const screenLightMax = useMobileCarrier
      ? theme === "dark"
        ? 0.018
        : 0.032
      : theme === "dark"
        ? 0.18
        : 0.3;
    screenLight.intensity = lerp(0, screenLightMax, easeInOutSine(clamp((homeProgress - 0.8) / 0.14)));
    if (scene.fog) {
      const fog = scene.fog as THREE.Fog;
      fog.color
          .setHex(theme === "dark" ? 0x111315 : 0xf7f8f7)
          .lerp(outdoorFogColor, outsideReveal);
      fog.near = lerp(18, 11, outsideReveal);
      fog.far = lerp(34, 24, outsideReveal);
    }

    scene.background = new THREE.Color(THEMES[theme].screenBg).lerp(
      new THREE.Color(THEMES[theme].sceneBg),
      outsideReveal,
    );
    renderer.toneMappingExposure = lerp(1.28, 1.05, outsideReveal);
    const introRoomGhost = useMobileCarrier ? 0 : 1;
    mats.floor.opacity = lerp(0.08 * introRoomGhost, 1, outsideReveal);
    mats.wall.opacity = 0;
    mats.deskTop.opacity = outsideReveal;
    mats.deskLeg.opacity = outsideReveal;
    mats.laptopBody.opacity = outsideReveal;
    mats.laptopFrame.opacity = outsideReveal;
    mats.personSkin.opacity = roomReveal;
    mats.personHair.opacity = roomReveal;
    mats.personCloth.opacity = roomReveal;
    mats.personPants.opacity = roomReveal;
    mats.personShoe.opacity = roomReveal;
    mats.chairShell.opacity = roomReveal;
    mats.computerShell.opacity = outsideReveal;
    mats.key.opacity = outsideReveal;
    syncRevealMaterialTransparency(renderMode === "room" && outsideReveal > 0.995 && roomReveal > 0.995);

    // Screen cursor blink & redraw
    if (renderMode !== "room" && now - cursorLastToggle > 520) {
      cursorLastToggle = now;
      cursorOn = !cursorOn;
      needScreenRedraw = true;
    }
    if (needScreenRedraw) {
      needScreenRedraw = false;
      drawScreen(undefined, now);
    }

    // Person idle motion
    if (useMobileCarrier) {
      headGroup.rotation.x = Math.sin(now * 0.00035) * 0.012 + 0.08;
      headGroup.rotation.y = 0;
      hair.rotation.set(0, 0, 0);
      torso.rotation.y = 0;
      torso.rotation.x = -0.18;
      bodyGroup.rotation.y = 0;
      bodyGroup.rotation.x = -0.08;
    } else {
      headGroup.rotation.x = Math.sin(now * 0.0004) * 0.018 + 0.08;
      headGroup.rotation.y = Math.sin(now * 0.0003) * 0.022 - 0.03;
      hair.rotation.set(0, 0, 0);
      torso.rotation.y = Math.sin(now * 0.0003) * 0.015;
      torso.rotation.x = 0;
      bodyGroup.rotation.y = Math.sin(now * 0.0003) * 0.012;
      bodyGroup.rotation.x = Math.sin(now * 0.00035) * 0.008;
    }

    if (!reduceMotion && !useMobileCarrier) {
      for (const ai of [leftAI, rightAI]) {
        ai.dipValue *= 0.72;
        if (now >= ai.holdUntil) {
          planNextKey(ai, ai === leftAI ? -1 : 1, now);
          ai.holdUntil = now + 220 + Math.random() * 280;
        }
        if (ai.targetKeyIdx >= 0) keyStates[ai.targetKeyIdx].press = Math.max(keyStates[ai.targetKeyIdx].press, 0.45);
      }
    }
    if (!useMobileCarrier) {
      for (let i = 0; i < keyStates.length; i++) keyStates[i].press *= 0.8;
    }

    // Update key matrices
    if (!useMobileCarrier) {
      let ki = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const s = keyStates[ki];
          keyDummy.position.set(s.x, s.baseY - s.press * 0.009, s.z);
          keyDummy.scale.set(1, 1, 1);
          keyDummy.updateMatrix();
          keyMesh.setMatrixAt(ki, keyDummy.matrix);
          ki++;
        }
      }
      {
        const s = keyStates[ki];
        keyDummy.position.set(s.x, s.baseY - s.press * 0.009, s.z);
        keyDummy.scale.set(spaceW / keyW, 1, 1);
        keyDummy.updateMatrix();
        keyMesh.setMatrixAt(ki, keyDummy.matrix);
        keyDummy.scale.set(1, 1, 1);
      }
      keyMesh.instanceMatrix.needsUpdate = true;
    }

    if (!controls.enabled) {
      const desiredFov = inCameraRejoin
        ? getCameraRejoinState(homeProgress, desiredCameraPos, desiredCameraTarget)
        : lerp(
            screenFov,
            roomFov,
            getScrollCameraState(homeProgress, desiredCameraPos, desiredCameraTarget),
          );
      const followRate = inCameraRejoin ? CAMERA_REJOIN_FOLLOW_RATE : CAMERA_CATCHUP_FOLLOW_RATE;
      const snapCamera = !cameraInertialCatchup && !inCameraRejoin;
      applyCameraPose(desiredFov, dt, snapCamera, followRate);
      if (cameraInertialCatchup && !inCameraRejoin && isCameraCloseToDesired(desiredFov)) {
        cameraInertialCatchup = false;
      }
    }
    camera.updateProjectionMatrix();

    if (controls.enabled) {
      controls.update();
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  };

  if ("fonts" in document) {
    Promise.all([
      document.fonts.load("300 240px Fraunces"),
      document.fonts.load("400 26px 'JetBrains Mono'"),
      document.fonts.load("400 64px 'Noto Serif SC'"),
    ]).then(() => {
      storyFrameCache.clear();
      lastStoryOverlayKey = "";
      drawScreen();
    }).catch(() => {});
  }

  drawScreen();
  rafId = requestAnimationFrame(animate);

  // ===== Cleanup =====
  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("scroll", syncScrollProgress);
    window.removeEventListener("resize", handleBreakpointResize);
    canvasEl.removeEventListener("pointermove", pointerMoveHandler);
    canvasEl.removeEventListener("pointerdown", pointerDownHandler);
    canvasEl.removeEventListener("pointerup", pointerUpHandler);
    canvasEl.removeEventListener("pointercancel", resetMobileGesture);
    canvasEl.removeEventListener("wheel", passWheelThrough, { capture: true });
    sceneEl?.removeEventListener("wheel", passWheelThrough, { capture: true });
    themeObserver.disconnect();
    resizeObs.disconnect();
    controls.dispose();
    storyFrameCache.clear();

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mm = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mm)) mm.forEach((m) => m.dispose());
        else mm.dispose();
      }
    });
    screenTexture.dispose();
    introBackdropTexture?.dispose();
    renderer.dispose();
    docEl.style.removeProperty("--home-progress");
    docEl.removeAttribute("data-home-header-phase");
    docEl.style.removeProperty("--scene-opacity");
    docEl.style.removeProperty("--story-opacity");
    docEl.style.removeProperty("--story-progress");
    docEl.style.removeProperty("--story-local");
    sceneEl?.style.removeProperty("--home-progress");
    if (sceneEl) sceneEl.style.pointerEvents = "";
    if (sceneEl) sceneEl.style.touchAction = "";
    canvasEl.style.touchAction = "";
    sceneEl?.removeAttribute("data-home-phase");
    storyEl?.removeAttribute("data-story-step");
    storyEl?.style.removeProperty("--story-progress");
    storyEl?.style.removeProperty("--story-local");
    cueEl?.style.removeProperty("--cue-progress");
    cueEl?.removeAttribute("data-home-visible");
    cueEl?.removeAttribute("data-cue-mode");
    if (cuePercentEl) cuePercentEl.textContent = "0%";

    const w = window as unknown as Record<string, unknown>;
    if (w[CLEANUP_KEY] === cleanup) delete w[CLEANUP_KEY];
  };

  (window as unknown as Record<string, () => void>)[CLEANUP_KEY] = cleanup;
  document.addEventListener("astro:before-swap", cleanup, { once: true });
  document.addEventListener("swup:visit:start", cleanup, { once: true });

  return cleanup;
}
