import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HOME_PROFILE } from "@/consts";
import {
  createHomeBoardContent,
  type HomeBoardContent,
  type HomeBoardDevice,
  type HomeBoardItem,
} from "./homeBoard";
import { drawHomeScreenBackdrop, drawHomeScreenStory } from "./homeScreenStory";

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
    screenBg: "#f5f7ff",
    screenText: "#0f172a",
    screenMuted: "#64748b",
    screenAccent: "#4b6bff",
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
    screenBg: "#0f172a",
    screenText: "#e2e8f0",
    screenMuted: "#94a3b8",
    screenAccent: "#839dff",
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
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type Interactive = {
  object: THREE.Object3D;
  label: string;
  route: string;
  basePos: THREE.Vector3;
};

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

const getDeviceClass = (width: number, height: number): HomeBoardDevice => {
  return width > height ? "desktop" : "mobile";
};

const SCREEN_CARRIER_PRESETS: Record<HomeBoardDevice, ScreenCarrierPreset> = {
  desktop: {
    canvas: { width: 2560, height: 1440 },
    screen: { w: 1.38, h: 0.8, t: 0.026 },
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
    roomDistance: 5.6,
    roomUp: 2.2,
    roomRight: 0.62,
    introTargetUp: 0,
    roomTargetUp: 0.22,
    roomTargetRight: 0.04,
  },
};

const createScreenCarrierPreset = (
  device: HomeBoardDevice,
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
  const boardHitareaEl = document.querySelector<HTMLElement>("[data-home-board-hitarea]");
  const hintEl = document.querySelector<HTMLElement>("[data-diorama-hint]");
  const cueEl = document.querySelector<HTMLElement>("[data-home-scroll-cue]");
  const cuePercentEl = document.querySelector<HTMLElement>("[data-home-cue-percent]");
  const tooltip = document.querySelector<HTMLElement>("[data-diorama-tooltip]");
  const docEl = document.documentElement;
  const deviceClass = getDeviceClass(window.innerWidth, window.innerHeight);
  const screenPreset = createScreenCarrierPreset(
    deviceClass,
    window.innerWidth / Math.max(1, window.innerHeight),
  );
  const useMobileCarrier = deviceClass === "mobile";
  let activeBoard = createHomeBoardContent(
    {
      title: HOME_PROFILE.title,
      subtitle: HOME_PROFILE.subtitle,
      stack: "Rust · TypeScript",
      contact: "lsy22@vip.qq.com",
      postsLabel: "ongoing",
      thread: HOME_PROFILE.typewriter[0] ?? "now building",
      now: "北京时间加载中",
    },
    deviceClass,
  );

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, useMobileCarrier ? 1.35 : 1.5));
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

  const lampLight = new THREE.PointLight(0xffd58a, 0.85, 4, 1.6);
  lampLight.position.set(-1.1, 0.85, -0.6);
  scene.add(lampLight);

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

  const tvLight = new THREE.PointLight(0xff8866, 0.3, 2.5, 1.6);
  tvLight.position.set(-2.8, 1.3, -0.5);
  scene.add(tvLight);

  // ===== Materials =====
  const mats = {
    floor: new THREE.MeshStandardMaterial({ color: 0xb89068, roughness: 0.92, transparent: true }),
    wall: new THREE.MeshStandardMaterial({ color: 0xe8dfc8, roughness: 0.96, transparent: true }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf2ebd8, roughness: 0.98, transparent: true }),
    deskTop: new THREE.MeshToonMaterial({ color: 0xb58863 }),
    deskLeg: new THREE.MeshToonMaterial({ color: 0x6b4a32 }),
    lampBody: new THREE.MeshToonMaterial({ color: 0x2a2420 }),
    lampShade: new THREE.MeshToonMaterial({ color: 0xe4a94a, side: THREE.DoubleSide }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffeaa0, emissive: 0xffd58a, emissiveIntensity: 0.5, roughness: 0.25 }),
    laptopBody: new THREE.MeshToonMaterial({ color: 0x8a8d94 }),
    laptopFrame: new THREE.MeshToonMaterial({ color: 0x3a3e48 }),
    screen: null as unknown as THREE.MeshBasicMaterial,
    windowFrame: new THREE.MeshToonMaterial({ color: 0x6b4a32, transparent: true }),
    windowSill: new THREE.MeshToonMaterial({ color: 0xa27c54, transparent: true }),
    sky: new THREE.MeshBasicMaterial({ color: 0xd8ecff, transparent: true }),
    books: [
      new THREE.MeshToonMaterial({ color: 0xb04444 }),
      new THREE.MeshToonMaterial({ color: 0x3e7d6a }),
      new THREE.MeshToonMaterial({ color: 0xd4a94a }),
    ],
    tvBody: new THREE.MeshToonMaterial({ color: 0x2a2a30 }),
    pot: new THREE.MeshToonMaterial({ color: 0x9a6b4a }),
    leaf: new THREE.MeshToonMaterial({ color: 0x9fc970, side: THREE.DoubleSide }),
    personSkin: new THREE.MeshToonMaterial({ color: 0xeec8a8 }),
    personHair: new THREE.MeshToonMaterial({ color: 0x241811 }),
    personCloth: new THREE.MeshToonMaterial({ color: 0x4a6a8a }),
    key: new THREE.MeshToonMaterial({ color: 0x2a2a30 }),
    petal: new THREE.MeshBasicMaterial({ color: 0xffc8dc, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    rain: new THREE.MeshBasicMaterial({ color: 0xaec8e0, transparent: true, opacity: 0 }),
    mapleLeaf: new THREE.MeshBasicMaterial({ color: 0xd46830, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    snow: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  };
  const revealMaterials: THREE.Material[] = [
    mats.floor,
    mats.wall,
    mats.ceiling,
    mats.deskTop,
    mats.deskLeg,
    mats.lampBody,
    mats.lampShade,
    mats.bulb,
    mats.laptopBody,
    mats.laptopFrame,
    ...mats.books,
    mats.tvBody,
    mats.pot,
    mats.leaf,
    mats.personSkin,
    mats.personHair,
    mats.personCloth,
    mats.key,
    mats.windowFrame,
    mats.windowSill,
    mats.sky,
  ];
  for (const mat of revealMaterials) {
    mat.transparent = true;
    mat.opacity = 0;
  }

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

  const lpBaseW = useMobileCarrier ? 1.25 : 1.45;
  const lpBaseD = 0.88;
  const lpBaseH = 0.05;

  const lpBase = new THREE.Mesh(
    new THREE.BoxGeometry(lpBaseW, lpBaseH, lpBaseD),
    mats.laptopBody,
  );
  lpBase.position.y = lpBaseH / 2 + 0.002;
  lpBase.castShadow = true;
  lpBase.receiveShadow = true;
  lpBase.visible = !useMobileCarrier;
  laptop.add(lpBase);

  // Screen (hinged at back edge)
  const lpScreenGroup = new THREE.Group();
  lpScreenGroup.position.copy(screenPreset.groupPosition);
  const lpScreenW = screenPreset.screen.w;
  const lpScreenH = screenPreset.screen.h;
  const lpScreenT = screenPreset.screen.t;
  let mobileShellH = 0;
  let mobileShellDepth = 0;
  const lpScreenBody = new THREE.Mesh(
    new THREE.BoxGeometry(lpScreenW, lpScreenH, lpScreenT),
    mats.laptopFrame,
  );
  lpScreenBody.position.y = screenPreset.screenFaceYOffset;
  lpScreenBody.position.z = screenPreset.screenBodyOffsetZ;
  lpScreenBody.castShadow = true;
  lpScreenBody.visible = !useMobileCarrier;
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
    color: useMobileCarrier ? 0xd9e1ee : 0xffffff,
  });

  const screenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(lpScreenW - 0.06, lpScreenH - 0.06),
    mats.screen,
  );
  const screenFaceW = lpScreenW - 0.06;
  const screenFaceH = lpScreenH - 0.06;
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
  screenFace.position.set(0, screenPreset.screenFaceYOffset, 0.002);
  screenFace.renderOrder = 1;
  lpScreenGroup.add(screenFace);

  lpScreenGroup.rotation.x = screenPreset.groupRotationX;
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
  keyMesh.visible = !useMobileCarrier;
  laptop.add(keyMesh);

  // Trackpad (visual only)
  const trackpad = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.003, 0.22),
    mats.laptopFrame,
  );
  trackpad.position.set(0, lpBaseH + 0.002, 0.28);
  trackpad.visible = !useMobileCarrier;
  laptop.add(trackpad);

  if (useMobileCarrier) {
    const shellPaddingX = 0.04;
    const shellPaddingTop = 0.054;
    const shellPaddingBottom = 0.064;
    const shellDepth = 0.044;
    const shellRadius = 0.07;
    const shellW = screenFaceW + shellPaddingX * 2;
    const shellH = screenFaceH + shellPaddingTop + shellPaddingBottom;
    mobileShellH = shellH;
    mobileShellDepth = shellDepth;

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

  laptop.position.set(
    useMobileCarrier ? -0.02 : 0.1,
    deskTopWorldY + (useMobileCarrier ? 0.22 : 0),
    useMobileCarrier ? -0.26 : -0.2,
  );
  laptop.rotation.set(0, 0, 0);
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

  // ===== Bonsai Tree (with 8 seasonal states) =====
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

  // Procedural Trunk and Branches (L-System style)
  const trunkGroup = new THREE.Group();
  trunkGroup.position.y = 0.2;
  plant.add(trunkGroup);

  const branches = new THREE.Group();
  trunkGroup.add(branches);

  const branchTips: THREE.Vector3[] = [];
  const maxDepth = 4;

  const buildBranch = (
    startPos: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    radius: number,
    depth: number,
    upVector: THREE.Vector3
  ) => {
    // 1. Create the mesh
    const branchGeo = new THREE.CylinderGeometry(radius * 0.6, radius, length, 6);
    // Translate geometry so origin is at the base
    branchGeo.translate(0, length / 2, 0);
    const branch = new THREE.Mesh(branchGeo, mats.deskLeg);

    // 2. Position at the base
    branch.position.copy(startPos);

    // 3. Orient the branch
    const quaternion = new THREE.Quaternion();
    // Cylinder by default points along Y axis (0, 1, 0)
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    branch.quaternion.copy(quaternion);

    branch.castShadow = true;
    branches.add(branch);

    // 4. Calculate the tip position for the next branches or foliage
    const endPos = startPos.clone().add(dir.clone().normalize().multiplyScalar(length));

    // 5. Recursion or collect tip
    if (depth >= maxDepth) {
      branchTips.push(endPos);
      return;
    }

    // Add foliage not just at max depth
    if (depth >= maxDepth - 1) {
       // Collect a couple of near-terminal positions so the canopy feels fuller.
       const midPosA = startPos.clone().lerp(endPos, 0.38 + Math.random() * 0.22);
       const midPosB = startPos.clone().lerp(endPos, 0.62 + Math.random() * 0.2);
       branchTips.push(midPosA, midPosB);
    } else if (depth === maxDepth - 2 && Math.random() > 0.25) {
       const midPos = startPos.clone().lerp(endPos, 0.48 + Math.random() * 0.3);
       branchTips.push(midPos);
    }

    // Parameters for next branches
    const lengthDecay = 0.65 + Math.random() * 0.15;
    const radiusDecay = 0.6 + Math.random() * 0.1;
    const branchCount = depth === 1 ? 2 : (Math.random() > 0.3 ? 2 : 3); // More branches at lower depths

    // Create a base local rotation frame perpendicular to current direction
    let localRight = new THREE.Vector3().crossVectors(upVector, dir).normalize();
    if (localRight.lengthSq() < 0.001) {
       localRight = new THREE.Vector3(1, 0, 0);
    }
    const localForward = new THREE.Vector3().crossVectors(localRight, dir).normalize();

    // Determine how much to spread out from the main axis
    let baseSpreadAngle = (0.6 + Math.random() * 0.3) / depth;
    // Phototropism: bend slightly towards global up
    const globalUpWeight = 0.15 * depth;

    // Roll angle distributes branches around the stem
    let currentRoll = Math.random() * Math.PI * 2;
    const rollStep = (Math.random() > 0.5 ? 1 : -1) * (Math.PI * 2 / branchCount + (Math.random() - 0.5) * 0.5);

    for (let i = 0; i < branchCount; i++) {
        // Calculate new direction
        const spreadAngle = baseSpreadAngle * (0.8 + Math.random() * 0.4);

        // Vector spreading outward
        const spreadVec = localRight.clone().multiplyScalar(Math.cos(currentRoll)).add(
             localForward.clone().multiplyScalar(Math.sin(currentRoll))
        );

        // Combine forward direction with spread
        let newDir = dir.clone().normalize().multiplyScalar(Math.cos(spreadAngle)).add(
            spreadVec.multiplyScalar(Math.sin(spreadAngle))
        );

        // Apply phototropism (blend with global up)
        newDir.lerp(new THREE.Vector3(0, 1, 0), globalUpWeight).normalize();

        buildBranch(endPos, newDir, length * lengthDecay, radius * radiusDecay, depth + 1, dir);

        currentRoll += rollStep;
    }
  };

  // Start the recursive tree build
  const startPos = new THREE.Vector3(0, 0, 0);
  // Initial slightly twisted direction
  const startDir = new THREE.Vector3((Math.random()-0.5)*0.2, 1, (Math.random()-0.5)*0.2).normalize();
  const startLength = 0.2 + Math.random() * 0.05;
  const startRadius = 0.025;
  buildBranch(startPos, startDir, startLength, startRadius, 1, new THREE.Vector3(0,0,-1));

  // Foliage elements (Leaves, Flowers, Buds)
  const foliageGroup = new THREE.Group();
  trunkGroup.add(foliageGroup);
  const foliageMaterials: THREE.MeshToonMaterial[] = [];

  type FoliageItem = {
    mesh: THREE.Mesh;
    type: "leaf" | "flower" | "bud";
    baseScale: THREE.Vector3;
    tipIdx: number;
    localPos: THREE.Vector3;
  };
  const foliageItems: FoliageItem[] = [];

  const addFoliageCluster = (tip: THREE.Vector3, tipIdx: number) => {
    // 1. Leaves (flat planes, starburst/fan pattern, crossed for volume)
    const numLeaves = 11;
    for (let i = 0; i < numLeaves; i++) {
      const angle = (i / numLeaves) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 0.016 + Math.random() * 0.045;
      const offsetX = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.018;
      const offsetY = (Math.random() - 0.08) * 0.06;
      const offsetZ = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.018;
      const baseScale = new THREE.Vector3(0.56 + Math.random() * 0.34, 0.56 + Math.random() * 0.34, 0.56 + Math.random() * 0.34);
      const tilt = Math.random() * 0.8 + 0.2;

      // Base leaf material with jitter
      const leafMat = mats.leaf.clone();
      leafMat.side = THREE.DoubleSide;
      leafMat.transparent = true;
      leafMat.opacity = 0;
      const hsl = { h: 0, s: 0, l: 0 };
      leafMat.color.getHSL(hsl);
      leafMat.color.setHSL(
        hsl.h + (Math.random() - 0.5) * 0.05,
        hsl.s + (Math.random() - 0.5) * 0.1,
        hsl.l + (Math.random() - 0.5) * 0.1
      );
      foliageMaterials.push(leafMat);

      // Create two meshes for volume (crossed planes)
      for (let j = 0; j < 2; j++) {
        const leafGeo = makeMapleGeo();
        const leaf = new THREE.Mesh(leafGeo, leafMat);

        leaf.position.set(tip.x + offsetX, tip.y + offsetY, tip.z + offsetZ);
        leaf.scale.copy(baseScale);

        const offsetAngle = angle + (j * Math.PI / 2); // 90-degree offset for the second plane
        leaf.rotation.set(tilt * Math.cos(offsetAngle), offsetAngle, tilt * Math.sin(offsetAngle));

        leaf.castShadow = true;
        foliageGroup.add(leaf);
        foliageItems.push({ mesh: leaf, type: "leaf", baseScale, tipIdx, localPos: leaf.position.clone() });
      }
    }

    // 2. Flowers (Pink blossoms for spring, flat planes, crossed for volume, tighter cluster)
    const numFlowers = 7;
    for (let i = 0; i < numFlowers; i++) {
      const angle = (i / numFlowers) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 0.01 + Math.random() * 0.03;
      const offsetX = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.012;
      const offsetY = (Math.random() - 0.3) * 0.04;
      const offsetZ = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.012;
      const baseScale = new THREE.Vector3(0.48 + Math.random() * 0.08, 0.48 + Math.random() * 0.08, 0.48 + Math.random() * 0.08);
      const tilt = Math.random() * 0.8 + 0.2;

      // Flower material with jitter
      const flowerMat = new THREE.MeshToonMaterial({
        color: 0xffb6c1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const hsl = { h: 0, s: 0, l: 0 };
      flowerMat.color.getHSL(hsl);
      flowerMat.color.setHSL(
        hsl.h + (Math.random() - 0.5) * 0.05,
        hsl.s + (Math.random() - 0.5) * 0.1,
        hsl.l + (Math.random() - 0.5) * 0.1
      );
      foliageMaterials.push(flowerMat);

      // Create two meshes for volume (crossed planes)
      for (let j = 0; j < 2; j++) {
        const flowerGeo = makePetalGeo();
        const flower = new THREE.Mesh(flowerGeo, flowerMat);

        flower.position.set(tip.x + offsetX, tip.y + offsetY, tip.z + offsetZ);
        flower.scale.copy(baseScale);

        const offsetAngle = angle + (j * Math.PI / 2); // 90-degree offset for the second plane
        flower.rotation.set(tilt * Math.cos(offsetAngle), offsetAngle, tilt * Math.sin(offsetAngle));

        flower.castShadow = true;
        foliageGroup.add(flower);
        foliageItems.push({ mesh: flower, type: "flower", baseScale, tipIdx, localPos: flower.position.clone() });
      }
    }

    // 3. Buds (True buds for early spring, using DodecahedronGeometry for volume)
    const numBuds = 4;
    for (let i = 0; i < numBuds; i++) {
      const angle = (i / numBuds) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 0.012 + Math.random() * 0.038;
      const offsetX = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.016;
      const offsetY = (Math.random() - 0.3) * 0.05;
      const offsetZ = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.016;
      const baseScale = new THREE.Vector3(0.9 + Math.random() * 0.18, 0.9 + Math.random() * 0.18, 0.9 + Math.random() * 0.18);
      const tilt = Math.random() * 0.8 + 0.2;

      // Bud material with jitter
      const budMat = new THREE.MeshToonMaterial({
        color: 0x8fbc8f,
        transparent: true,
        opacity: 0,
      }); // Dark sea green
      const hsl = { h: 0, s: 0, l: 0 };
      budMat.color.getHSL(hsl);
      budMat.color.setHSL(
        hsl.h + (Math.random() - 0.5) * 0.05,
        hsl.s + (Math.random() - 0.5) * 0.1,
        hsl.l + (Math.random() - 0.5) * 0.1
      );
      foliageMaterials.push(budMat);

      // Volume bud
      const budGeo = new THREE.DodecahedronGeometry(0.015, 0);
      const bud = new THREE.Mesh(budGeo, budMat);

      bud.position.set(tip.x + offsetX, tip.y + offsetY, tip.z + offsetZ);
      bud.scale.copy(baseScale);
      bud.rotation.set(tilt * Math.cos(angle), angle, tilt * Math.sin(angle));

      bud.castShadow = true;
      foliageGroup.add(bud);
      foliageItems.push({ mesh: bud, type: "bud", baseScale, tipIdx, localPos: bud.position.clone() });
    }
  };

  branchTips.forEach((tip, i) => addFoliageCluster(tip, i));

  // Move plant toward desk center
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
    transparent: true,
    opacity: 0,
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
    return { armGroup, elbowGroup, wrist, hand };
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
  person.scale.setScalar(1);
  person.rotation.set(0, 0, 0);
  leftArm.armGroup.rotation.x = 1.24;
  leftArm.armGroup.rotation.z = 0.06;
  leftArm.elbowGroup.rotation.x = 0.32;
  leftArm.hand.position.set(0, -0.435, 0.04);
  rightArm.armGroup.rotation.x = 1.24;
  rightArm.armGroup.rotation.z = -0.06;
  rightArm.elbowGroup.rotation.x = 0.32;
  rightArm.hand.position.set(0, -0.435, 0.04);
  torso.rotation.x = 0;
  torso.rotation.y = 0;
  head.position.z = 0;
  hair.position.z = 0;
  if (useMobileCarrier) {
    person.position.set(-0.02, 0, 0.62);
    person.scale.setScalar(0.84);
    person.rotation.y = 0;
    chairSeat.scale.z = 0.84;
    chairBack.scale.z = 0.86;
    chairBack.position.z = 0.31;
    shoulderL.position.z = 0.03;
    shoulderR.position.z = 0.03;
    torso.scale.set(0.92, 1, 0.72);
    pelvis.scale.z = 0.72;
    leftArm.armGroup.visible = false;
    rightArm.armGroup.visible = false;
    torso.rotation.x = -0.1;
    torso.rotation.y = 0;
    head.position.z = -0.015;
    hair.position.z = -0.015;

    const deskHandY = deskTopWorldY + 0.018;
    const toPersonLocal = (world: THREE.Vector3) =>
      world.clone().sub(person.position).divideScalar(person.scale.x);
    const makeBone = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      radiusTop: number,
      radiusBottom: number,
      material: THREE.Material,
    ) => {
      const delta = end.clone().sub(start);
      const length = Math.max(0.001, delta.length());
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 12),
        material,
      );
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      mesh.castShadow = true;
      return mesh;
    };

    const makeMobileArm = (side: -1 | 1) => {
      const wristWorld = new THREE.Vector3(
        person.position.x + (side === -1 ? -0.1 : 0.12),
        deskHandY,
        person.position.z - 0.62,
      );
      const elbowWorld = new THREE.Vector3(
        person.position.x + (side === -1 ? -0.2 : 0.22),
        deskTopWorldY + 0.085,
        person.position.z - 0.3,
      );
      const shoulderLocal = new THREE.Vector3(0.18 * side, 0.545, -0.01);
      const elbowLocal = toPersonLocal(elbowWorld);
      const wristLocal = toPersonLocal(wristWorld);

      const armGroup = new THREE.Group();
      armGroup.add(makeBone(shoulderLocal, elbowLocal, 0.066, 0.058, mats.personCloth));

      const shoulderCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 12, 10),
        mats.personCloth,
      );
      shoulderCap.position.copy(shoulderLocal);
      armGroup.add(shoulderCap);

      const elbowCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 12, 10),
        mats.personCloth,
      );
      elbowCap.position.copy(elbowLocal);
      armGroup.add(elbowCap);

      armGroup.add(makeBone(elbowLocal, wristLocal, 0.054, 0.046, mats.personCloth));

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.028, 12),
        mats.personCloth,
      );
      cuff.position.copy(wristLocal);
      cuff.rotation.z = Math.PI / 2;
      armGroup.add(cuff);

      const wrist = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 12, 10),
        mats.personSkin,
      );
      wrist.position.copy(wristLocal);
      armGroup.add(wrist);

      const forearmDirWorld = wristWorld.clone().sub(elbowWorld).normalize();
      const handWorld = wristWorld
        .clone()
        .addScaledVector(forearmDirWorld, 0.052)
        .add(new THREE.Vector3(0, 0.004, 0));
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 16, 14),
        mats.personSkin,
      );
      hand.position.copy(toPersonLocal(handWorld));
      hand.castShadow = true;
      armGroup.add(hand);

      person.add(armGroup);
    };

    makeMobileArm(-1);
    makeMobileArm(1);
  }
  scene.add(person);

  if (useMobileCarrier) {
    const standBaseW = clamp(screenFaceW * 0.72, 0.17, 0.34);
    const standBraceW = clamp(screenFaceW * 0.58, 0.13, 0.28);
    const standLipW = clamp(screenFaceW * 0.48, 0.11, 0.22);
    const standBase = new THREE.Mesh(
      new RoundedBoxGeometry(standBaseW, 0.02, 0.12, 6, 0.014),
      mats.windowFrame,
    );
    standBase.position.set(laptop.position.x, deskTopWorldY + 0.01, laptop.position.z - 0.03);
    standBase.castShadow = true;
    standBase.receiveShadow = true;
    scene.add(standBase);

    const standPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.14, 0.03),
      mats.windowFrame,
    );
    standPost.position.set(laptop.position.x, deskTopWorldY + 0.08, laptop.position.z - 0.07);
    standPost.castShadow = true;
    scene.add(standPost);

    const standBrace = new THREE.Mesh(
      new RoundedBoxGeometry(standBraceW, 0.18, 0.026, 6, 0.016),
      mats.windowFrame,
    );
    standBrace.position.set(
      laptop.position.x,
      deskTopWorldY + 0.16,
      laptop.position.z - 0.055,
    );
    standBrace.rotation.x = -0.34;
    standBrace.castShadow = true;
    scene.add(standBrace);

    const standLip = new THREE.Mesh(
      new RoundedBoxGeometry(standLipW, 0.026, 0.026, 6, 0.01),
      mats.windowFrame,
    );
    standLip.position.set(
      laptop.position.x,
      deskTopWorldY + 0.023,
      laptop.position.z + 0.02,
    );
    standLip.castShadow = true;
    scene.add(standLip);
  }

  // ===== Interactive registry =====
  // Lamp + window are decorative only. Notebook → /articles, clicking the person → /about.
  const projectLabel = deviceClass === "desktop" ? "电脑 · 项目" : "手机 · 项目";
  const aboutTarget = person;
  const interactives: Interactive[] = [
    { object: notebook, label: "笔记本 · 文章", route: "/articles", basePos: notebook.position.clone() },
    { object: laptop, label: projectLabel, route: "/projects", basePos: laptop.position.clone() },
    { object: aboutTarget, label: "lsy · 关于", route: "/about", basePos: aboutTarget.position.clone() },
    { object: bookStack, label: "书 · 读书", route: "/books", basePos: bookStack.position.clone() },
    { object: tv, label: "电视 · 观影", route: "/movies", basePos: tv.position.clone() },
  ];

  const screenWorldNormal = new THREE.Vector3();
  const screenWorldUp = new THREE.Vector3();
  const screenWorldRight = new THREE.Vector3();
  const screenCenterWorld = new THREE.Vector3();
  const screenHalfW = (lpScreenW - 0.06) / 2;
  const screenHalfH = (lpScreenH - 0.06) / 2;
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

    if (useMobileCarrier) {
      roomCameraTarget
        .copy(screenCenterWorld)
        .addScaledVector(screenWorldUp, screenPreset.roomTargetUp)
        .addScaledVector(screenWorldRight, screenPreset.roomTargetRight);
      roomCameraPos
        .copy(screenCenterWorld)
        .addScaledVector(screenWorldNormal, screenPreset.roomDistance)
        .addScaledVector(screenWorldUp, screenPreset.roomUp)
        .addScaledVector(screenWorldRight, screenPreset.roomRight);
    } else {
      roomCameraTarget
        .copy(screenCenterWorld)
        .addScaledVector(screenWorldUp, screenPreset.roomTargetUp)
        .addScaledVector(screenWorldRight, screenPreset.roomTargetRight);
      roomCameraPos
        .copy(screenCenterWorld)
        .addScaledVector(screenWorldNormal, screenPreset.roomDistance)
        .addScaledVector(screenWorldUp, screenPreset.roomUp)
        .addScaledVector(screenWorldRight, screenPreset.roomRight);
    }
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
    mats.ceiling.color.setHex(p.ceiling);
    mats.deskTop.color.setHex(p.deskTop);
    mats.deskLeg.color.setHex(p.deskLeg);
    mats.lampBody.color.setHex(p.lampBody);
    mats.lampShade.color.setHex(p.lampShade);
    mats.bulb.emissive.setHex(p.lampGlow);
    lampLight.color.setHex(p.lampGlow);
    mats.laptopBody.color.setHex(p.laptopBody);
    mats.laptopFrame.color.setHex(p.laptopFrame);
    const mobileScreenTint = t === "dark" ? 0xc1ccd8 : 0xd9e1ee;
    mats.screen.color.setHex(useMobileCarrier ? mobileScreenTint : 0xffffff);
    introBackdropMaterial?.color.setHex(mobileScreenTint);
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

  // ===== Scroll-driven homepage state =====
  type RenderMode = "story" | "handoff" | "room";
  const STORY_MODE_END = 0.7;
  const HANDOFF_MODE_END = 0.735;
  const STORY_PROGRESS_END = 0.7;
  const SCREEN_REDRAW_STEP = 0.0035;
  const STORY_FADE_START = 0.695;
  const STORY_FADE_END = 0.71;
  const SCENE_FADE_START = 0.708;
  const SCENE_FADE_END = 0.735;
  const getRenderMode = (progress: number): RenderMode => {
    if (progress < STORY_MODE_END) return "story";
    if (progress < HANDOFF_MODE_END) return "handoff";
    return "room";
  };
  let homeProgress = 0;
  let scrollTargetProgress = 0;
  let renderMode = getRenderMode(homeProgress);
  let lastDrawnStoryProgress = -1;
  let boardScale = 1;
  const getInitialBoardViewY = () => {
    if (!useMobileCarrier) return activeBoard.viewport.initialY;
    const viewportAspect = window.innerWidth / Math.max(1, window.innerHeight);
    const shortPortraitCompensation = clamp((viewportAspect - 0.5) / 0.25, 0, 1) * 430;
    return activeBoard.viewport.initialY - shortPortraitCompensation;
  };
  let boardViewX = activeBoard.viewport.initialX;
  let boardViewY = getInitialBoardViewY();
  let boardDragging = false;
  let dragRegion = { x: 0, y: 0, w: 1, h: 1, radius: 28 };
  const clampBoardView = (x: number, y: number) => {
    const viewport = activeBoard.viewport;
    return {
      x: clamp(x, viewport.minX, viewport.maxX),
      y: clamp(y, viewport.minY, viewport.maxY),
    };
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
    if (useMobileCarrier && homeProgress < 0.16 && !boardDragging) {
      boardViewY = getInitialBoardViewY();
      needScreenRedraw = true;
    }
    syncScrollProgress();
  };
  window.addEventListener("resize", handleBreakpointResize);

  const applyHomeState = (progress: number) => {
    const value = progress.toFixed(4);
    const storyProgress = clamp(progress / STORY_PROGRESS_END);
    docEl.style.setProperty("--home-progress", value);
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

  // ===== Season state =====
  const seasonOfYear = 0.3;
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

  const resizeStoryCanvas = () => {
    if (!storyCanvasEl) return false;
    const rect = storyCanvasEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextW = Math.max(1, Math.round((rect.width || window.innerWidth) * dpr));
    const nextH = Math.max(1, Math.round((rect.height || window.innerHeight) * dpr));
    const changed = storyCanvasEl.width !== nextW || storyCanvasEl.height !== nextH;
    if (changed) {
      storyCanvasEl.width = nextW;
      storyCanvasEl.height = nextH;
    }
    return changed;
  };

  const drawStoryOverlay = (storyInput: Parameters<typeof drawHomeScreenStory>[1]) => {
    if (!storyCanvasEl || !storyCtx) return;
    resizeStoryCanvas();
    const W = storyCanvasEl.width;
    const H = storyCanvasEl.height;
    storyCtx.setTransform(1, 0, 0, 1, 0, 0);
    storyCtx.clearRect(0, 0, W, H);
    storyCtx.imageSmoothingEnabled = true;
    storyCtx.imageSmoothingQuality = "medium";
    if (W > H) {
      const scale = Math.max(W / screenCanvas.width, H / screenCanvas.height);
      const drawW = screenCanvas.width * scale;
      const drawH = screenCanvas.height * scale;
      storyCtx.drawImage(screenCanvas, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
      return;
    }
    drawHomeScreenStory(storyCtx, { ...storyInput, device: "mobile" });
  };

  // Screen canvas drawing
  const drawScreen = (targets?: { overlay?: boolean; texture?: boolean }) => {
    const drawOverlay = targets?.overlay ?? renderMode !== "room";
    const updateTexture = targets?.texture ?? renderMode !== "story";
    const ctx = screenCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W = screenCanvas.width;
    const H = screenCanvas.height;
    const p = THEMES[theme];
    const storyAutoPosts = (window as unknown as { __HOME_POSTS_LABEL?: string }).__HOME_POSTS_LABEL;
    const profileRows = Object.fromEntries(HOME_PROFILE.rows.map((row) => [row.label, row.value]));
    const storyProgress = reduceMotion ? 1 : clamp(homeProgress / STORY_PROGRESS_END);
    const storyInput: Parameters<typeof drawHomeScreenStory>[1] = {
      device: deviceClass,
      theme,
      progress: storyProgress,
      now: formatNowBeijing(),
      stack: profileRows.stack ?? "Rust · TypeScript",
      contact: profileRows.contact ?? "lsy22@vip.qq.com",
      postsLabel: storyAutoPosts ?? "ongoing",
    };

    const overlayUsesScreenCanvas = drawOverlay && !useMobileCarrier;
    if (updateTexture || overlayUsesScreenCanvas) {
      drawHomeScreenStory(ctx, storyInput);
    }
    if (updateTexture && introBackdropCtx && introBackdropTexture) {
      introBackdropCtx.setTransform(1, 0, 0, 1, 0, 0);
      drawHomeScreenBackdrop(introBackdropCtx, {
        theme,
        progress: storyProgress,
      });
      introBackdropTexture.needsUpdate = true;
    }
    boardScale = 1;
    dragRegion = { x: 0, y: 0, w: 1, h: 1, radius: Math.min(W, H) * 0.02 };
    if (updateTexture) screenTexture.needsUpdate = true;
    if (drawOverlay) drawStoryOverlay(storyInput);
    lastDrawnStoryProgress = storyProgress;
    return;
    const edgeStroke = theme === "dark" ? "rgba(148, 163, 184, 0.16)" : "rgba(75, 107, 255, 0.12)";
    const frameFill = theme === "dark" ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.9)";
    const sidebarFill = theme === "dark" ? "rgba(15, 23, 42, 0.92)" : "rgba(248, 250, 255, 0.92)";
    const boardPanelFill = theme === "dark" ? "rgba(15, 23, 42, 0.22)" : "rgba(255, 255, 255, 0.32)";
    const shadowColor = theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(37, 65, 183, 0.1)";
    const autoPosts = (window as unknown as { __HOME_POSTS_LABEL?: string }).__HOME_POSTS_LABEL;
    const nowStr = formatNowBeijing();
    const rows = Object.fromEntries(HOME_PROFILE.rows.map((row) => [row.label, row.value]));
    const threadValue = typerText || HOME_PROFILE.typewriter[0] || "now building";
    const board = createHomeBoardContent({
      title: HOME_PROFILE.title,
      subtitle: HOME_PROFILE.subtitle,
      stack: rows.stack ?? "Rust · TypeScript",
      contact: rows.contact ?? "lsy22@vip.qq.com",
      postsLabel: autoPosts ?? "ongoing",
      thread: threadValue,
      now: nowStr,
    }, deviceClass);
    activeBoard = board;

    const drawRoundedPanel = (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
      fill: string,
      stroke = edgeStroke,
    ) => {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 10;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      ctx.shadowColor = "rgba(0, 0, 0, 0)";
      ctx.stroke();
      ctx.restore();
    };

    const drawPill = (
      x: number,
      y: number,
      text: string,
      accent = false,
      fontSize = 14,
      paddingX = 14,
      height = 28,
    ) => {
      ctx.save();
      ctx.font = `500 ${fontSize}px 'JetBrains Mono', monospace`;
      const width = ctx.measureText(text).width + paddingX * 2;
      ctx.fillStyle = accent
        ? theme === "dark"
          ? "rgba(131, 157, 255, 0.18)"
          : "rgba(75, 107, 255, 0.11)"
        : theme === "dark"
          ? "rgba(255, 255, 255, 0.06)"
          : "rgba(255, 255, 255, 0.76)";
      ctx.strokeStyle = accent
        ? theme === "dark"
          ? "rgba(131, 157, 255, 0.3)"
          : "rgba(75, 107, 255, 0.22)"
        : edgeStroke;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, height / 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent ? p.screenAccent : p.screenMuted;
      ctx.fillText(text, x + paddingX, y + height * 0.68);
      ctx.restore();
      return width;
    };

    const drawBoardConnector = (points: [number, number][], tone: "ink" | "soft" | "amber") => {
      if (points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = tone === "amber"
        ? theme === "dark"
          ? "rgba(131, 157, 255, 0.34)"
          : "rgba(75, 107, 255, 0.36)"
        : tone === "soft"
          ? theme === "dark"
            ? "rgba(148, 163, 184, 0.28)"
            : "rgba(71, 85, 105, 0.3)"
          : theme === "dark"
            ? "rgba(131, 157, 255, 0.5)"
            : "rgba(75, 107, 255, 0.48)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const midX = (previous[0] + current[0]) / 2;
        const midY = (previous[1] + current[1]) / 2;
        ctx.quadraticCurveTo(previous[0], previous[1], midX, midY);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last[0], last[1]);
      ctx.stroke();
      ctx.restore();
    };

    const getToneFill = (tone: HomeBoardItem["tone"]) => {
      if (tone === "accent") return theme === "dark" ? "rgba(30, 41, 59, 0.92)" : "rgba(235, 240, 255, 0.96)";
      if (tone === "amber") return theme === "dark" ? "rgba(30, 41, 59, 0.9)" : "rgba(239, 243, 255, 0.94)";
      if (tone === "ghost") return theme === "dark" ? "rgba(15, 23, 42, 0.76)" : "rgba(248, 250, 252, 0.78)";
      return theme === "dark" ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.92)";
    };

    const getToneStroke = (tone: HomeBoardItem["tone"]) => {
      if (tone === "accent") return theme === "dark" ? "rgba(131, 157, 255, 0.26)" : "rgba(75, 107, 255, 0.18)";
      if (tone === "amber") return theme === "dark" ? "rgba(131, 157, 255, 0.2)" : "rgba(75, 107, 255, 0.16)";
      return edgeStroke;
    };

    const getValueFont = (item: HomeBoardItem) => {
      if (item.kind === "hero") return "500 112px 'Fraunces', 'Noto Serif SC', serif";
      const size = item.valueSize ?? "md";
      if (size === "xl") return "500 64px 'Fraunces', 'Noto Serif SC', serif";
      if (size === "lg") return "500 40px 'Fraunces', 'Noto Serif SC', serif";
      if (size === "sm") return "500 17px 'JetBrains Mono', monospace";
      return "500 23px 'JetBrains Mono', 'Noto Serif SC', monospace";
    };

    const wrapText = (text: string, maxWidth: number, font: string) => {
      ctx.save();
      ctx.font = font;
      const lines: string[] = [];
      let current = "";
      Array.from(text).forEach((char) => {
        const next = current + char;
        if (current && ctx.measureText(next).width > maxWidth) {
          lines.push(current);
          current = char.trimStart();
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      ctx.restore();
      return lines;
    };

    const drawBodyLines = (
      lines: string[],
      x: number,
      y: number,
      lineHeight: number,
      color: string,
      font = "400 17px 'JetBrains Mono', monospace",
    ) => {
      ctx.save();
      ctx.font = font;
      ctx.fillStyle = color;
      lines.forEach((line, index) => {
        ctx.fillText(line, x, y + index * lineHeight);
      });
      ctx.restore();
    };

    const drawBoardItem = (item: HomeBoardItem) => {
      const fill = getToneFill(item.tone);
      const stroke = getToneStroke(item.tone);
      const rotation = THREE.MathUtils.degToRad(item.rotate ?? 0);
      const bodyColor = theme === "dark" ? "rgba(226, 232, 240, 0.72)" : "rgba(51, 65, 85, 0.72)";

      ctx.save();
      ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ctx.rotate(rotation);
      drawRoundedPanel(-item.w / 2, -item.h / 2, item.w, item.h, item.kind === "note" ? 14 : 18, fill, stroke);

      if (item.kind === "hero") {
        const heroPad = 24;
        const heroTop = -item.h / 2;
        const heroLeft = -item.w / 2;
        ctx.fillStyle = p.screenMuted;
        ctx.font = "500 12px 'JetBrains Mono', monospace";
        ctx.fillText(item.eyebrow, heroLeft + heroPad, heroTop + 29);
        ctx.fillStyle = p.screenText;
        ctx.font = getValueFont(item);
        ctx.fillText(item.title, heroLeft + heroPad, heroTop + 132);
        ctx.fillStyle = p.screenMuted;
        ctx.font = "500 18px 'JetBrains Mono', monospace";
        ctx.fillText(item.subtitle, heroLeft + heroPad + 4, heroTop + 172);
        let chipX = heroLeft + heroPad;
        const chipY = heroTop + item.h - 38;
        item.chips.forEach((chip, index) => {
          const chipWidth = drawPill(chipX, chipY, chip, index === 0, 11, 11, 23);
          chipX += chipWidth + 12;
        });
        ctx.restore();
        return;
      }

      ctx.fillStyle = p.screenMuted;
      ctx.font = "500 12px 'JetBrains Mono', monospace";
      ctx.fillText(item.eyebrow, -item.w / 2 + 18, -item.h / 2 + 28);
      ctx.fillStyle = p.screenText;
      ctx.font = getValueFont(item);
      const valueX = -item.w / 2 + 18;
      const valueY = -item.h / 2 + (item.kind === "note" ? 62 : 72);
      const valueFont = getValueFont(item);
      const valueMaxWidth = item.w - 36;
      const valueLines = item.value
        .split("\n")
        .flatMap((line) => wrapText(line, valueMaxWidth, valueFont))
        .slice(0, item.kind === "note" ? 3 : 2);
      const lineHeight = item.valueSize === "sm" ? 25 : item.valueSize === "lg" ? 48 : 31;
      valueLines.forEach((line, index) => {
        ctx.fillText(line, valueX, valueY + index * lineHeight);
      });
      if (item.kind === "card" && item.id === "thread" && cursorOn) {
        const lastLine = valueLines[valueLines.length - 1] ?? "";
        const cursorOffset = ctx.measureText(lastLine).width + 10;
        ctx.fillRect(valueX + cursorOffset, valueY - 20 + (valueLines.length - 1) * lineHeight, 8, 18);
      }
      const bodyLines = item.body ?? [];
      if (bodyLines.length > 0) {
        const bodyY = valueY + valueLines.length * lineHeight + 16;
        drawBodyLines(bodyLines, -item.w / 2 + 18, bodyY, 19, bodyColor, "400 13px 'JetBrains Mono', monospace");
      }
      ctx.restore();
    };

    ctx.fillStyle = p.screenBg;
    ctx.fillRect(0, 0, W, H);

    const gradA = ctx.createLinearGradient(0, 0, W, H);
    gradA.addColorStop(0, theme === "dark" ? "rgba(30, 41, 59, 0.78)" : "rgba(235, 240, 255, 0.98)");
    gradA.addColorStop(0.52, theme === "dark" ? "rgba(15, 23, 42, 0.94)" : "rgba(248, 250, 255, 0.98)");
    gradA.addColorStop(1, theme === "dark" ? "rgba(15, 23, 42, 0.88)" : "rgba(241, 245, 249, 0.96)");
    ctx.fillStyle = gradA;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = theme === "dark" ? "rgba(148, 163, 184, 0.055)" : "rgba(75, 107, 255, 0.055)";
    ctx.lineWidth = 1;
    for (let x = 18; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 18; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    const { topbar, sidebar, boardPanel, boardViewport } = board.screen;
    const isDesktopBoard = board.device === "desktop";
    const isMobileBoard = board.device === "mobile";
    const titleFont = isDesktopBoard ? 16 : 14;
    const subtitleFont = isDesktopBoard ? 13 : 12;
    const workspaceTitleFont = isDesktopBoard ? 30 : 24;
    const navFont = board.device === "mobile" ? 13 : 15;
    const pillFont = board.device === "mobile" ? 11 : 13;
    const pillHeight = board.device === "mobile" ? 24 : 28;

    const hasTopbar = topbar.w > 0 && topbar.h > 0;

    if (hasTopbar) {
      drawRoundedPanel(topbar.x, topbar.y, topbar.w, topbar.h, 20, frameFill);
    }
    if (sidebar) {
      drawRoundedPanel(sidebar.x, sidebar.y, sidebar.w, sidebar.h, 22, sidebarFill);
    }
    const boardPanelIsFullBleed = boardPanel.x <= 0 && boardPanel.w >= W;
    if (!boardPanelIsFullBleed) {
      drawRoundedPanel(boardPanel.x, boardPanel.y, boardPanel.w, boardPanel.h, 24, frameFill);
    }

    if (hasTopbar) {
      const trafficBaseX = topbar.x + 36;
      const trafficY = topbar.y + topbar.h / 2;
      ctx.fillStyle = "#d08e64";
      ctx.beginPath(); ctx.arc(trafficBaseX, trafficY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#dfb765";
      ctx.beginPath(); ctx.arc(trafficBaseX + 20, trafficY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#88a1c9";
      ctx.beginPath(); ctx.arc(trafficBaseX + 40, trafficY, 6, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = p.screenText;
      ctx.font = `600 ${titleFont}px 'JetBrains Mono', monospace`;
      ctx.fillText(board.chrome.title, topbar.x + 132, topbar.y + 42);
      ctx.fillStyle = p.screenMuted;
      ctx.font = `400 ${subtitleFont}px 'JetBrains Mono', monospace`;
      ctx.fillText(board.chrome.subtitle, topbar.x + 132, topbar.y + 66);

      const visiblePills = board.chrome.pills.slice(0, 2);
      let pillX = topbar.x + topbar.w - 24;
      for (let index = visiblePills.length - 1; index >= 0; index -= 1) {
        const pill = visiblePills[index];
        const width = drawPill(pillX - 10, topbar.y + 28, pill.label, Boolean(pill.accent), pillFont, 12, pillHeight);
        pillX -= width + 12;
      }
    }

    if (sidebar) {
      ctx.fillStyle = p.screenMuted;
      ctx.font = "500 13px 'JetBrains Mono', monospace";
      ctx.fillText(board.chrome.workspaceLabel, sidebar.x + 28, sidebar.y + 46);
      ctx.fillStyle = p.screenText;
      ctx.font = `500 ${workspaceTitleFont}px 'Fraunces', 'Noto Serif SC', serif`;
      ctx.fillText(board.chrome.workspaceTitle, sidebar.x + 28, sidebar.y + 88);

      board.chrome.sidebarItems.forEach((item, index) => {
        const y = sidebar.y + 128 + index * 74;
        drawRoundedPanel(
          sidebar.x + 24,
          y,
          sidebar.w - 52,
          52,
          18,
          item.active
            ? theme === "dark"
              ? "rgba(131, 157, 255, 0.16)"
              : "rgba(75, 107, 255, 0.12)"
            : theme === "dark"
              ? "rgba(255, 255, 255, 0.035)"
              : "rgba(255, 255, 255, 0.54)",
          item.active
            ? theme === "dark"
              ? "rgba(131, 157, 255, 0.28)"
              : "rgba(75, 107, 255, 0.22)"
            : "transparent",
        );
        ctx.fillStyle = item.active ? p.screenAccent : p.screenText;
        ctx.font = "500 14px 'JetBrains Mono', monospace";
        ctx.fillText(item.label, sidebar.x + 46, y + 31);
      });

      ctx.fillStyle = p.screenMuted;
      ctx.font = "500 13px 'JetBrains Mono', monospace";
      ctx.fillText(board.chrome.routesLabel, sidebar.x + 28, sidebar.y + 512);
      ctx.fillStyle = theme === "dark" ? "rgba(243, 237, 227, 0.72)" : "rgba(42, 36, 31, 0.72)";
      ctx.font = `400 ${navFont}px 'JetBrains Mono', monospace`;
      ctx.fillText(board.chrome.routes.slice(0, 3).join(" / "), sidebar.x + 28, sidebar.y + 544);
      ctx.fillText(board.chrome.routes.slice(3).join(" / "), sidebar.x + 28, sidebar.y + 570);
    } else if (!isMobileBoard && !boardPanelIsFullBleed) {
      ctx.fillStyle = p.screenMuted;
      ctx.font = "500 13px 'JetBrains Mono', monospace";
      ctx.fillText(board.chrome.routesLabel, boardPanel.x + 28, boardPanel.y + boardPanel.h - 64);
      ctx.fillStyle = theme === "dark" ? "rgba(243, 237, 227, 0.72)" : "rgba(42, 36, 31, 0.72)";
      ctx.font = `400 ${navFont}px 'JetBrains Mono', monospace`;
      ctx.fillText(board.chrome.routes.join(" / "), boardPanel.x + 28, boardPanel.y + boardPanel.h - 36);
    }

    const boardViewportRect = boardViewport;
    const viewportRadius = boardViewportRect.x <= 0 && boardViewportRect.w >= W ? 0 : 18;
    if (viewportRadius > 0) {
      drawRoundedPanel(boardViewportRect.x, boardViewportRect.y, boardViewportRect.w, boardViewportRect.h, viewportRadius, boardPanelFill);
    } else {
      ctx.fillStyle = boardPanelFill;
      ctx.fillRect(boardViewportRect.x, boardViewportRect.y, boardViewportRect.w, boardViewportRect.h);
    }

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boardViewportRect.x, boardViewportRect.y, boardViewportRect.w, boardViewportRect.h, viewportRadius);
    ctx.clip();

    const boardInnerScale = Math.min(
      boardViewportRect.w / board.viewport.width,
      boardViewportRect.h / board.viewport.height,
    );
    boardScale = boardInnerScale;
    const boardOffsetX = boardViewportRect.x + (boardViewportRect.w - board.viewport.width * boardInnerScale) / 2 - boardViewX * boardInnerScale;
    const boardOffsetY = boardViewportRect.y + (boardViewportRect.h - board.viewport.height * boardInnerScale) / 2 - boardViewY * boardInnerScale;
    const visibleBoardX = -boardOffsetX / boardInnerScale;
    const visibleBoardY = -boardOffsetY / boardInnerScale;
    const visibleBoardW = boardViewportRect.w / boardInnerScale;
    const visibleBoardH = boardViewportRect.h / boardInnerScale;
    const bgPad = 180;

    ctx.translate(boardOffsetX, boardOffsetY);
    ctx.scale(boardInnerScale, boardInnerScale);
    ctx.fillStyle = p.screenBg;
    ctx.fillRect(
      visibleBoardX - bgPad,
      visibleBoardY - bgPad,
      visibleBoardW + bgPad * 2,
      visibleBoardH + bgPad * 2,
    );

    const boardGradA = ctx.createRadialGradient(340, 210, 0, 340, 210, 340);
    boardGradA.addColorStop(0, theme === "dark" ? "rgba(131, 157, 255, 0.11)" : "rgba(75, 107, 255, 0.08)");
    boardGradA.addColorStop(1, "rgba(75, 107, 255, 0)");
    ctx.fillStyle = boardGradA;
    ctx.fillRect(
      visibleBoardX - bgPad,
      visibleBoardY - bgPad,
      visibleBoardW + bgPad * 2,
      visibleBoardH + bgPad * 2,
    );

    const boardGradB = ctx.createRadialGradient(1250, 220, 0, 1250, 220, 360);
    boardGradB.addColorStop(0, theme === "dark" ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.1)");
    boardGradB.addColorStop(1, "rgba(148, 163, 184, 0)");
    ctx.fillStyle = boardGradB;
    ctx.fillRect(
      visibleBoardX - bgPad,
      visibleBoardY - bgPad,
      visibleBoardW + bgPad * 2,
      visibleBoardH + bgPad * 2,
    );

    ctx.save();
    ctx.strokeStyle = theme === "dark" ? "rgba(148, 163, 184, 0.055)" : "rgba(75, 107, 255, 0.055)";
    ctx.lineWidth = 1;
    const gridStartX = Math.floor((visibleBoardX - bgPad) / 44) * 44;
    const gridEndX = visibleBoardX + visibleBoardW + bgPad;
    const gridStartY = Math.floor((visibleBoardY - bgPad) / 44) * 44;
    const gridEndY = visibleBoardY + visibleBoardH + bgPad;
    for (let x = gridStartX; x < gridEndX; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, visibleBoardY - bgPad);
      ctx.lineTo(x, gridEndY);
      ctx.stroke();
    }
    for (let y = gridStartY; y < gridEndY; y += 44) {
      ctx.beginPath();
      ctx.moveTo(visibleBoardX - bgPad, y);
      ctx.lineTo(gridEndX, y);
      ctx.stroke();
    }
    ctx.restore();

    board.connectors.forEach((connector) => {
      drawBoardConnector(connector.points, connector.tone);
    });
    board.items.forEach((item) => {
      drawBoardItem(item);
    });
    ctx.restore();

    dragRegion = {
      x: boardViewportRect.x / W,
      y: boardViewportRect.y / H,
      w: boardViewportRect.w / W,
      h: boardViewportRect.h / H,
      radius: viewportRadius,
    };

    if (!isMobileBoard && !boardPanelIsFullBleed) {
      ctx.fillStyle = p.screenMuted;
      ctx.font = "500 16px 'JetBrains Mono', monospace";
      ctx.fillText(board.chrome.boardStatus, boardPanel.x + 24, boardPanel.y + boardPanel.h - 42);
      ctx.textAlign = "right";
      ctx.fillText(board.chrome.footer, boardPanel.x + boardPanel.w - 24, boardPanel.y + boardPanel.h - 42);
      ctx.textAlign = "left";
    }

    screenTexture.needsUpdate = true;
  };
  drawScreen();

  const screenCornerLocal = [
    new THREE.Vector3(-screenFaceW / 2, screenFaceH / 2, 0),
    new THREE.Vector3(screenFaceW / 2, screenFaceH / 2, 0),
    new THREE.Vector3(screenFaceW / 2, -screenFaceH / 2, 0),
    new THREE.Vector3(-screenFaceW / 2, -screenFaceH / 2, 0),
  ];
  const syncBoardHitarea = () => {
    if (!boardHitareaEl || !sceneEl) return;
    const canvasRect = canvasEl.getBoundingClientRect();
    const sceneRect = sceneEl.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const localCorner of screenCornerLocal) {
      const projected = screenFace.localToWorld(localCorner.clone()).project(camera);
      const px = ((projected.x + 1) / 2) * canvasRect.width + (canvasRect.left - sceneRect.left);
      const py = ((1 - projected.y) / 2) * canvasRect.height + (canvasRect.top - sceneRect.top);
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }

    const outerX = minX;
    const outerY = minY;
    const outerW = Math.max(0, maxX - minX);
    const outerH = Math.max(0, maxY - minY);
    const hitX = outerX + outerW * dragRegion.x;
    const hitY = outerY + outerH * dragRegion.y;
    const hitW = outerW * dragRegion.w;
    const hitH = outerH * dragRegion.h;
    const radiusScale = Math.min(outerW / screenCanvas.width, outerH / screenCanvas.height);
    const hitRadius = Math.max(12, dragRegion.radius * radiusScale);

    boardHitareaEl.style.position = "absolute";
    boardHitareaEl.style.left = `${hitX.toFixed(2)}px`;
    boardHitareaEl.style.top = `${hitY.toFixed(2)}px`;
    boardHitareaEl.style.width = `${hitW.toFixed(2)}px`;
    boardHitareaEl.style.height = `${hitH.toFixed(2)}px`;
    boardHitareaEl.style.borderRadius = `${hitRadius.toFixed(2)}px`;
  };

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
    syncBoardHitarea();
  };
  resize();
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

  let boardPointerId = -1;
  let boardDragStartX = 0;
  let boardDragStartY = 0;
  let boardDragOriginX = boardViewX;
  let boardDragOriginY = boardViewY;
  const canDragBoard = () => false;
  const finishBoardDrag = () => {
    boardDragging = false;
    boardPointerId = -1;
    boardHitareaEl?.classList.remove("is-dragging");
  };
  const boardPointerDown = (event: PointerEvent) => {
    if (!boardHitareaEl || !canDragBoard()) return;
    boardDragging = true;
    boardPointerId = event.pointerId;
    boardDragStartX = event.clientX;
    boardDragStartY = event.clientY;
    boardDragOriginX = boardViewX;
    boardDragOriginY = boardViewY;
    boardHitareaEl.classList.add("is-dragging");
    boardHitareaEl.setPointerCapture(event.pointerId);
    markInteracted();
  };
  const boardPointerMove = (event: PointerEvent) => {
    if (!boardDragging || event.pointerId !== boardPointerId) return;
    const dx = (event.clientX - boardDragStartX) / Math.max(boardScale, 0.0001);
    const dy = (event.clientY - boardDragStartY) / Math.max(boardScale, 0.0001);
    const next = clampBoardView(boardDragOriginX - dx, boardDragOriginY - dy);
    boardViewX = next.x;
    boardViewY = next.y;
    needScreenRedraw = true;
  };
  const boardStopDrag = (event: PointerEvent) => {
    if (!boardHitareaEl || event.pointerId !== boardPointerId) return;
    if (boardHitareaEl.hasPointerCapture(event.pointerId)) {
      boardHitareaEl.releasePointerCapture(event.pointerId);
    }
    finishBoardDrag();
  };
  const boardPointerLeave = () => {
    if (!boardDragging) boardHitareaEl?.classList.remove("is-dragging");
  };
  if (boardHitareaEl) {
    boardHitareaEl.addEventListener("pointerdown", boardPointerDown);
    boardHitareaEl.addEventListener("pointermove", boardPointerMove);
    boardHitareaEl.addEventListener("pointerup", boardStopDrag);
    boardHitareaEl.addEventListener("pointercancel", boardStopDrag);
    boardHitareaEl.addEventListener("pointerleave", boardPointerLeave);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: Interactive | null = null;
  let tweening = false;
  let canInteractScene = false;
  let canvasCapturesInput = false;
  let controlsConnected = false;
  let sceneCapturesInput = true;

  const syncCanvasInputMode = (interactive: boolean) => {
    if (canvasCapturesInput === interactive) return;
    canvasCapturesInput = interactive;
    canvasEl.style.pointerEvents = interactive ? "auto" : "none";
    canvasEl.style.touchAction = "pan-y";
    if (!interactive) {
      hovered = null;
      canvasEl.style.cursor = "default";
      tooltip?.classList.remove("is-visible");
    }
  };
  syncCanvasInputMode(false);

  const syncSceneInputMode = (interactive: boolean) => {
    if (!sceneEl || sceneCapturesInput === interactive) return;
    sceneCapturesInput = interactive;
    sceneEl.style.pointerEvents = interactive ? "auto" : "none";
    sceneEl.style.touchAction = "pan-y";
  };
  syncSceneInputMode(false);

  const syncControlsConnection = (interactive: boolean) => {
    if (controlsConnected === interactive) return;
    controlsConnected = interactive;
    if (interactive) {
      controls.connect(canvasEl);
    } else {
      controls.disconnect();
    }
  };
  syncControlsConnection(false);

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
    if (!canInteractScene || tweening) {
      hovered = null;
      canvasEl.style.cursor = "default";
      tooltip?.classList.remove("is-visible");
      return;
    }
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
    canvasEl.style.cursor = canInteractScene ? "grab" : "default";
    tooltip?.classList.remove("is-visible");
  });
  canvasEl.style.cursor = "default";

  let startX = 0;
  let startY = 0;

  const pointerDownHandler = (e: PointerEvent) => {
    startX = e.clientX;
    startY = e.clientY;
  };
  canvasEl.addEventListener("pointerdown", pointerDownHandler);

  const pointerUpHandler = (e: PointerEvent) => {
    if (!canInteractScene || tweening) return;

    // Ignore if this was a drag/rotation
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (dist > 5) return;

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
  canvasEl.addEventListener("pointerup", pointerUpHandler);

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

  const particleDummy = new THREE.Object3D();
  const SEASON_KEYS = ["spring", "summer", "autumn", "winter"] as const;

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

    applyHomeState(homeProgress);
    syncSceneOverlay();

    if (renderMode === "story") {
      if (controls.enabled) controls.enabled = false;
      syncSceneInputMode(false);
      syncCanvasInputMode(false);
      syncControlsConnection(false);
      canInteractScene = false;
      hovered = null;
      tooltip?.classList.remove("is-visible");
      if (needScreenRedraw) {
        needScreenRedraw = false;
        drawScreen({ overlay: true, texture: false });
      }
      rafId = requestAnimationFrame(animate);
      return;
    }

    const cameraPull = easeInOutSine(clamp((homeProgress - 0.7) / 0.27));
    const outsideReveal = easeInOutSine(clamp((homeProgress - 0.66) / 0.3));
    const roomReveal = easeInOutSine(clamp((homeProgress - 0.7) / 0.26));
    const sceneInteraction = easeInOutSine(clamp((homeProgress - 0.9) / 0.08));
    if (introBackdropMaterial) {
      const backdropFade = 1 - easeInOutSine(clamp((homeProgress - 0.56) / 0.18));
      introBackdropMaterial.opacity = backdropFade;
      introBackdropMaterial.visible = backdropFade > 0.01;
    }
    const boardShouldCapture = canDragBoard();
    if (boardHitareaEl) boardHitareaEl.style.pointerEvents = boardShouldCapture ? "auto" : "none";
    if (!boardShouldCapture && boardDragging) finishBoardDrag();
    const controlsShouldEnable = !tweening && homeProgress > 0.965;
    syncSceneOverlay();
    syncSceneInputMode(controlsShouldEnable);
    syncCanvasInputMode(controlsShouldEnable);
    syncControlsConnection(controlsShouldEnable);
    canInteractScene = controlsShouldEnable && sceneInteraction > 0.22;
    if (!canInteractScene) {
      hovered = null;
      tooltip?.classList.remove("is-visible");
    }

    if (controls.enabled !== controlsShouldEnable) {
      controls.enabled = controlsShouldEnable;
      if (!controlsShouldEnable) {
        canvasEl.style.cursor = "default";
      } else {
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
    sunLight.intensity = lerp(theme === "dark" ? 0.64 : 1.28, sunI, 0.5) * lerp(0.72, 1, outsideReveal);
    ambient.color.copy(neutralAmb).lerp(ambColor, 0.08);
    ambient.intensity = lerp(theme === "dark" ? 0.42 : 0.56, ambI, 0.35) * lerp(0.86, 1, outsideReveal);
    windowLight.color.copy(skyColor);
    windowLight.intensity = Math.max(0.24, sunI * 0.45) * lerp(0.55, 1, outsideReveal);
    const screenLightMax = useMobileCarrier
      ? theme === "dark"
        ? 0.018
        : 0.032
      : theme === "dark"
        ? 0.18
        : 0.3;
    screenLight.intensity = lerp(0, screenLightMax, easeInOutSine(clamp((homeProgress - 0.8) / 0.14)));
    mats.sky.color.copy(skyColor);
    mats.leaf.color.copy(plantColor);
    if (scene.fog) {
      const fog = scene.fog as THREE.Fog;
      fog.color
        .setHex(theme === "dark" ? 0x0f1828 : 0xf1e7d9)
        .lerp(fogColor, outsideReveal);
      fog.near = lerp(11.8, 7, outsideReveal);
      fog.far = lerp(26, 16, outsideReveal);
    }

    scene.background = new THREE.Color(THEMES[theme].screenBg).lerp(
      new THREE.Color(THEMES[theme].sceneBg),
      outsideReveal,
    );
    renderer.toneMappingExposure = lerp(1.28, 1.05, outsideReveal);
    const introRoomGhost = useMobileCarrier ? 0 : 1;
    mats.floor.opacity = lerp(0.08 * introRoomGhost, 1, outsideReveal);
    mats.wall.opacity = lerp(0.04 * introRoomGhost, 1, roomReveal);
    mats.ceiling.opacity = lerp(0.04 * introRoomGhost, 1, roomReveal);
    mats.deskTop.opacity = outsideReveal;
    mats.deskLeg.opacity = outsideReveal;
    mats.lampBody.opacity = roomReveal;
    mats.lampShade.opacity = roomReveal;
    mats.bulb.opacity = roomReveal;
    mats.laptopBody.opacity = outsideReveal;
    mats.laptopFrame.opacity = outsideReveal;
    mats.books[0].opacity = roomReveal;
    mats.books[1].opacity = roomReveal;
    mats.books[2].opacity = roomReveal;
    mats.tvBody.opacity = roomReveal;
    tvScreenMat.opacity = roomReveal;
    mats.pot.opacity = roomReveal;
    mats.leaf.opacity = roomReveal;
    for (const foliageMat of foliageMaterials) foliageMat.opacity = roomReveal;
    mats.personSkin.opacity = roomReveal;
    mats.personHair.opacity = roomReveal;
    mats.personCloth.opacity = roomReveal;
    mats.key.opacity = outsideReveal;
    mats.windowFrame.opacity = lerp(0.12 * introRoomGhost, 1, roomReveal);
    mats.windowSill.opacity = lerp(0.12 * introRoomGhost, 1, roomReveal);
    mats.sky.opacity = lerp(0.2 * introRoomGhost, 1, outsideReveal);

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
      particleSystems[key].material.opacity = op * lerp(0.12, 0.95, roomReveal);
    }

    // Screen cursor blink & redraw
    if (renderMode !== "room" && now - cursorLastToggle > 520) {
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
      const isH = canInteractScene && hovered === it;
      const bobY = isH ? 0.04 + Math.sin(now * 0.005) * 0.01 : 0;
      it.object.position.y += (it.basePos.y + bobY - it.object.position.y) * 0.18;
    }

    // Plant sway + seasonal growth
    foliageGroup.rotation.y = Math.sin(now * 0.0005) * 0.05;
    foliageGroup.rotation.x = Math.sin(now * 0.0008) * 0.02;
    branches.rotation.y = foliageGroup.rotation.y * 0.5;

    const s = (seasonOfYear * 4) % 4; // 0.0 to 4.0 continuum for seasons

    const smooth = (val: number) => easeInOutCubic(clamp(val, 0, 1));

    for (const item of foliageItems) {
      let scale = 0;

      if (item.type === "bud") {
        if (s > 3.5) scale = lerp(0.0, 1.0, smooth((s - 3.5) / 0.5));
        else if (s <= 0.4) scale = lerp(1.0, 0.0, smooth(s / 0.4));
        else scale = 0;
      } else if (item.type === "flower") {
        if (s <= 0.4) scale = lerp(0.0, 1.0, smooth(s / 0.4));
        else if (s <= 0.8) scale = lerp(1.0, 0.0, smooth((s - 0.4) / 0.4));
        else scale = 0;
      } else if (item.type === "leaf") {
        if (s <= 0.4) scale = 0;
        else if (s <= 0.8) scale = lerp(0.0, 1.0, smooth((s - 0.4) / 0.4));
        else if (s <= 2.5) scale = 1.0;
        else if (s <= 3.0) {
          const dropOffset = Math.abs(item.localPos.x * 10) % 0.3;
          const t = s - dropOffset;
          if (t < 2.5) scale = 1.0;
          else if (t < 3.0) scale = lerp(1.0, 0.0, smooth((t - 2.5) / 0.5));
          else scale = 0;
        } else scale = 0;

        if (scale > 0) {
          const c = item.mesh.material as THREE.MeshToonMaterial;
          if (s < 1.5) {
            c.color.copy(plantColor); // Global green plant color
          } else if (s < 2.5) {
            // Gradual color change from green -> yellow -> orange -> red (1.5 to 2.0)
            const tColor = clamp((s - 1.5) / 0.5, 0, 1);
            if (tColor < 0.33) c.color.copy(plantColor).lerp(new THREE.Color(0xd4b84a), tColor / 0.33);
            else if (tColor < 0.66) c.color.setHex(0xd4b84a).lerp(new THREE.Color(0xd4884a), (tColor - 0.33) / 0.33);
            else c.color.setHex(0xd4884a).lerp(new THREE.Color(0xb04444), (tColor - 0.66) / 0.34);
          } else {
            c.color.setHex(0xb04444); // Stay red while falling
          }
        }
      }

      item.mesh.visible = scale > 0.01;
      const v = Math.max(0.001, scale);
      item.mesh.scale.set(item.baseScale.x * v, item.baseScale.y * v, item.baseScale.z * v);
    }

    // Person idle motion
    if (useMobileCarrier) {
      head.rotation.x = Math.sin(now * 0.00035) * 0.012 + 0.08;
      head.rotation.y = 0;
      hair.rotation.x = head.rotation.x - 0.15;
      hair.rotation.y = 0;
      torso.rotation.y = 0;
      torso.rotation.x = -0.18;
    } else {
      head.rotation.x = Math.sin(now * 0.0004) * 0.02 + 0.1;
      head.rotation.y = Math.sin(now * 0.0003) * 0.03;
      hair.rotation.x = head.rotation.x - 0.15;
      hair.rotation.y = head.rotation.y;
      torso.rotation.y = Math.sin(now * 0.0003) * 0.015;
      torso.rotation.x = 0;
    }

    // Arm AI — desktop only. Mobile stays in a fixed phone-reading pose.
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
    if (!reduceMotion && !useMobileCarrier) {
      updateArmAI(leftAI, leftArm, -1);
      updateArmAI(rightAI, rightArm, 1);
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
    (sunDisc.material as THREE.MeshBasicMaterial).opacity = sunOp * lerp(0.28, 0.95, outsideReveal);
    (sunGlow.material as THREE.MeshBasicMaterial).opacity = sunOp * lerp(0.1, 0.35, outsideReveal);
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
    (cloudMat as THREE.MeshBasicMaterial).opacity = overcast * lerp(0.42, 1, outsideReveal);
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

    if (!controls.enabled) {
      camera.position.lerpVectors(screenCameraPos, roomCameraPos, cameraPull);
      controls.target.lerpVectors(screenCameraTarget, roomCameraTarget, cameraPull);
      camera.lookAt(controls.target);
    }
    camera.fov = lerp(screenFov, roomFov, cameraPull);
    camera.updateProjectionMatrix();
    syncBoardHitarea();

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
    ]).then(() => drawScreen()).catch(() => {});
  }

  drawScreen();
  rafId = requestAnimationFrame(animate);

  // ===== Cleanup =====
  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("scroll", syncScrollProgress);
    window.removeEventListener("resize", handleBreakpointResize);
    canvasEl.removeEventListener("pointermove", pointerMove);
    canvasEl.removeEventListener("pointerdown", pointerDownHandler);
    canvasEl.removeEventListener("pointerup", pointerUpHandler);
    boardHitareaEl?.removeEventListener("pointerdown", boardPointerDown);
    boardHitareaEl?.removeEventListener("pointermove", boardPointerMove);
    boardHitareaEl?.removeEventListener("pointerup", boardStopDrag);
    boardHitareaEl?.removeEventListener("pointercancel", boardStopDrag);
    boardHitareaEl?.removeEventListener("pointerleave", boardPointerLeave);
    canvasEl.removeEventListener("wheel", passWheelThrough, { capture: true });
    sceneEl?.removeEventListener("wheel", passWheelThrough, { capture: true });
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
    introBackdropTexture?.dispose();
    renderer.dispose();
    docEl.style.removeProperty("--home-progress");
    docEl.style.removeProperty("--scene-opacity");
    docEl.style.removeProperty("--story-opacity");
    docEl.style.removeProperty("--story-progress");
    docEl.style.removeProperty("--story-local");
    sceneEl?.style.removeProperty("--home-progress");
    boardHitareaEl?.style.removeProperty("position");
    boardHitareaEl?.style.removeProperty("left");
    boardHitareaEl?.style.removeProperty("top");
    boardHitareaEl?.style.removeProperty("width");
    boardHitareaEl?.style.removeProperty("height");
    boardHitareaEl?.style.removeProperty("border-radius");
    boardHitareaEl?.style.removeProperty("pointer-events");
    boardHitareaEl?.classList.remove("is-dragging");
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
  document.addEventListener("swup:willReplaceContent", cleanup, { once: true });

  return cleanup;
}
