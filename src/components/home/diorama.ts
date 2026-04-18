import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HOME_PROFILE } from "@/consts";

const CLEANUP_KEY = "__homeDioramaCleanup";

type ThemeName = "light" | "dark";

type SeasonPal = {
  sun: number;
  sunI: number;
  amb: number;
  ambI: number;
  sky: number;
  plant: number;
  fogTint: number;
};

const SEASONS_LIGHT: SeasonPal[] = [
  { sun: 0xfff4e0, sunI: 1.55, amb: 0xfff4e6, ambI: 0.58, sky: 0xd8ecff, plant: 0x9fc970, fogTint: 0xeee4d0 },
  { sun: 0xfff8ea, sunI: 1.7,  amb: 0xfffaee, ambI: 0.62, sky: 0x9cd2f0, plant: 0x5a8e3e, fogTint: 0xf2e8d4 },
  { sun: 0xfff0dc, sunI: 1.5,  amb: 0xfff0e0, ambI: 0.56, sky: 0xb4c4d4, plant: 0xc8742a, fogTint: 0xd8d4cc },
  { sun: 0xf0f2f8, sunI: 1.35, amb: 0xeef0f4, ambI: 0.52, sky: 0xc4cfdc, plant: 0x8b5a32, fogTint: 0xdce0e4 },
];

const SEASONS_DARK: SeasonPal[] = [
  { sun: 0xffe4c8, sunI: 0.7,  amb: 0x4a4238, ambI: 0.4,  sky: 0x2a3a5a, plant: 0x6f9450, fogTint: 0x1a2230 },
  { sun: 0xfff0d8, sunI: 0.85, amb: 0x4a483c, ambI: 0.44, sky: 0x1a3a5a, plant: 0x3a6e28, fogTint: 0x182638 },
  { sun: 0xffd4a0, sunI: 0.7,  amb: 0x4a3a30, ambI: 0.4,  sky: 0x2a1e14, plant: 0x9a5418, fogTint: 0x181210 },
  { sun: 0xd8dcec, sunI: 0.55, amb: 0x3a3e4a, ambI: 0.38, sky: 0x1a2636, plant: 0x5a3a20, fogTint: 0x0c1628 },
];

type Theme = {
  floor: number;
  wall: number;
  ceiling: number;
  deskTop: number;
  deskLeg: number;
  lampBody: number;
  lampShade: number;
  lampGlow: number;
  laptopBody: number;
  laptopFrame: number;
  bookA: number;
  bookB: number;
  bookC: number;
  tvBody: number;
  tvEmissive: number;
  pot: number;
  personSkin: number;
  personHair: number;
  personCloth: number;
  screenBg: string;
  screenText: string;
  screenMuted: string;
  screenAccent: string;
  keyTop: number;
  windowFrame: number;
  windowSill: number;
  sceneBg: number;
};

const THEMES: Record<ThemeName, Theme> = {
  light: {
    floor: 0xb89068,
    wall: 0xe8dfc8,
    ceiling: 0xf2ebd8,
    deskTop: 0xb58863,
    deskLeg: 0x6b4a32,
    lampBody: 0x2a2420,
    lampShade: 0xe4a94a,
    lampGlow: 0xffd58a,
    laptopBody: 0x8a8d94,
    laptopFrame: 0x3a3e48,
    bookA: 0xb04444,
    bookB: 0x3e7d6a,
    bookC: 0xd4a94a,
    tvBody: 0x2a2a30,
    tvEmissive: 0xff8866,
    pot: 0x9a6b4a,
    personSkin: 0xeec8a8,
    personHair: 0x241811,
    personCloth: 0x4a6a8a,
    screenBg: "#0e0f14",
    screenText: "#f5f0e6",
    screenMuted: "#b8ac98",
    screenAccent: "#e4b95a",
    keyTop: 0x2a2a30,
    windowFrame: 0x6b4a32,
    windowSill: 0xa27c54,
    sceneBg: 0xede4cf,
  },
  dark: {
    floor: 0x4a3824,
    wall: 0x152131,
    ceiling: 0x1a2838,
    deskTop: 0x5a4432,
    deskLeg: 0x2a1e14,
    lampBody: 0x12100e,
    lampShade: 0xffb866,
    lampGlow: 0xffb866,
    laptopBody: 0x252a30,
    laptopFrame: 0x14161a,
    bookA: 0x7a3030,
    bookB: 0x2a5a4a,
    bookC: 0xb08830,
    tvBody: 0x0a0a10,
    tvEmissive: 0x4fbba7,
    pot: 0x5a3a28,
    personSkin: 0xa88060,
    personHair: 0x100a08,
    personCloth: 0x2a3a5a,
    screenBg: "#090a10",
    screenText: "#f5f0e6",
    screenMuted: "#9d8e7b",
    screenAccent: "#ffc878",
    keyTop: 0x0e0e12,
    windowFrame: 0x2a1e14,
    windowSill: 0x3a2a1c,
    sceneBg: 0x080c14,
  },
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type Interactive = {
  object: THREE.Object3D;
  label: string;
  route: string;
  basePos: THREE.Vector3;
};

export function initDiorama() {
  if (typeof window === "undefined") return () => {};

  const prev = (window as unknown as Record<string, (() => void) | undefined>)[CLEANUP_KEY];
  if (typeof prev === "function") prev();

  const canvasEl = document.querySelector<HTMLCanvasElement>("[data-diorama-canvas]");
  if (!canvasEl) return () => {};

  const hintEl = document.querySelector<HTMLElement>("[data-diorama-hint]");
  const tooltip = document.querySelector<HTMLElement>("[data-diorama-tooltip]");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd8ecff, 7, 16);

  // ===== Camera (inside-the-room view, wide framing) =====
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(1.15, 1.95, 1.55);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
  controls.target.set(0, 0.5, -0.6);
  controls.minPolarAngle = Math.PI * 0.22;
  controls.maxPolarAngle = Math.PI * 0.5;
  // No azimuth limits — user can orbit freely around the diorama
  controls.rotateSpeed = 0.75;

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

  const lampLight = new THREE.PointLight(0xffd58a, 0.85, 4, 1.6);
  lampLight.position.set(-1.1, 0.85, -0.6);
  scene.add(lampLight);

  const screenLight = new THREE.PointLight(0xede8df, 0.3, 1.2, 1.5);
  screenLight.position.set(0.1, 0.6, -0.25);
  scene.add(screenLight);

  const tvLight = new THREE.PointLight(0xff8866, 0.3, 2.5, 1.6);
  tvLight.position.set(-2.8, 1.3, -0.5);
  scene.add(tvLight);

  // ===== Materials =====
  const mats = {
    floor: new THREE.MeshStandardMaterial({ color: 0xb89068, roughness: 0.92 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.96 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf2ebd8, roughness: 0.98 }),
    deskTop: new THREE.MeshToonMaterial({ color: 0xb58863 }),
    deskLeg: new THREE.MeshToonMaterial({ color: 0x6b4a32 }),
    lampBody: new THREE.MeshToonMaterial({ color: 0x2a2420 }),
    lampShade: new THREE.MeshToonMaterial({ color: 0xe4a94a, side: THREE.DoubleSide }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffeaa0, emissive: 0xffd58a, emissiveIntensity: 0.5, roughness: 0.25 }),
    laptopBody: new THREE.MeshToonMaterial({ color: 0x8a8d94 }),
    laptopFrame: new THREE.MeshToonMaterial({ color: 0x3a3e48 }),
    screen: null as unknown as THREE.MeshBasicMaterial,
    windowFrame: new THREE.MeshToonMaterial({ color: 0x6b4a32 }),
    windowSill: new THREE.MeshToonMaterial({ color: 0xa27c54 }),
    sky: new THREE.MeshBasicMaterial({ color: 0xd8ecff }),
    books: [
      new THREE.MeshToonMaterial({ color: 0xb04444 }),
      new THREE.MeshToonMaterial({ color: 0x3e7d6a }),
      new THREE.MeshToonMaterial({ color: 0xd4a94a }),
    ],
    tvBody: new THREE.MeshToonMaterial({ color: 0x2a2a30 }),
    pot: new THREE.MeshToonMaterial({ color: 0x9a6b4a }),
    leaf: new THREE.MeshToonMaterial({ color: 0x9fc970 }),
    personSkin: new THREE.MeshToonMaterial({ color: 0xeec8a8 }),
    personHair: new THREE.MeshToonMaterial({ color: 0x241811 }),
    personCloth: new THREE.MeshToonMaterial({ color: 0x4a6a8a }),
    key: new THREE.MeshToonMaterial({ color: 0x2a2a30 }),
    petal: new THREE.MeshBasicMaterial({ color: 0xffc8dc, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    rain: new THREE.MeshBasicMaterial({ color: 0xaec8e0, transparent: true, opacity: 0 }),
    mapleLeaf: new THREE.MeshBasicMaterial({ color: 0xd46830, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    snow: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  };

  // ===== Room =====
  const roomX = 3.2;
  const roomFloorY = -0.5;
  const roomCeilingY = 3.4;
  const roomBackZ = -2.8;
  const roomFrontZ = 1.6;

  // Floor (bounded interior)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomX * 2, roomFrontZ - roomBackZ),
    mats.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, roomFloorY, (roomBackZ + roomFrontZ) / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomX * 2, roomFrontZ - roomBackZ),
    mats.ceiling,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomCeilingY, (roomBackZ + roomFrontZ) / 2);
  scene.add(ceiling);

  // Left wall
  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomFrontZ - roomBackZ, roomCeilingY - roomFloorY),
    mats.wall,
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomX, (roomFloorY + roomCeilingY) / 2, (roomBackZ + roomFrontZ) / 2);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right wall
  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomFrontZ - roomBackZ, roomCeilingY - roomFloorY),
    mats.wall,
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomX, (roomFloorY + roomCeilingY) / 2, (roomBackZ + roomFrontZ) / 2);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Back wall: 4 strips framing a window opening
  const winW = 1.9;
  const winH = 1.5;
  const winCx = 0;
  const winCy = 1.55;
  const wL = winCx - winW / 2;
  const wR = winCx + winW / 2;
  const wB = winCy - winH / 2;
  const wT = winCy + winH / 2;

  const topStripH = roomCeilingY - wT;
  const topStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(roomX * 2, topStripH),
    mats.wall,
  );
  topStrip.position.set(0, (wT + roomCeilingY) / 2, roomBackZ);
  topStrip.receiveShadow = true;
  scene.add(topStrip);

  const botStripH = wB - roomFloorY;
  const botStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(roomX * 2, botStripH),
    mats.wall,
  );
  botStrip.position.set(0, (wB + roomFloorY) / 2, roomBackZ);
  botStrip.receiveShadow = true;
  scene.add(botStrip);

  const sideStripW = roomX - winW / 2;
  const leftStripBack = new THREE.Mesh(
    new THREE.PlaneGeometry(sideStripW, winH),
    mats.wall,
  );
  leftStripBack.position.set(-roomX + sideStripW / 2, winCy, roomBackZ);
  leftStripBack.receiveShadow = true;
  scene.add(leftStripBack);

  const rightStripBack = new THREE.Mesh(
    new THREE.PlaneGeometry(sideStripW, winH),
    mats.wall,
  );
  rightStripBack.position.set(roomX - sideStripW / 2, winCy, roomBackZ);
  rightStripBack.receiveShadow = true;
  scene.add(rightStripBack);

  // ===== Window (redesigned: thicker frame, 4 panes, sill) =====
  const winFrame = new THREE.Group();
  const frameT = 0.11;
  const frameDepth = 0.12;

  // Outer frame (around opening)
  const outerTop = new THREE.Mesh(
    new THREE.BoxGeometry(winW + frameT * 2, frameT, frameDepth),
    mats.windowFrame,
  );
  outerTop.position.set(winCx, wT + frameT / 2, roomBackZ + 0.02);
  outerTop.castShadow = true;
  winFrame.add(outerTop);

  const outerBot = new THREE.Mesh(
    new THREE.BoxGeometry(winW + frameT * 2, frameT, frameDepth),
    mats.windowFrame,
  );
  outerBot.position.set(winCx, wB - frameT / 2, roomBackZ + 0.02);
  winFrame.add(outerBot);

  const outerL = new THREE.Mesh(
    new THREE.BoxGeometry(frameT, winH + frameT * 2, frameDepth),
    mats.windowFrame,
  );
  outerL.position.set(wL - frameT / 2, winCy, roomBackZ + 0.02);
  winFrame.add(outerL);

  const outerR = new THREE.Mesh(
    new THREE.BoxGeometry(frameT, winH + frameT * 2, frameDepth),
    mats.windowFrame,
  );
  outerR.position.set(wR + frameT / 2, winCy, roomBackZ + 0.02);
  winFrame.add(outerR);

  // Cross mullions: vertical + horizontal → 4 panes
  const mullT = 0.045;
  const vMullion = new THREE.Mesh(
    new THREE.BoxGeometry(mullT, winH, frameDepth * 0.7),
    mats.windowFrame,
  );
  vMullion.position.set(winCx, winCy, roomBackZ + 0.04);
  winFrame.add(vMullion);

  const hMullion = new THREE.Mesh(
    new THREE.BoxGeometry(winW, mullT, frameDepth * 0.7),
    mats.windowFrame,
  );
  hMullion.position.set(winCx, winCy, roomBackZ + 0.04);
  winFrame.add(hMullion);

  // Window sill (inside room, small plank below window)
  const sillW = winW + frameT * 2 + 0.18;
  const sillDepth = 0.22;
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(sillW, 0.05, sillDepth),
    mats.windowSill,
  );
  sill.position.set(winCx, wB - frameT - 0.025, roomBackZ + sillDepth / 2 - 0.02);
  sill.castShadow = true;
  sill.receiveShadow = true;
  winFrame.add(sill);

  scene.add(winFrame);

  // Window hitbox for raycast
  const windowHitbox = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  windowHitbox.position.set(winCx, winCy, roomBackZ + 0.05);
  scene.add(windowHitbox);

  // ===== Outside (sky + sun + clouds + particles) =====
  const skyPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 9),
    mats.sky,
  );
  skyPlane.position.set(0, 2, roomBackZ - 3);
  scene.add(skyPlane);

  // Sun (bright disc, visible through window on sunny seasons)
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffe8a4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  sunDisc.position.set(0.7, 2.8, roomBackZ - 2.6);
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffd880,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  sunGlow.position.set(0.7, 2.8, roomBackZ - 2.65);
  scene.add(sunGlow);

  // Drifting clouds (soft planes) — always present, cross-fade intensity by season
  const cloudsGroup = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  type CloudData = { mesh: THREE.Mesh; speed: number; baseY: number };
  const cloudData: CloudData[] = [];
  for (let i = 0; i < 5; i++) {
    const w = 1.2 + Math.random() * 0.8;
    const h = 0.35 + Math.random() * 0.2;
    const geo = new THREE.PlaneGeometry(w, h);
    const cloud = new THREE.Mesh(geo, cloudMat);
    const x = (i - 2) * 1.8 + (Math.random() - 0.5) * 0.6;
    const y = 2.6 + Math.random() * 0.8;
    const z = roomBackZ - 2.4 - i * 0.18;
    cloud.position.set(x, y, z);
    cloudData.push({ mesh: cloud, speed: 0.03 + Math.random() * 0.05, baseY: y });
    cloudsGroup.add(cloud);
  }
  scene.add(cloudsGroup);

  // ===== Seasonal particle systems =====
  const particleCount = window.innerWidth < 768 ? 28 : 60;

  function makePetalGeo() {
    // soft teardrop oval
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.055);
    shape.bezierCurveTo(0.05, 0.04, 0.035, -0.03, 0, -0.055);
    shape.bezierCurveTo(-0.035, -0.03, -0.05, 0.04, 0, 0.055);
    return new THREE.ShapeGeometry(shape, 8);
  }
  function makeRainGeo() {
    return new THREE.PlaneGeometry(0.006, 0.16);
  }
  function makeMapleGeo() {
    // stylized 5-pointed leaf
    const shape = new THREE.Shape();
    const points: [number, number][] = [
      [0, 0.09], [0.05, 0.055], [0.085, 0.065], [0.06, 0.01],
      [0.1, -0.02], [0.055, -0.03], [0.035, -0.09], [0, -0.05],
      [-0.035, -0.09], [-0.055, -0.03], [-0.1, -0.02], [-0.06, 0.01],
      [-0.085, 0.065], [-0.05, 0.055], [0, 0.09],
    ];
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    return new THREE.ShapeGeometry(shape);
  }
  function makeSnowGeo() {
    return new THREE.CircleGeometry(0.03, 6);
  }

  type ParticleSystem = {
    mesh: THREE.InstancedMesh;
    material: THREE.MeshBasicMaterial;
    positions: Float32Array;
    rotations: Float32Array;
    rotVel: Float32Array;
    phases: Float32Array;
    fall: number;
    sway: number;
    tumble: boolean;
    rotateFace: boolean; // rain: face camera (no rotation)
  };

  function buildParticleSystem(
    geo: THREE.BufferGeometry,
    mat: THREE.MeshBasicMaterial,
    fall: number,
    sway: number,
    tumble: boolean,
    rotateFace: boolean,
  ): ParticleSystem {
    const mesh = new THREE.InstancedMesh(geo, mat, particleCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const positions = new Float32Array(particleCount * 3);
    const rotations = new Float32Array(particleCount);
    const rotVel = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 5 - 0.3;
      positions[i * 3 + 2] = roomBackZ - 0.6 - Math.random() * 2.4;
      rotations[i] = Math.random() * Math.PI * 2;
      rotVel[i] = (Math.random() - 0.5) * 0.05;
      phases[i] = Math.random() * Math.PI * 2;
    }
    scene.add(mesh);
    return { mesh, material: mat, positions, rotations, rotVel, phases, fall, sway, tumble, rotateFace };
  }

  const particleSystems = {
    spring: buildParticleSystem(makePetalGeo(), mats.petal, 0.3, 0.55, true, false),
    summer: buildParticleSystem(makeRainGeo(), mats.rain, 1.8, 0.02, false, true),
    autumn: buildParticleSystem(makeMapleGeo(), mats.mapleLeaf, 0.5, 0.45, true, false),
    winter: buildParticleSystem(makeSnowGeo(), mats.snow, 0.5, 0.18, false, true),
  };

  // ===== Desk =====
  const desk = new THREE.Group();
  const deskW = 3.8;
  const deskD = 1.9;
  const deskTopH = 0.08;
  const deskTopY = 0.22; // top surface at y=0.26 world, so thighs clear underneath

  const deskTopMesh = new THREE.Mesh(
    new THREE.BoxGeometry(deskW, deskTopH, deskD),
    mats.deskTop,
  );
  deskTopMesh.position.y = deskTopY;
  deskTopMesh.castShadow = true;
  deskTopMesh.receiveShadow = true;
  desk.add(deskTopMesh);

  // Legs: from floor y=-0.5 to desk bottom y=0.18. Height 0.68, center y=-0.16.
  const legH = 0.68;
  const legW = 0.1;
  [[-deskW / 2 + 0.1, -deskD / 2 + 0.1], [deskW / 2 - 0.1, -deskD / 2 + 0.1],
   [-deskW / 2 + 0.1, deskD / 2 - 0.1], [deskW / 2 - 0.1, deskD / 2 - 0.1]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(legW, legH, legW), mats.deskLeg);
    leg.position.set(x, -0.16, z);
    leg.castShadow = true;
    desk.add(leg);
  });
  desk.position.set(0, 0, -0.6);
  scene.add(desk);
  const deskTopWorldY = desk.position.y + deskTopY + deskTopH / 2; // world y of top surface

  // ===== Lamp (→ /articles) =====
  const lamp = new THREE.Group();
  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.05, 18),
    mats.lampBody,
  );
  lampBase.position.y = 0.025;
  lampBase.castShadow = true;
  lamp.add(lampBase);

  const lampArm1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.8, 10),
    mats.lampBody,
  );
  lampArm1.position.y = 0.45;
  lampArm1.castShadow = true;
  lamp.add(lampArm1);

  const lampJoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 12, 10),
    mats.lampBody,
  );
  lampJoint.position.y = 0.85;
  lamp.add(lampJoint);

  const lampArm2Len = 0.4;
  const lampArm2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, lampArm2Len, 10),
    mats.lampBody,
  );
  // arm2 tilts forward-down from joint
  lampArm2.position.set(0.13, 0.98, 0.12);
  lampArm2.rotation.x = 0.55;
  lampArm2.rotation.z = -0.45;
  lampArm2.castShadow = true;
  lamp.add(lampArm2);

  // Shade: apex UP (attachment), base DOWN (light emits down) — default ConeGeo orientation
  // Tilt it to match arm2's end direction (slightly forward-down)
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.28, 22, 1, true),
    mats.lampShade,
  );
  shade.position.set(0.28, 1.12, 0.22);
  shade.rotation.x = 0.3;
  shade.rotation.z = -0.35;
  shade.castShadow = true;
  lamp.add(shade);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 14, 12),
    mats.bulb,
  );
  bulb.position.set(0.31, 1.0, 0.26);
  lamp.add(bulb);

  lamp.position.set(-1.2, deskTopWorldY, -0.9);
  scene.add(lamp);

  // ===== Laptop (→ /projects) =====
  const laptop = new THREE.Group();

  const lpBaseW = 1.25;
  const lpBaseD = 0.88;
  const lpBaseH = 0.05;

  const lpBase = new THREE.Mesh(
    new THREE.BoxGeometry(lpBaseW, lpBaseH, lpBaseD),
    mats.laptopBody,
  );
  lpBase.position.y = lpBaseH / 2 + 0.002;
  lpBase.castShadow = true;
  lpBase.receiveShadow = true;
  laptop.add(lpBase);

  // Screen (hinged at back edge)
  const lpScreenGroup = new THREE.Group();
  lpScreenGroup.position.set(0, lpBaseH + 0.005, -lpBaseD / 2 + 0.02);
  const lpScreenW = 1.2;
  const lpScreenH = 0.78;
  const lpScreenT = 0.026;
  const lpScreenBody = new THREE.Mesh(
    new THREE.BoxGeometry(lpScreenW, lpScreenH, lpScreenT),
    mats.laptopFrame,
  );
  lpScreenBody.position.y = lpScreenH / 2;
  lpScreenBody.position.z = -lpScreenT / 2;
  lpScreenBody.castShadow = true;
  lpScreenGroup.add(lpScreenBody);

  // Screen canvas texture (1024×640 logical — fast to regen, crisp enough with high aniso)
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 1024;
  screenCanvas.height = 640;
  const screenCtx = screenCanvas.getContext("2d")!;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  screenTexture.generateMipmaps = false;
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.LinearFilter;
  mats.screen = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });

  const screenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(lpScreenW - 0.06, lpScreenH - 0.06),
    mats.screen,
  );
  screenFace.position.set(0, lpScreenH / 2, 0.002);
  lpScreenGroup.add(screenFace);

  lpScreenGroup.rotation.x = -0.22;
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
  const kbZ0 = -0.28; // starting z (toward hinge)
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
  laptop.add(keyMesh);

  // Trackpad (visual only)
  const trackpad = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.003, 0.22),
    mats.laptopFrame,
  );
  trackpad.position.set(0, lpBaseH + 0.002, 0.28);
  laptop.add(trackpad);

  laptop.position.set(0.1, deskTopWorldY, -0.2);
  scene.add(laptop);

  // ===== Book stack (→ /articles?collection=books) =====
  const bookStack = new THREE.Group();
  const bookSizes: [number, number, number, THREE.Material][] = [
    [0.52, 0.11, 0.38, mats.books[0]],
    [0.48, 0.09, 0.36, mats.books[1]],
    [0.5, 0.1, 0.37, mats.books[2]],
  ];
  let bookY = 0;
  bookSizes.forEach(([w, h, d, mat]) => {
    const book = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    book.position.y = bookY + h / 2;
    book.rotation.y = (Math.random() - 0.5) * 0.25;
    book.castShadow = true;
    bookStack.add(book);
    bookY += h + 0.003;
  });
  bookStack.position.set(1.3, deskTopWorldY, -0.85);
  scene.add(bookStack);

  // ===== Notebook + pen (→ /articles) =====
  const notebook = new THREE.Group();
  const notebookCover = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.03, 0.3),
    mats.books[0],
  );
  notebookCover.position.y = 0.015;
  notebookCover.castShadow = true;
  notebookCover.receiveShadow = true;
  notebook.add(notebookCover);
  // Pages peek (slightly smaller, offset)
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.018, 0.28),
    new THREE.MeshToonMaterial({ color: 0xf4efe3 }),
  );
  pages.position.set(0.005, 0.008, 0.005);
  notebook.add(pages);
  // Spine-side stripe (binding)
  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.031, 0.3),
    mats.deskLeg,
  );
  spine.position.set(-0.19, 0.016, 0);
  notebook.add(spine);
  // Pen resting on notebook
  const penBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.26, 10),
    mats.lampBody,
  );
  penBody.rotation.z = Math.PI / 2;
  penBody.rotation.y = 0.2;
  penBody.position.set(0.04, 0.045, 0.08);
  penBody.castShadow = true;
  notebook.add(penBody);
  const penTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.01, 0.03, 8),
    mats.books[2],
  );
  penTip.rotation.z = -Math.PI / 2;
  penTip.rotation.y = 0.2;
  penTip.position.set(0.17, 0.045, 0.105);
  notebook.add(penTip);

  notebook.position.set(-1.05, deskTopWorldY, -0.2);
  notebook.rotation.y = -0.25;
  scene.add(notebook);

  // ===== Plant (with seasonal growth on branches) =====
  //  spring (0–0.25): leaves emerge on branch tips
  //  summer (0.25–0.5): full bloom
  //  autumn (0.5–0.75): leaves stay but color shifts to orange via SEASON_PALETTE.plant
  //  winter (0.75–1): leaves drop one by one, only stem+branches remain
  const plant = new THREE.Group();

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.13, 0.18, 14),
    mats.pot,
  );
  pot.position.y = 0.09;
  pot.castShadow = true;
  plant.add(pot);

  // Soil cap
  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145, 0.145, 0.02, 14),
    mats.deskLeg,
  );
  soil.position.y = 0.185;
  plant.add(soil);

  // Main stem
  const stemLen = 0.36;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.03, stemLen, 8),
    mats.deskLeg,
  );
  stem.position.y = 0.2 + stemLen / 2;
  stem.castShadow = true;
  plant.add(stem);

  // Branches off stem — compute tip positions for leaf placement
  const branches = new THREE.Group();
  const branchLen = 0.22;
  const branchTips: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.014, branchLen, 6),
      mats.deskLeg,
    );
    const a = (i / 4) * Math.PI * 2 + 0.3;
    const baseY = 0.44 + (i % 2) * 0.06;
    const basePos = new THREE.Vector3(Math.cos(a) * 0.04, baseY, Math.sin(a) * 0.04);
    const rotZ = Math.cos(a) * 0.9;
    const rotX = -Math.sin(a) * 0.9;
    branch.position.copy(basePos);
    branch.rotation.x = rotX;
    branch.rotation.z = rotZ;
    // Compute world-space tip (+Y end after rotation)
    const up = new THREE.Vector3(0, 1, 0);
    up.applyEuler(new THREE.Euler(rotX, 0, rotZ, "XYZ"));
    up.multiplyScalar(branchLen / 2 + 0.02);
    const tip = basePos.clone().add(up);
    branchTips.push(tip);
    branches.add(branch);
  }
  plant.add(branches);

  // Leaves clustered AT branch tips (so they hang on branches, not float in air)
  type LeafState = { mesh: THREE.Mesh; emerge: number; drop: number };
  const leafStates: LeafState[] = [];
  const leaves = new THREE.Group();
  const leavesPerBranch = 4;
  for (let t = 0; t < branchTips.length; t++) {
    for (let j = 0; j < leavesPerBranch; j++) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 8, 6),
        mats.leaf,
      );
      const tip = branchTips[t];
      // Cluster at tip with small randomized offset
      const jitter = 0.07;
      leaf.position.set(
        tip.x + (Math.random() - 0.5) * jitter,
        tip.y + (Math.random() - 0.3) * jitter,
        tip.z + (Math.random() - 0.5) * jitter,
      );
      leaf.scale.set(1, 1.35, 1);
      leaf.castShadow = true;
      // Stagger emerge during spring, stagger drop during winter
      const leafIdx = t * leavesPerBranch + j;
      const totalLeaves = branchTips.length * leavesPerBranch;
      const emerge = (leafIdx / totalLeaves) * 0.2;
      // leaves drop between 0.72 and 0.85 (early/mid winter); all gone by ~0.93
      const drop = 0.72 + ((leafIdx * 5) % totalLeaves) / totalLeaves * 0.13;
      leafStates.push({ mesh: leaf, emerge, drop });
      leaves.add(leaf);
    }
  }
  plant.add(leaves);

  // Move plant toward desk center so it doesn't hang off edge
  plant.position.set(1.5, deskTopWorldY, -0.2);
  scene.add(plant);

  // ===== TV (wall-mounted on left wall → /movies) =====
  const tv = new THREE.Group();
  const tvW = 1.5;
  const tvH = 0.9;
  const tvD = 0.05;
  const tvBody = new THREE.Mesh(
    new THREE.BoxGeometry(tvW, tvH, tvD),
    mats.tvBody,
  );
  tvBody.castShadow = true;
  tv.add(tvBody);

  // TV screen with animated equalizer bars (CSS-loader style ported to canvas)
  const tvScreenCanvas = document.createElement("canvas");
  tvScreenCanvas.width = 640;
  tvScreenCanvas.height = 360;
  const tvScreenCtx = tvScreenCanvas.getContext("2d")!;
  const tvScreenTexture = new THREE.CanvasTexture(tvScreenCanvas);
  tvScreenTexture.colorSpace = THREE.SRGBColorSpace;
  tvScreenTexture.generateMipmaps = false;
  tvScreenTexture.minFilter = THREE.LinearFilter;
  tvScreenTexture.magFilter = THREE.LinearFilter;
  const tvScreenMat = new THREE.MeshBasicMaterial({
    map: tvScreenTexture,
    toneMapped: false,
  });
  const tvScreenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(tvW - 0.08, tvH - 0.08),
    tvScreenMat,
  );
  tvScreenMesh.position.set(0, 0, tvD / 2 + 0.001);
  tv.add(tvScreenMesh);

  // Equalizer animation params — staggered delays create the wave pattern,
  // mirroring the reference CSS keyframe `load`.
  const TV_BAR_COUNT = 15;
  const TV_BAR_DELAYS = [1.4, 1.2, 1.0, 0.8, 0.6, 0.4, 0.2, 0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4];
  const TV_CYCLE_SEC = 2.5;

  const drawTvScreen = (nowMs: number) => {
    const ctx = tvScreenCtx;
    const W = tvScreenCanvas.width;
    const H = tvScreenCanvas.height;

    // radial dark bg (CRT feel)
    const bg = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.9);
    bg.addColorStop(0, "#2a2a2a");
    bg.addColorStop(1, "#050505");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Bars
    const step = W / TV_BAR_COUNT;
    const barW = step * 0.55;
    const padLR = (step - barW) / 2;
    const t = nowMs / 1000;

    for (let i = 0; i < TV_BAR_COUNT; i++) {
      // Each bar plays the same load keyframe with its own delay offset,
      // reversed sign so cycle phase matches the CSS animation.
      const cyclePos = (((t - TV_BAR_DELAYS[i]) % TV_CYCLE_SEC) + TV_CYCLE_SEC) % TV_CYCLE_SEC;
      const half = TV_CYCLE_SEC / 2;
      const norm = cyclePos < half ? cyclePos / half : 1 - (cyclePos - half) / half; // triangle 0→1→0
      const heightPct = 0.1 + norm * 0.9;
      const topPct = 0.25 * (1 - norm);
      const barH = heightPct * H;
      const barY = topPct * H;
      const gray = Math.floor(204 - norm * 136); // #ccc → #444
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      const x = i * step + padLR;
      // rounded bars
      const r = barW / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, barY);
      ctx.lineTo(x + barW - r, barY);
      ctx.arcTo(x + barW, barY, x + barW, barY + r, r);
      ctx.lineTo(x + barW, barY + barH - r);
      ctx.arcTo(x + barW, barY + barH, x + barW - r, barY + barH, r);
      ctx.lineTo(x + r, barY + barH);
      ctx.arcTo(x, barY + barH, x, barY + barH - r, r);
      ctx.lineTo(x, barY + r);
      ctx.arcTo(x, barY, x + r, barY, r);
      ctx.closePath();
      ctx.fill();
    }

    tvScreenTexture.needsUpdate = true;
  };
  drawTvScreen(performance.now());
  // Mount on left wall, high on the wall, roughly centered
  tv.position.set(-3.16, 1.55, -0.5);
  tv.rotation.y = Math.PI / 2; // face +X (into room)
  scene.add(tv);

  // ===== Person (seated on chair, feet on floor, facing -Z toward laptop) =====
  // Coordinate system: person group at world y=0 (so floor at local y=-0.5)
  //   hip  local y = 0.03 (just above chair seat)
  //   shoulder local y = 0.58
  //   head center local y = 0.85
  //   feet bottom local y = -0.5 (exactly on floor)
  const person = new THREE.Group();

  // ---- Chair ----
  const chairSeat = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.05, 0.52),
    mats.personCloth,
  );
  chairSeat.position.set(0, -0.015, 0.05);
  chairSeat.castShadow = true;
  chairSeat.receiveShadow = true;
  person.add(chairSeat);

  const chairBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.55, 0.05),
    mats.personCloth,
  );
  chairBack.position.set(0, 0.22, 0.28);
  chairBack.castShadow = true;
  person.add(chairBack);

  // Chair legs (4 short legs under seat)
  [[-0.22, -0.16], [0.22, -0.16], [-0.22, 0.24], [0.22, 0.24]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.45, 0.04),
      mats.deskLeg,
    );
    leg.position.set(x, -0.26, z);
    leg.castShadow = true;
    person.add(leg);
  });

  // ---- Torso ----
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.27, 0.58, 14),
    mats.personCloth,
  );
  torso.position.y = 0.32;
  torso.castShadow = true;
  person.add(torso);

  // ---- Neck ----
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.07, 0.07, 10),
    mats.personSkin,
  );
  neck.position.y = 0.64;
  person.add(neck);

  // ---- Head ----
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 20, 16),
    mats.personSkin,
  );
  head.position.y = 0.82;
  head.scale.set(1, 1.08, 1);
  head.castShadow = true;
  person.add(head);

  // ---- Hair (back + top, since we see from behind) ----
  const hairGeo = new THREE.SphereGeometry(0.156, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const hair = new THREE.Mesh(hairGeo, mats.personHair);
  hair.position.y = 0.82;
  hair.scale.set(1, 1.1, 1);
  hair.rotation.x = -0.15;
  person.add(hair);

  // ---- Shoulder joints ----
  const shoulderGeo = new THREE.SphereGeometry(0.09, 14, 12);
  const shoulderL = new THREE.Mesh(shoulderGeo, mats.personCloth);
  shoulderL.position.set(-0.26, 0.55, 0);
  shoulderL.castShadow = true;
  person.add(shoulderL);
  const shoulderR = new THREE.Mesh(shoulderGeo, mats.personCloth);
  shoulderR.position.set(0.26, 0.55, 0);
  shoulderR.castShadow = true;
  person.add(shoulderR);

  // ---- Arms (reach -Z toward laptop) ----
  function makeArm(side: -1 | 1) {
    const armGroup = new THREE.Group();
    armGroup.position.set(0.26 * side, 0.55, 0);
    armGroup.rotation.x = 1.24;
    armGroup.rotation.z = -0.06 * side;

    const upperLen = 0.42;
    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.065, upperLen, 12),
      mats.personCloth,
    );
    upperArm.position.y = -upperLen / 2;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    const elbowGroup = new THREE.Group();
    elbowGroup.position.y = -upperLen;
    elbowGroup.rotation.x = 0.32;
    armGroup.add(elbowGroup);

    const elbowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 12, 10),
      mats.personCloth,
    );
    elbowGroup.add(elbowSphere);

    const forearmLen = 0.4;
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.052, forearmLen, 12),
      mats.personCloth,
    );
    forearm.position.y = -forearmLen / 2;
    forearm.castShadow = true;
    elbowGroup.add(forearm);

    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.058, 0.02, 12),
      mats.personCloth,
    );
    cuff.position.y = -forearmLen - 0.01;
    elbowGroup.add(cuff);

    const wrist = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 12, 10),
      mats.personSkin,
    );
    wrist.position.y = -forearmLen - 0.035;
    elbowGroup.add(wrist);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 18, 14),
      mats.personSkin,
    );
    // Round fist shape — reads as a "hand" from any camera angle, no awkward
    // stretched-box look.
    hand.position.set(0, -forearmLen - 0.035, 0.04);
    hand.castShadow = true;
    elbowGroup.add(hand);

    person.add(armGroup);
    return { armGroup, elbowGroup, hand };
  }

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // ---- Legs: thighs horizontal forward (-Z), shins vertical down, feet on floor ----
  function makeLeg(side: -1 | 1) {
    const thighLen = 0.42;
    // Thigh oriented along -Z: cylinder's Y-axis rotates -π/2 around X → +Y becomes +Z, -Y becomes -Z
    // So cylinder axis ends: top at +Z, bottom at -Z. We want thigh to go from hip at z=0 to knee at z=-0.42
    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.09, thighLen, 12),
      mats.personCloth,
    );
    thigh.rotation.x = Math.PI / 2;
    thigh.position.set(0.12 * side, 0.02, -thighLen / 2);
    thigh.castShadow = true;
    person.add(thigh);

    // Knee sphere (at -Z end of thigh)
    const knee = new THREE.Mesh(
      new THREE.SphereGeometry(0.082, 12, 10),
      mats.personCloth,
    );
    knee.position.set(0.12 * side, 0.02, -thighLen);
    person.add(knee);

    // Shin from knee vertically down to ankle just above floor
    const shinTopY = 0.02;
    const shinBottomY = -0.44;
    const shinLen = shinTopY - shinBottomY;
    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.06, shinLen, 12),
      mats.personCloth,
    );
    shin.position.set(0.12 * side, (shinTopY + shinBottomY) / 2, -thighLen);
    shin.castShadow = true;
    person.add(shin);

    // Foot (skin shoe color via deskLeg dark)
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.07, 0.22),
      mats.personHair,
    );
    foot.position.set(0.12 * side, -0.465, -thighLen - 0.04);
    foot.castShadow = true;
    foot.receiveShadow = true;
    person.add(foot);
  }
  makeLeg(-1);
  makeLeg(1);

  // Pelvis (hide gap between torso and thighs)
  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.3),
    mats.personCloth,
  );
  pelvis.position.set(0, 0.04, 0);
  pelvis.castShadow = true;
  person.add(pelvis);

  // Seated further back from laptop: chair+seat at z=0.55, so hips at z=0.55
  person.position.set(0.15, 0, 0.55);
  scene.add(person);

  // ===== Interactive registry =====
  // Lamp + window are decorative only. Notebook → /articles, clicking the person → /about.
  const interactives: Interactive[] = [
    { object: notebook, label: "笔记本 · 文章", route: "/articles", basePos: notebook.position.clone() },
    { object: laptop, label: "电脑 · 项目", route: "/projects", basePos: laptop.position.clone() },
    { object: person, label: "lsy · 关于", route: "/about", basePos: person.position.clone() },
    { object: bookStack, label: "书 · 读书", route: "/books", basePos: bookStack.position.clone() },
    { object: tv, label: "电视 · 观影", route: "/movies", basePos: tv.position.clone() },
  ];

  // ===== Theme =====
  const getTheme = (): ThemeName => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  let theme: ThemeName = getTheme();

  const applyTheme = (t: ThemeName) => {
    const p = THEMES[t];
    mats.floor.color.setHex(p.floor);
    mats.wall.color.setHex(p.wall);
    mats.ceiling.color.setHex(p.ceiling);
    mats.deskTop.color.setHex(p.deskTop);
    mats.deskLeg.color.setHex(p.deskLeg);
    mats.lampBody.color.setHex(p.lampBody);
    mats.lampShade.color.setHex(p.lampShade);
    mats.bulb.emissive.setHex(p.lampGlow);
    lampLight.color.setHex(p.lampGlow);
    mats.laptopBody.color.setHex(p.laptopBody);
    mats.laptopFrame.color.setHex(p.laptopFrame);
    mats.books[0].color.setHex(p.bookA);
    mats.books[1].color.setHex(p.bookB);
    mats.books[2].color.setHex(p.bookC);
    mats.tvBody.color.setHex(p.tvBody);
    // tvScreen is now a CanvasTexture (equalizer bars) — no emissive to tint.
    // Point light `tvLight` still gives the wall a warm cast.
    mats.pot.color.setHex(p.pot);
    mats.personSkin.color.setHex(p.personSkin);
    mats.personHair.color.setHex(p.personHair);
    mats.personCloth.color.setHex(p.personCloth);
    mats.key.color.setHex(p.keyTop);
    mats.windowFrame.color.setHex(p.windowFrame);
    mats.windowSill.color.setHex(p.windowSill);
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

  // ===== Season state =====
  let seasonOfYear = 0.04;
  let targetSeason = seasonOfYear;
  let currentTermIndex = -1;
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

  const tmpColor = new THREE.Color();
  const tmpColor2 = new THREE.Color();
  const blendSeason = (s: number, key: keyof SeasonPal, out: THREE.Color) => {
    const seasons = theme === "dark" ? SEASONS_DARK : SEASONS_LIGHT;
    const raw = s * 4;
    const idx = Math.floor(raw) % 4;
    const next = (idx + 1) % 4;
    const local = raw - Math.floor(raw);
    const t = easeInOutCubic(local);
    const a = seasons[idx][key] as number;
    const b = seasons[next][key] as number;
    tmpColor.setHex(a);
    tmpColor2.setHex(b);
    out.copy(tmpColor).lerp(tmpColor2, t);
  };
  const blendSeasonScalar = (s: number, key: keyof SeasonPal): number => {
    const seasons = theme === "dark" ? SEASONS_DARK : SEASONS_LIGHT;
    const raw = s * 4;
    const idx = Math.floor(raw) % 4;
    const next = (idx + 1) % 4;
    const local = raw - Math.floor(raw);
    const t = easeInOutCubic(local);
    return lerp(seasons[idx][key] as number, seasons[next][key] as number, t);
  };

  const sunColor = new THREE.Color();
  const ambColor = new THREE.Color();
  const skyColor = new THREE.Color();
  const plantColor = new THREE.Color();
  const fogColor = new THREE.Color();

  // Screen canvas drawing
  const drawScreen = () => {
    const ctx = screenCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W = screenCanvas.width;
    const H = screenCanvas.height;
    const p = THEMES[theme];

    // bg + vignette
    ctx.fillStyle = p.screenBg;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // title bar (mac-style)
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, 0, W, 50);
    ctx.beginPath(); ctx.fillStyle = "#ff5f57"; ctx.arc(26, 25, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = "#febc2e"; ctx.arc(48, 25, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = "#28c840"; ctx.arc(70, 25, 7, 0, Math.PI * 2); ctx.fill();
    ctx.font = "600 19px 'JetBrains Mono', monospace";
    ctx.fillStyle = p.screenMuted;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("echoes ~ /home", W / 2, 32);

    // big name (Fraunces)
    ctx.fillStyle = p.screenText;
    ctx.font = "400 168px 'Fraunces', 'Noto Serif SC', serif";
    ctx.textAlign = "center";
    ctx.fillText(HOME_PROFILE.title, W / 2, 200);

    // subtitle
    ctx.font = "600 22px 'JetBrains Mono', monospace";
    ctx.fillStyle = p.screenMuted;
    ctx.fillText(HOME_PROFILE.subtitle, W / 2, 258);

    // separator hairline
    ctx.strokeStyle = p.screenMuted;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.2, 298);
    ctx.lineTo(W * 0.8, 298);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Info rows (label right-aligned, value left-aligned from pillar)
    ctx.font = "600 24px 'JetBrains Mono', monospace";
    const pillarX = W * 0.36;
    const labelX = pillarX - 16;
    const valueX = pillarX + 16;
    const rowH = 42;
    let rowY = 345;

    const rows = [...HOME_PROFILE.rows];
    // append auto-computed "posts" row (count + years from Astro content)
    const autoPosts = (window as unknown as { __HOME_POSTS_LABEL?: string }).__HOME_POSTS_LABEL;
    if (autoPosts) {
      rows.push({ label: "posts", value: autoPosts });
    }
    // append live "now" row
    const nowStr = formatNowBeijing();
    rows.push({ label: "now", value: nowStr });

    for (const row of rows) {
      ctx.textAlign = "right";
      ctx.fillStyle = p.screenMuted;
      ctx.font = "500 22px 'JetBrains Mono', monospace";
      ctx.fillText(row.label, labelX, rowY);
      ctx.textAlign = "left";
      ctx.fillStyle = row.label === "now" ? p.screenAccent : p.screenText;
      ctx.font = "600 24px 'JetBrains Mono', monospace";
      ctx.fillText(row.value, valueX, rowY);
      rowY += rowH;
    }

    // Typewriter line (rotating status, types → holds → deletes → next)
    rowY += 14;
    ctx.font = "600 26px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    const prefix = "> ";
    const prefixW = ctx.measureText(prefix).width;
    const typerX = pillarX - 80;
    ctx.fillStyle = p.screenAccent;
    ctx.fillText(prefix, typerX, rowY);
    ctx.fillStyle = p.screenText;
    ctx.fillText(typerText, typerX + prefixW, rowY);
    if (cursorOn) {
      const tw = ctx.measureText(typerText);
      ctx.fillStyle = p.screenAccent;
      ctx.fillRect(typerX + prefixW + tw.width + 4, rowY - 22, 13, 28);
    }

    // bottom hint
    ctx.font = "500 18px 'JetBrains Mono', monospace";
    ctx.fillStyle = p.screenMuted;
    ctx.textAlign = "center";
    ctx.fillText("drag to orbit · scroll for seasons · click objects", W / 2, H - 32);

    screenTexture.needsUpdate = true;
  };
  drawScreen();

  // ===== Resize =====
  const resize = () => {
    const rect = canvasEl.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObs = new ResizeObserver(resize);
  resizeObs.observe(canvasEl);

  // ===== Input =====
  let hintHidden = false;
  const markInteracted = () => {
    if (hintHidden) return;
    hintHidden = true;
    hintEl?.classList.add("is-hidden");
  };

  const wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
    targetSeason = (targetSeason + e.deltaY * 0.00026 + 1) % 1;
    markInteracted();
  };
  canvasEl.addEventListener("wheel", wheelHandler, { passive: false });

  let touchY: number | null = null;
  const touchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? null; };
  const touchMove = (e: TouchEvent) => {
    if (touchY == null) return;
    const y = e.touches[0]?.clientY;
    if (typeof y !== "number") return;
    const dy = touchY - y;
    if (Math.abs(dy) < 2) return;
    targetSeason = (targetSeason + dy * 0.0006 + 1) % 1;
    touchY = y;
    markInteracted();
  };
  const touchEnd = () => { touchY = null; };
  canvasEl.addEventListener("touchstart", touchStart, { passive: true });
  canvasEl.addEventListener("touchmove", touchMove, { passive: true });
  canvasEl.addEventListener("touchend", touchEnd);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: Interactive | null = null;
  let tweening = false;

  const updatePointer = (clientX: number, clientY: number) => {
    const rect = canvasEl.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  };

  const hitTest = (): Interactive | null => {
    raycaster.setFromCamera(pointer, camera);
    for (const it of interactives) {
      if (raycaster.intersectObject(it.object, true).length > 0) return it;
    }
    return null;
  };

  const pointerMove = (e: PointerEvent) => {
    if (tweening) return;
    updatePointer(e.clientX, e.clientY);
    const hit = hitTest();
    if (hit !== hovered) {
      hovered = hit;
      canvasEl.style.cursor = hit ? "pointer" : "grab";
      if (tooltip) {
        if (hit) {
          tooltip.textContent = hit.label;
          tooltip.classList.add("is-visible");
        } else {
          tooltip.classList.remove("is-visible");
        }
      }
    }
    if (tooltip && hit) {
      tooltip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    }
  };
  canvasEl.addEventListener("pointermove", pointerMove);
  canvasEl.addEventListener("pointerleave", () => {
    hovered = null;
    canvasEl.style.cursor = "grab";
    tooltip?.classList.remove("is-visible");
  });
  canvasEl.style.cursor = "grab";

  const clickHandler = (e: MouseEvent) => {
    if (tweening) return;
    updatePointer(e.clientX, e.clientY);
    const hit = hitTest();
    if (!hit) return;
    markInteracted();
    tweening = true;
    controls.enabled = false;

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const objPos = hit.basePos.clone().add(new THREE.Vector3(0, 0.25, 0));
    const dir = new THREE.Vector3().subVectors(startPos, objPos).normalize();
    const endPos = objPos.clone().add(dir.multiplyScalar(1.5));
    const endTarget = objPos;

    const duration = 650;
    const t0 = performance.now();
    const step = () => {
      const t = clamp((performance.now() - t0) / duration);
      const ee = easeInOutCubic(t);
      camera.position.lerpVectors(startPos, endPos, ee);
      controls.target.lerpVectors(startTarget, endTarget, ee);
      if (t < 1) requestAnimationFrame(step);
      else window.location.href = hit.route;
    };
    requestAnimationFrame(step);
  };
  canvasEl.addEventListener("click", clickHandler);

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
    const raw = baseRotZ + side * deltaX * 3.0;
    const targetRotZ = clamp(raw, -0.5, 0.5);
    ai.startRotZ = ai.currentRotZ;
    ai.targetRotZ = targetRotZ;
    ai.targetKeyIdx = pick.i;
    ai.moveStart = nowTs;
    ai.moveEnd = nowTs + 180 + Math.random() * 220;
    ai.phase = "moving";
  };

  const particleDummy = new THREE.Object3D();
  const SEASON_KEYS = ["spring", "summer", "autumn", "winter"] as const;

  const animate = () => {
    const now = performance.now();
    const dt = Math.min(64, now - lastFrame);
    lastFrame = now;

    let diff = targetSeason - seasonOfYear;
    if (diff > 0.5) diff -= 1;
    if (diff < -0.5) diff += 1;
    seasonOfYear = (seasonOfYear + diff * Math.min(1, dt * 0.0022) + 1) % 1;

    const termIdx = Math.floor(seasonOfYear * 24) % 24;
    if (termIdx !== currentTermIndex) {
      currentTermIndex = termIdx;
    }

    // Typewriter tick (types → holds → deletes → idle → next line)
    const typerTarget = TYPEWRITER_LINES[typerIndex];
    if (typerPhase === "typing") {
      if (now - typerLastTick >= TYPER_SPEED_TYPE) {
        typerLastTick = now;
        if (typerText.length < typerTarget.length) {
          typerText = typerTarget.slice(0, typerText.length + 1);
          needScreenRedraw = true;
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
          needScreenRedraw = true;
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
      needScreenRedraw = true;
    }

    blendSeason(seasonOfYear, "sun", sunColor);
    blendSeason(seasonOfYear, "amb", ambColor);
    blendSeason(seasonOfYear, "sky", skyColor);
    blendSeason(seasonOfYear, "plant", plantColor);
    blendSeason(seasonOfYear, "fogTint", fogColor);
    const sunI = blendSeasonScalar(seasonOfYear, "sunI");
    const ambI = blendSeasonScalar(seasonOfYear, "ambI");

    // Season affects INTERIOR only through intensity — color stays mostly neutral.
    // Only outdoor (sky, window light, plant leaves, particles) shows full seasonal hue.
    const neutralSun = new THREE.Color(theme === "dark" ? 0xeadabf : 0xfff0dc);
    const neutralAmb = new THREE.Color(theme === "dark" ? 0x4a4538 : 0xf2ead8);
    sunLight.color.copy(neutralSun).lerp(sunColor, 0.08);
    sunLight.intensity = lerp(theme === "dark" ? 0.7 : 1.5, sunI, 0.5);
    ambient.color.copy(neutralAmb).lerp(ambColor, 0.08);
    ambient.intensity = lerp(theme === "dark" ? 0.45 : 0.6, ambI, 0.35);
    windowLight.color.copy(skyColor);
    windowLight.intensity = Math.max(0.3, sunI * 0.45);
    mats.sky.color.copy(skyColor);
    mats.leaf.color.copy(plantColor);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(fogColor);

    scene.background = new THREE.Color(THEMES[theme].sceneBg);

    // Particle system opacity (cross-fade between current/next season)
    const raw = seasonOfYear * 4;
    const seasonIdx = Math.floor(raw) % 4;
    const nextIdx = (seasonIdx + 1) % 4;
    const localFrac = raw - Math.floor(raw);
    for (let s = 0; s < 4; s++) {
      const key = SEASON_KEYS[s];
      let op = 0;
      if (s === seasonIdx) op = 1 - easeInOutCubic(localFrac);
      else if (s === nextIdx) op = easeInOutCubic(localFrac);
      particleSystems[key].material.opacity = op * 0.95;
    }

    // Screen cursor blink & redraw
    if (now - cursorLastToggle > 520) {
      cursorLastToggle = now;
      cursorOn = !cursorOn;
      needScreenRedraw = true;
    }
    if (needScreenRedraw) {
      needScreenRedraw = false;
      drawScreen();
    }

    // TV equalizer — animated every frame (cheap: 15 rounded rects on 640×360 canvas)
    drawTvScreen(now);

    // Hover bob
    for (const it of interactives) {
      if (it.object === windowHitbox) continue;
      const isH = hovered === it;
      const bobY = isH ? 0.04 + Math.sin(now * 0.005) * 0.01 : 0;
      it.object.position.y += (it.basePos.y + bobY - it.object.position.y) * 0.18;
    }

    // Plant sway + seasonal growth
    leaves.rotation.y = Math.sin(now * 0.0005) * 0.05;
    leaves.rotation.x = Math.sin(now * 0.0008) * 0.02;
    branches.rotation.y = leaves.rotation.y * 0.5;
    for (const l of leafStates) {
      const sy = seasonOfYear;
      let s = 0;
      const emergeDur = 0.12;
      const dropDur = 0.12;
      if (sy < l.emerge) s = 0;
      else if (sy < l.emerge + emergeDur) s = (sy - l.emerge) / emergeDur;
      else if (sy < l.drop) s = 1;
      else if (sy < l.drop + dropDur) s = 1 - (sy - l.drop) / dropDur;
      else s = 0;
      const scaleVal = Math.max(0.001, s);
      l.mesh.scale.set(scaleVal, scaleVal * 1.4, scaleVal);
      l.mesh.visible = s > 0.02;
    }

    // Person head/torso idle motion
    head.rotation.x = Math.sin(now * 0.0004) * 0.02 + 0.1;
    head.rotation.y = Math.sin(now * 0.0003) * 0.03;
    hair.rotation.x = head.rotation.x - 0.15;
    hair.rotation.y = head.rotation.y;
    torso.rotation.y = Math.sin(now * 0.0003) * 0.015;

    // Arm AI — each hand drifts across keyboard to a target key,
    // presses that specific key on arrival, then picks another.
    const updateArmAI = (ai: ArmAI, arm: { armGroup: THREE.Group; elbowGroup: THREE.Group }, side: -1 | 1) => {
      if (ai.phase === "moving") {
        const total = Math.max(1, ai.moveEnd - ai.moveStart);
        const t = clamp((now - ai.moveStart) / total);
        const ee = easeInOutCubic(t);
        ai.currentRotZ = lerp(ai.startRotZ, ai.targetRotZ, ee);
        arm.armGroup.rotation.z = ai.currentRotZ;
        // Small dip — hand taps key, doesn't drive through laptop.
        ai.dipValue = t > 0.65 ? Math.sin(((t - 0.65) / 0.35) * Math.PI) * 0.04 : 0;
        arm.elbowGroup.rotation.x = 0.32 - ai.dipValue;
        if (t >= 1) {
          keyStates[ai.targetKeyIdx].press = 1;
          ai.phase = "hold";
          ai.holdUntil = now + 70 + Math.random() * 150;
        }
      } else {
        arm.armGroup.rotation.z = ai.currentRotZ;
        ai.dipValue *= 0.72;
        arm.elbowGroup.rotation.x = 0.32 - ai.dipValue;
        if (now >= ai.holdUntil) planNextKey(ai, side, now);
      }
    };
    if (!reduceMotion) {
      updateArmAI(leftAI, leftArm, -1);
      updateArmAI(rightAI, rightArm, 1);
    }
    for (let i = 0; i < keyStates.length; i++) keyStates[i].press *= 0.8;

    // Update key matrices
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

    // Outdoor particles (all 4 systems, each with own motion pattern)
    const dtSec = dt / 1000;

    // Sun visibility — strong in spring (0–0.25) + summer (0.25–0.5), fade out autumn/winter
    const sunOp = (() => {
      const sy = seasonOfYear;
      if (sy < 0.42) return 1;
      if (sy < 0.55) return 1 - (sy - 0.42) / 0.13;
      if (sy < 0.9) return 0;
      return (sy - 0.9) / 0.1; // ghost sun starts coming back late winter / early spring
    })();
    (sunDisc.material as THREE.MeshBasicMaterial).opacity = sunOp * 0.95;
    (sunGlow.material as THREE.MeshBasicMaterial).opacity = sunOp * 0.35;
    // Sun color shifts with theme (dark theme = dimmer warm)
    const sunTint = theme === "dark" ? 0xffd080 : 0xffecb3;
    (sunDisc.material as THREE.MeshBasicMaterial).color.setHex(sunTint);
    (sunGlow.material as THREE.MeshBasicMaterial).color.setHex(sunTint);

    // Clouds drift + density by season (more in autumn/winter = overcast)
    const overcast = (() => {
      const sy = seasonOfYear;
      if (sy < 0.5) return 0.35; // spring + summer: light clouds
      return 0.55 + easeInOutCubic(Math.min(1, (sy - 0.5) / 0.3)) * 0.35; // autumn + winter: heavier
    })();
    (cloudMat as THREE.MeshBasicMaterial).opacity = overcast;
    (cloudMat as THREE.MeshBasicMaterial).color.setHex(
      theme === "dark" ? 0x8894a8 : 0xf8f4ec,
    );
    for (const cd of cloudData) {
      cd.mesh.position.x += cd.speed * dtSec;
      if (cd.mesh.position.x > 5.5) cd.mesh.position.x = -5.5;
      cd.mesh.position.y = cd.baseY + Math.sin(now * 0.0002 + cd.mesh.position.x) * 0.03;
    }

    for (let s = 0; s < 4; s++) {
      const key = SEASON_KEYS[s];
      const sys = particleSystems[key];
      if (sys.material.opacity < 0.005) continue;
      for (let i = 0; i < particleCount; i++) {
        sys.positions[i * 3 + 1] -= sys.fall * dtSec * 0.9;
        if (sys.sway > 0) {
          const phase = sys.phases[i] + now * 0.001;
          sys.positions[i * 3] += Math.sin(phase) * sys.sway * dtSec * 0.6;
        }
        if (sys.tumble) sys.rotations[i] += sys.rotVel[i];

        if (sys.positions[i * 3 + 1] < -0.6) {
          sys.positions[i * 3 + 1] = 5;
          sys.positions[i * 3] = (Math.random() - 0.5) * 7;
        }

        particleDummy.position.set(
          sys.positions[i * 3],
          sys.positions[i * 3 + 1],
          sys.positions[i * 3 + 2],
        );
        if (sys.rotateFace) {
          // face camera for rain/snow
          particleDummy.rotation.set(0, 0, 0);
        } else {
          particleDummy.rotation.set(
            sys.tumble ? sys.rotations[i] * 0.4 : 0,
            0,
            sys.tumble ? sys.rotations[i] : 0,
          );
        }
        particleDummy.updateMatrix();
        sys.mesh.setMatrixAt(i, particleDummy.matrix);
      }
      sys.mesh.instanceMatrix.needsUpdate = true;
    }

    controls.update();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  };

  if ("fonts" in document) {
    Promise.all([
      document.fonts.load("300 240px Fraunces"),
      document.fonts.load("400 26px 'JetBrains Mono'"),
      document.fonts.load("400 64px 'Noto Serif SC'"),
    ]).then(() => drawScreen()).catch(() => {});
  }

  if (reduceMotion) {
    drawScreen();
    renderer.render(scene, camera);
  } else {
    rafId = requestAnimationFrame(animate);
  }

  // ===== Cleanup =====
  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    canvasEl.removeEventListener("wheel", wheelHandler);
    canvasEl.removeEventListener("touchstart", touchStart);
    canvasEl.removeEventListener("touchmove", touchMove);
    canvasEl.removeEventListener("touchend", touchEnd);
    canvasEl.removeEventListener("pointermove", pointerMove);
    canvasEl.removeEventListener("click", clickHandler);
    themeObserver.disconnect();
    resizeObs.disconnect();
    controls.dispose();

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
    renderer.dispose();

    const w = window as unknown as Record<string, unknown>;
    if (w[CLEANUP_KEY] === cleanup) delete w[CLEANUP_KEY];
  };

  (window as unknown as Record<string, () => void>)[CLEANUP_KEY] = cleanup;
  document.addEventListener("astro:before-swap", cleanup, { once: true });
  document.addEventListener("swup:willReplaceContent", cleanup, { once: true });

  return cleanup;
}
