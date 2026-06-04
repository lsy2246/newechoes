import React, { useEffect, useRef, useState } from "react";
import geoWasmModuleUrl from "@/assets/wasm/geo/geo_wasm.js?url";
import geoWasmBinaryUrl from "@/assets/wasm/geo/geo_wasm_bg.wasm?url";
import type {
  Group,
  Line,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Side,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

// 需要懒加载的模块
const loadControlsAndRenderers = () =>
  Promise.all([
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/renderers/CSS2DRenderer.js"),
  ]);

// WASM模块接口
interface GeoWasmModule {
  GeoProcessor: new () => {
    process_geojson: (
      worldData: string,
      chinaData: string,
      visitedPlaces: string,
      scale: number,
    ) => void;
    get_boundary_lines: () => any[];
    find_nearest_country: (
      x: number,
      y: number,
      z: number,
      radius: number,
    ) => string | null;
    free: () => void;
  };
  default?: (moduleOrPath?: string | URL | Request) => Promise<any>;
}

declare global {
  interface Window {
    __NEWECHOES_GEO_WASM_MODULE__?: Promise<GeoWasmModule>;
  }
}

interface WorldHeatmapProps {
  visitedPlaces: string[];
}

const EARTH_RADIUS = 2.0;
const CAMERA_FOV_DEGREES = 45;
const GLOBE_FRAMING_MARGIN = 1.04;
const WORLD_HEATMAP_LIGHT_COLORS = {
  earthBase: "#f1f7f8",
  earthOpacity: 0.72,
  unvisitedBorder: "#8fa0aa",
  visitedBorder: "#111827",
  chinaBorder: "#5f6f78",
  labelText: "#101010",
  hover: "#2563eb",
};
const WORLD_HEATMAP_DARK_COLORS = {
  earthBase: "#16191d",
  earthOpacity: 0.72,
  unvisitedBorder: "#343a42",
  visitedBorder: "#eef2f6",
  chinaBorder: "#7f8b98",
  labelText: "#f5f7fa",
  hover: "#93c5fd",
};

const getWorldHeatmapColors = (theme: "light" | "dark") =>
  theme === "dark" ? WORLD_HEATMAP_DARK_COLORS : WORLD_HEATMAP_LIGHT_COLORS;

const getBoundaryLineStyle = (
  regionName: string,
  isVisited: boolean,
  colors: typeof WORLD_HEATMAP_LIGHT_COLORS,
) => {
  const isChina = regionName === "中国" || regionName.startsWith("中国-");

  if (isVisited) {
    return {
      color: colors.visitedBorder,
      linewidth: 1.75,
      opacity: 0.98,
    };
  }

  if (isChina) {
    return {
      color: colors.chinaBorder,
      linewidth: 1.2,
      opacity: 0.82,
    };
  }

  return {
    color: colors.unvisitedBorder,
    linewidth: 0.95,
    opacity: 0.58,
  };
};

const getSafeGlobeMinDistance = (
  cameraFovDegrees: number,
  aspectRatio: number,
) => {
  const verticalHalfFov = (cameraFovDegrees * Math.PI) / 360;
  const horizontalHalfFov = Math.atan(
    Math.tan(verticalHalfFov) * Math.max(aspectRatio, 0.1),
  );
  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);

  return (EARTH_RADIUS / Math.sin(limitingHalfFov)) * GLOBE_FRAMING_MARGIN;
};

const loadGeoWasmModule = async () => {
  if (typeof window === "undefined") {
    throw new Error("Geo wasm 只能在浏览器环境加载");
  }

  if (!window.__NEWECHOES_GEO_WASM_MODULE__) {
    window.__NEWECHOES_GEO_WASM_MODULE__ = (async () => {
      const wasmModule = (await import(
        /* @vite-ignore */ geoWasmModuleUrl
      )) as GeoWasmModule;

      if (typeof wasmModule.default === "function") {
        await wasmModule.default(geoWasmBinaryUrl);
      }

      return wasmModule;
    })();
  }

  return window.__NEWECHOES_GEO_WASM_MODULE__;
};

const WorldHeatmap: React.FC<WorldHeatmapProps> = ({ visitedPlaces }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof document !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark")
      ? "dark"
      : "light",
  );

  // 用于存储WASM模块和处理器实例
  const [wasmModule, setWasmModule] = useState<GeoWasmModule | null>(null);
  const [geoProcessor, setGeoProcessor] = useState<any>(null);
  const [wasmError, setWasmError] = useState<string | null>(null);
  // 添加状态标记WASM是否已准备好
  const [wasmReady, setWasmReady] = useState(false);

  // 添加地图数据状态
  const [mapData, setMapData] = useState<{
    worldData: any | null;
    chinaData: any | null;
  }>({ worldData: null, chinaData: null });

  // 添加地图加载状态
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // 修改场景引用类型以适应新的导入方式
  const sceneRef = useRef<{
    scene: Scene;
    camera: PerspectiveCamera;
    renderer: WebGLRenderer;
    labelRenderer: any; // 后面会动态设置具体类型
    controls: any; // 后面会动态设置具体类型
    earth: Mesh;
    countries: Map<string, Group>;
    raycaster: Raycaster;
    mouse: Vector2;
    animationId: number | null;
    lastCameraPosition: Vector3 | null;
    lastMouseEvent: MouseEvent | null;
    lastClickedCountry: string | null;
    lastMouseX: number | null;
    lastMouseY: number | null;
    lastHoverTime: number | null;
    countryToLines: Map<string, Line[]>;
    lastHighlightedCountry: string | null;
  } | null>(null);

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "dark" : "light");
    };

    // 创建 MutationObserver 来监听 class 和 data-theme 属性的变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          (mutation.attributeName === "class" &&
            mutation.target === document.documentElement) ||
          (mutation.attributeName === "data-theme" &&
            mutation.target === document.documentElement)
        ) {
          handleThemeChange();
        }
      });
    });

    // 开始观察
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    // 初始检查
    handleThemeChange();

    // 清理
    return () => {
      observer.disconnect();
    };
  }, []);

  // 从公共目录加载地图数据
  useEffect(() => {
    // 创建 AbortController 用于在组件卸载时取消请求
    const controller = new AbortController();
    const signal = controller.signal;
    let timeoutId: number | null = null;

    const loadMapData = async () => {
      try {
        setMapLoading(true);
        setMapError(null);

        // 添加请求超时处理
        timeoutId = window.setTimeout(() => controller.abort(), 30000); // 30秒超时

        // 从公共目录加载地图数据，并使用 signal 和缓存控制
        const [worldDataResponse, chinaDataResponse] = await Promise.all([
          fetch("/maps/world.zh.json", {
            signal,
            headers: { "Cache-Control": "no-cache" },
          }),
          fetch("/maps/china.json", {
            signal,
            headers: { "Cache-Control": "no-cache" },
          }),
        ]);

        if (!worldDataResponse.ok || !chinaDataResponse.ok) {
          throw new Error("无法获取地图数据");
        }

        const worldData = await worldDataResponse.json();
        const chinaData = await chinaDataResponse.json();

        setMapData({
          worldData,
          chinaData,
        });

        setMapLoading(false);
      } catch (err: any) {
        // 只有当请求不是被我们自己中断时才设置错误状态
        if (err.name !== "AbortError") {
          console.error("加载地图数据失败:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          setMapError(`地图数据加载失败: ${errorMessage}`);
        }
        setMapLoading(false);
      } finally {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };

    loadMapData();

    // 清理函数：组件卸载时中断请求
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      controller.abort();
    };
  }, []);

  // 加载WASM模块
  useEffect(() => {
    const loadWasmModule = async () => {
      try {
        const wasm = await loadGeoWasmModule();
        setWasmModule(wasm);
        setWasmError(null);
      } catch (err: any) {
        console.error("加载WASM模块失败:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setWasmError(`WASM模块初始化失败: ${errorMessage}`);
      }
    };

    loadWasmModule();
  }, []);

  // 初始化WASM数据
  useEffect(() => {
    if (!wasmModule || !mapData.worldData || !mapData.chinaData) return;

    let geoProcessorInstance: InstanceType<GeoWasmModule["GeoProcessor"]> | null = null;

    try {
      // 使用JS胶水层方式初始化WASM
      geoProcessorInstance = new wasmModule.GeoProcessor();
      geoProcessorInstance.process_geojson(
        JSON.stringify(mapData.worldData),
        JSON.stringify(mapData.chinaData),
        JSON.stringify(visitedPlaces),
        2.01,
      );

      setGeoProcessor(geoProcessorInstance);
      setWasmReady(true);
    } catch (error: any) {
      console.error("WASM数据处理失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      geoProcessorInstance?.free();
      setGeoProcessor(null);
      setWasmReady(false);
      setWasmError(`WASM数据处理失败: ${errorMessage}`);
    }

    return () => {
      geoProcessorInstance?.free();
    };
  }, [wasmModule, visitedPlaces, mapData.worldData, mapData.chinaData]);

  // 添加对页面转换事件的监听
  useEffect(() => {
    // 统一存储所有事件监听器
    const allListeners: Array<{
      element: EventTarget;
      eventType: string;
      handler: EventListener;
      options?: boolean | AddEventListenerOptions;
    }> = [];

    // 添加事件监听器并记录
    const addListener = (
      element: EventTarget,
      eventType: string,
      handler: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (!element) {
        console.warn("[WorldHeatmap] 尝试为不存在的元素添加事件");
        return null;
      }

      element.addEventListener(eventType, handler, options);
      allListeners.push({ element, eventType, handler, options });
      return handler;
    };

    // 监听页面转换事件的处理函数
    const handlePageTransition = () => {
      // 1. 清理所有注册的事件监听器
      allListeners.forEach(({ element, eventType, handler, options }) => {
        try {
          element.removeEventListener(eventType, handler, options);
        } catch (err) {
          console.error(`[WorldHeatmap] 清理事件 ${eventType} 出错:`, err);
        }
      });

      // 2. 清理Three.js资源
      if (sceneRef.current) {
        // 取消动画帧
        if (sceneRef.current.animationId !== null) {
          cancelAnimationFrame(sceneRef.current.animationId);
          sceneRef.current.animationId = null;
        }

        try {
          // 优先清理Three.js对象
          if (sceneRef.current.scene) {
            sceneRef.current.scene.clear();
          }

          // 清理控制器
          if (sceneRef.current.controls) {
            sceneRef.current.controls.dispose();
          }

          // 移除标签渲染器
          if (sceneRef.current.labelRenderer) {
            if (sceneRef.current.labelRenderer.domElement.parentNode) {
              sceneRef.current.labelRenderer.domElement.remove();
            }
          }

          // 最后处理WebGL渲染器
          sceneRef.current.renderer.dispose();
          sceneRef.current.renderer.forceContextLoss();
          if (sceneRef.current.renderer.domElement.parentNode) {
            sceneRef.current.renderer.domElement.remove();
          }
        } catch (err) {
          console.error("[WorldHeatmap] 清理Three.js资源错误:", err);
        }
      }

      // 强制将场景引用置为null，避免后续访问
      sceneRef.current = null;
    };

    // 添加页面转换事件监听
    addListener(document, "page-transition", handlePageTransition);
    addListener(document, "astro:before-swap", handlePageTransition);
    addListener(window, "beforeunload", handlePageTransition);

    // 清理函数 - 这个通常不会执行，因为页面转换时组件会被销毁
    // 但为了完整性，我们仍然添加此清理逻辑
    return () => {
      allListeners.forEach(({ element, eventType, handler, options }) => {
        try {
          element.removeEventListener(eventType, handler, options);
        } catch (err) {
          console.error(`[WorldHeatmap] 清理事件 ${eventType} 出错:`, err);
        }
      });
    };
  }, []);

  // 主要Three.js初始化和清理
  useEffect(() => {
    if (!containerRef.current || !wasmModule || !wasmReady || !geoProcessor) {
      return;
    }

    // 清理之前的场景
    if (sceneRef.current) {
      if (sceneRef.current.animationId !== null) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      sceneRef.current.renderer.dispose();
      sceneRef.current.labelRenderer.domElement.remove();
      sceneRef.current.scene.clear();
      containerRef.current.innerHTML = "";
    }

    // 创建一个引用，用于清理函数
    let mounted = true;
    let cleanupFunctions: Array<() => void> = [];

    // 动态加载Three.js控制器和渲染器
    const initThreeScene = async () => {
      try {
        const three = await import("three");
        const {
          Scene: ThreeScene,
          PerspectiveCamera: ThreePerspectiveCamera,
          WebGLRenderer: ThreeWebGLRenderer,
          SphereGeometry: ThreeSphereGeometry,
          MeshBasicMaterial: ThreeMeshBasicMaterial,
          Mesh: ThreeMesh,
          AmbientLight: ThreeAmbientLight,
          DirectionalLight: ThreeDirectionalLight,
          Vector2: ThreeVector2,
          Vector3: ThreeVector3,
          Raycaster: ThreeRaycaster,
          Group: ThreeGroup,
          BufferGeometry: ThreeBufferGeometry,
          LineBasicMaterial: ThreeLineBasicMaterial,
          Line: ThreeLine,
          FrontSide: ThreeFrontSide,
        } = three;

        // 加载OrbitControls和CSS2DRenderer
        const [{ OrbitControls }, { CSS2DRenderer }] =
          await loadControlsAndRenderers();

        // 如果组件已卸载，退出初始化
        if (!mounted || !containerRef.current) return;

        // Keep the globe aligned with the site's editorial system:
        // visited regions are persistent ink linework, hover is a clear site-blue focus color.
        const colors = getWorldHeatmapColors(theme);

        // 创建场景
        const scene = new ThreeScene();
        scene.background = null;

        // 创建材质的辅助函数
        const createMaterial = (
          color: string,
          side: Side = ThreeFrontSide,
          opacity: number = 1.0,
        ) => {
          return new ThreeMeshBasicMaterial({
            color: color,
            side: side,
            transparent: true,
            opacity: opacity,
          });
        };

        // 创建地球几何体
        const earthGeometry = new ThreeSphereGeometry(EARTH_RADIUS, 64, 64);
        const earthMaterial = createMaterial(
          colors.earthBase,
          ThreeFrontSide,
          colors.earthOpacity,
        );
        const earth = new ThreeMesh(earthGeometry, earthMaterial);
        earth.renderOrder = 1;
        scene.add(earth);

        // 添加光源
        const ambientLight = new ThreeAmbientLight(
          0xffffff,
          theme === "dark" ? 0.7 : 0.85,
        );
        scene.add(ambientLight);

        const directionalLight = new ThreeDirectionalLight(
          theme === "dark" ? 0xeeeeff : 0xffffff,
          theme === "dark" ? 0.6 : 0.65,
        );
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);

        // 创建相机
        const camera = new ThreePerspectiveCamera(
          CAMERA_FOV_DEGREES,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000,
        );
        camera.position.z = 8;

        // 创建渲染器
        const renderer = new ThreeWebGLRenderer({
          antialias: true,
          alpha: true,
          logarithmicDepthBuffer: true,
          preserveDrawingBuffer: true,
          precision: "highp",
        });
        renderer.sortObjects = true;
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
        containerRef.current.appendChild(renderer.domElement);

        // 创建CSS2D渲染器用于标签
        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
        labelRenderer.domElement.style.position = "absolute";
        labelRenderer.domElement.style.top = "0";
        labelRenderer.domElement.style.pointerEvents = "none";
        containerRef.current.appendChild(labelRenderer.domElement);

        // 添加控制器
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.rotateSpeed = 0.2;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;
        controls.minDistance = getSafeGlobeMinDistance(
          camera.fov,
          camera.aspect,
        );
        controls.maxDistance = Math.max(15, controls.minDistance + 1);

        controls.minPolarAngle = Math.PI * 0.1;
        controls.maxPolarAngle = Math.PI * 0.9;

        const handleControlsChange = () => {
          if (sceneRef.current) {
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
          }
        };
        controls.addEventListener("change", handleControlsChange);
        cleanupFunctions.push(() => {
          controls.removeEventListener("change", handleControlsChange);
        });

        const countryToLines = new Map<string, Line[]>();
        let lastHighlightedCountry: string | null = null;

        // 创建国家边界组
        const countryGroup = new ThreeGroup();
        earth.add(countryGroup);

        // 创建国家边界
        const countries = new Map<string, Group>();

        // 从WASM获取边界线数据
        const boundaryLines = geoProcessor.get_boundary_lines();

        // 处理边界线数据
        if (boundaryLines) {
          // 遍历所有边界线
          for (const boundaryLine of boundaryLines) {
            const { points, region_name, is_visited } = boundaryLine;

            // 创建区域组
            const regionObject = new ThreeGroup();
            regionObject.userData = {
              name: region_name,
              isVisited: is_visited,
            };

            // 转换点数组为Vector3数组
            const threePoints = points.map(
              (p: { x: number; y: number; z: number }) =>
                new ThreeVector3(p.x, p.y, p.z),
            );

            // 创建边界线
            if (threePoints.length > 1) {
              const lineGeometry = new ThreeBufferGeometry().setFromPoints(
                threePoints,
              );

              const lineStyle = getBoundaryLineStyle(
                region_name,
                is_visited,
                colors,
              );

              const lineMaterial = new ThreeLineBasicMaterial({
                color: lineStyle.color,
                linewidth: lineStyle.linewidth,
                transparent: true,
                opacity: lineStyle.opacity,
              });

              const line = new ThreeLine(lineGeometry, lineMaterial);
              line.userData = {
                name: region_name,
                isVisited: is_visited,
                originalColor: lineStyle.color,
                originalOpacity: lineMaterial.opacity,
                hoverColor: colors.hover,
              };

              // 设置渲染顺序
              line.renderOrder = is_visited ? 3 : 2;
              regionObject.add(line);

              const lines = countryToLines.get(region_name);
              if (lines) {
                lines.push(line);
              } else {
                countryToLines.set(region_name, [line]);
              }
            }

            // 添加区域对象到国家组
            countryGroup.add(regionObject);
            countries.set(region_name, regionObject);
          }
        }

        // 将视图旋转到中国位置
        const positionCameraToFaceChina = () => {
          // 检查是否为小屏幕
          const isSmallScreen =
            containerRef.current && containerRef.current.clientWidth < 640;

          // 根据屏幕大小设置不同的相机初始位置
          let fixedPosition;
          if (isSmallScreen) {
            // 小屏幕显示距离更远，以便看到更多地球
            fixedPosition = new ThreeVector3(-2.1, 3.41, -8.0);
          } else {
            // 大屏幕使用原来的位置
            fixedPosition = new ThreeVector3(-2.1, 3.41, -6.5);
          }

          // 应用位置
          camera.position.copy(fixedPosition);
          camera.lookAt(0, 0, 0);
          controls.update();

          // 确保自动旋转始终开启
          controls.autoRotate = true;

          // 渲染
          renderer.render(scene, camera);
          labelRenderer.render(scene, camera);
        };

        // 应用初始相机位置
        positionCameraToFaceChina();

        // 创建射线投射器用于鼠标交互
        const raycaster = new ThreeRaycaster();
        const mouse = new ThreeVector2();
        const fallbackSphereGeometry = new ThreeSphereGeometry(2.01, 32, 32);
        const fallbackSphereMesh = new ThreeMesh(fallbackSphereGeometry);

        // 添加节流函数，限制鼠标移动事件的触发频率
        const throttle = (func: Function, limit: number) => {
          let inThrottle: boolean = false;
          let lastFunc: number | null = null;
          let lastRan: number | null = null;

          return function (this: any, ...args: any[]) {
            if (!inThrottle) {
              func.apply(this, args);
              inThrottle = true;
              lastRan = Date.now();
              setTimeout(() => (inThrottle = false), limit);
            } else {
              // 取消之前的延迟调用
              if (lastFunc) clearTimeout(lastFunc);

              // 如果距离上次执行已经接近阈值，确保我们能及时处理下一个事件
              const sinceLastRan = Date.now() - (lastRan || 0);
              if (sinceLastRan >= limit * 0.8) {
                lastFunc = window.setTimeout(
                  () => {
                    if (lastRan && Date.now() - lastRan >= limit) {
                      func.apply(this, args);
                      lastRan = Date.now();
                    }
                  },
                  Math.max(limit - sinceLastRan, 0),
                );
              }
            }
          };
        };

        const resetCountryHighlight = (countryName: string | null) => {
          if (!countryName) return;
          const lines = countryToLines.get(countryName);
          if (!lines) return;
          for (const line of lines) {
            if (line.material instanceof ThreeLineBasicMaterial) {
              line.material.color.set(line.userData.originalColor);
              line.material.opacity = line.userData.originalOpacity;
            }
          }
        };

        const applyCountryHighlight = (countryName: string | null) => {
          if (!countryName) return;
          const lines = countryToLines.get(countryName);
          if (!lines) return;
          for (const line of lines) {
            if (line.material instanceof ThreeLineBasicMaterial) {
              line.material.color.set(line.userData.hoverColor);
              line.material.opacity = 1;
            }
          }
        };

        const updateHighlight = (countryName: string | null) => {
          if (countryName === lastHighlightedCountry) return;
          resetCountryHighlight(lastHighlightedCountry);
          applyCountryHighlight(countryName);
          lastHighlightedCountry = countryName;
          if (sceneRef.current) {
            sceneRef.current.lastHighlightedCountry = countryName;
          }
        };

        // 简化的鼠标移动事件处理函数
        const onMouseMove = throttle((event: MouseEvent) => {
          if (!containerRef.current || !sceneRef.current || !geoProcessor) {
            return;
          }

          // 获取鼠标在球面上的点
          const result = getPointOnSphere(
            event.clientX,
            event.clientY,
            camera,
            2.01,
          );

          // 如果找到点和对应的国家/地区
          if (result && result.countryName) {
            updateHighlight(result.countryName);

            // 更新悬停国家
            if (result.countryName !== hoveredCountry) {
              setHoveredCountry(result.countryName);
            }

            // 不禁用自动旋转，保持地球旋转
          } else {
            // 如果没有找到国家/地区，清除悬停状态
            updateHighlight(null);
            if (hoveredCountry) {
              setHoveredCountry(null);
            }
          }

          // 保存鼠标事件和位置
          sceneRef.current.lastMouseEvent = event;
          sceneRef.current.lastMouseX = event.clientX;
          sceneRef.current.lastMouseY = event.clientY;
          sceneRef.current.lastHoverTime = Date.now();
        }, 100);

        // 清除选择的函数
        const clearSelection = () => {
          updateHighlight(null);

          setHoveredCountry(null);
          if (sceneRef.current) {
            sceneRef.current.lastClickedCountry = null;
            sceneRef.current.lastHoverTime = null;
          }
          // 确保自动旋转始终开启
          controls.autoRotate = true;
        };

        // 简化的鼠标点击事件处理函数
        const onClick = (event: MouseEvent) => {
          if (!containerRef.current || !sceneRef.current || !geoProcessor) {
            return;
          }

          // 获取鼠标在球面上的点
          const result = getPointOnSphere(
            event.clientX,
            event.clientY,
            camera,
            2.01,
          );

          // 如果找到点和对应的国家/地区
          if (result && result.countryName) {
            updateHighlight(result.countryName);

            // 更新选中国家
            setHoveredCountry(result.countryName);
            sceneRef.current.lastClickedCountry = result.countryName;
            // 不禁用自动旋转，保持地球始终旋转
          } else {
            // 如果没有找到国家/地区，清除选择
            clearSelection();
          }

          // 更新最后的鼠标位置和点击时间
          sceneRef.current.lastMouseX = event.clientX;
          sceneRef.current.lastMouseY = event.clientY;
          sceneRef.current.lastHoverTime = Date.now();
        };

        // 鼠标双击事件处理
        const onDoubleClick = (event: MouseEvent) => {
          clearSelection();
          event.preventDefault();
          event.stopPropagation();
        };

        // 添加事件监听器
        containerRef.current.addEventListener("mousemove", onMouseMove, {
          passive: true,
        });
        containerRef.current.addEventListener("click", onClick, {
          passive: false,
        });
        containerRef.current.addEventListener("dblclick", onDoubleClick, {
          passive: false,
        });

        // 保存清理函数
        cleanupFunctions.push(() => {
          if (containerRef.current) {
            containerRef.current.removeEventListener("mousemove", onMouseMove);
            containerRef.current.removeEventListener("click", onClick);
            containerRef.current.removeEventListener("dblclick", onDoubleClick);
          }
        });

        // 获取球面上的点对应的国家/地区
        const getPointOnSphere = (
          mouseX: number,
          mouseY: number,
          camera: PerspectiveCamera,
          radius: number,
        ): { point: Vector3; countryName: string | null } | null => {
          // 计算鼠标在画布中的归一化坐标
          const rect = containerRef.current!.getBoundingClientRect();
          const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
          const y = -((mouseY - rect.top) / rect.height) * 2 + 1;

          mouse.set(x, y);
          raycaster.setFromCamera(mouse, camera);

          // 检测射线与实际地球模型的相交
          const earthIntersects = raycaster.intersectObject(earth, false);
          if (earthIntersects.length > 0) {
            const point = earthIntersects[0].point;

            // 使用WASM查找最近的国家/地区
            const countryName = geoProcessor.find_nearest_country(
              point.x,
              point.y,
              point.z,
              radius,
            );

            return { point, countryName };
          }

          const scale = radius / 2.01;
          if (scale !== 1) {
            fallbackSphereMesh.scale.set(scale, scale, scale);
          }

          const intersects = raycaster.intersectObject(
            fallbackSphereMesh,
            false,
          );
          if (intersects.length > 0) {
            const point = intersects[0].point;

            // 使用WASM查找最近的国家/地区
            const countryName = geoProcessor.find_nearest_country(
              point.x,
              point.y,
              point.z,
              radius,
            );

            return { point, countryName };
          }

          return null;
        };

        // Standard RAF keeps auto-rotation smooth while the page is scrolling.
        const animate = () => {
          if (!sceneRef.current) return;

          // 如果相机没有变化，可以降低渲染频率
          if (
            sceneRef.current.controls &&
            !sceneRef.current.controls.autoRotate &&
            sceneRef.current.lastCameraPosition &&
            sceneRef.current.camera.position.distanceTo(
              sceneRef.current.lastCameraPosition,
            ) < 0.001
          ) {
            // 相机位置没有明显变化，降低渲染频率
            sceneRef.current.animationId = requestAnimationFrame(animate);
            return;
          }

          // 保存当前相机位置
          sceneRef.current.lastCameraPosition =
            sceneRef.current.camera.position.clone();

          // 更新控制器
          controls.update();

          // 渲染
          renderer.render(scene, camera);
          labelRenderer.render(scene, camera);

          sceneRef.current.animationId = requestAnimationFrame(animate);
        };

        // 处理窗口大小变化
        const handleResize = () => {
          if (!containerRef.current || !sceneRef.current) return;

          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;

          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          controls.minDistance = getSafeGlobeMinDistance(
            camera.fov,
            camera.aspect,
          );
          controls.maxDistance = Math.max(15, controls.minDistance + 1);
          if (camera.position.length() < controls.minDistance) {
            camera.position.setLength(controls.minDistance);
            controls.update();
          }
          renderer.setSize(width, height);
          labelRenderer.setSize(width, height);

          // 立即渲染一次
          renderer.render(scene, camera);
          labelRenderer.render(scene, camera);
        };

        window.addEventListener("resize", handleResize, { passive: true });
        cleanupFunctions.push(() => {
          window.removeEventListener("resize", handleResize);
        });

        // 保存场景引用
        sceneRef.current = {
          scene,
          camera,
          renderer,
          labelRenderer,
          controls,
          earth,
          countries,
          raycaster,
          mouse,
          animationId: null,
          lastCameraPosition: null,
          lastMouseEvent: null,
          lastClickedCountry: null,
          lastMouseX: null,
          lastMouseY: null,
          lastHoverTime: null,
          countryToLines,
          lastHighlightedCountry,
        };

        // 开始动画
        sceneRef.current.animationId = requestAnimationFrame(animate);
      } catch (error: any) {
        console.error("Three.js初始化失败:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setMapError(`3D地图初始化失败: ${errorMessage}`);
      }
    };

    // 执行初始化
    initThreeScene();

    // 清理函数
    return () => {
      mounted = false;

      // 执行所有保存的清理函数
      cleanupFunctions.forEach((fn, index) => {
        try {
          fn();
        } catch (err) {
          console.error(`[WorldHeatmap] 清理函数执行错误:`, err);
        }
      });

      // 清理资源和事件监听器 - 改进错误处理
      if (sceneRef.current) {
        // 1. 取消动画帧 - 单独错误处理
        try {
          if (sceneRef.current.animationId !== null) {
            cancelAnimationFrame(sceneRef.current.animationId);
            sceneRef.current.animationId = null;
          }
        } catch (err) {
          console.error("[WorldHeatmap] 清理动画帧错误:", err);
        }

        // 2. 清理渲染器 - 单独错误处理
        try {
          if (sceneRef.current.renderer) {
            sceneRef.current.renderer.dispose();
            sceneRef.current.renderer.forceContextLoss();
            if (
              sceneRef.current.renderer.domElement &&
              sceneRef.current.renderer.domElement.parentNode
            ) {
              sceneRef.current.renderer.domElement.remove();
            }
          }
        } catch (err) {
          console.error("[WorldHeatmap] 清理渲染器错误:", err);
        }

        // 3. 移除标签渲染器 - 单独错误处理
        try {
          if (sceneRef.current.labelRenderer) {
            if (
              sceneRef.current.labelRenderer.domElement &&
              sceneRef.current.labelRenderer.domElement.parentNode
            ) {
              sceneRef.current.labelRenderer.domElement.remove();
            }
          }
        } catch (err) {
          console.error("[WorldHeatmap] 清理标签渲染器错误:", err);
        }

        // 4. 释放控制器 - 单独错误处理
        try {
          if (sceneRef.current.controls) {
            sceneRef.current.controls.dispose();
          }
        } catch (err) {
          console.error("[WorldHeatmap] 清理控制器错误:", err);
        }

        // 5. 清理场景 - 单独错误处理
        try {
          if (sceneRef.current.scene) {
            sceneRef.current.scene.clear();
          }
        } catch (err) {
          console.error("[WorldHeatmap] 清理场景错误:", err);
        }

        // 6. 最后将引用置为null
        try {
          sceneRef.current = null;
        } catch (err) {
          console.error("[WorldHeatmap] 重置场景引用错误:", err);
        }
      }
    };
  }, [visitedPlaces, wasmReady, geoProcessor]);

  useEffect(() => {
    const applyThemeToScene = () => {
      if (!sceneRef.current) return;

      const colors = getWorldHeatmapColors(theme);
      const earthMaterial = sceneRef.current.earth.material as any;
      earthMaterial.color?.set(colors.earthBase);
      earthMaterial.opacity = colors.earthOpacity;

      for (const [regionName, lines] of sceneRef.current.countryToLines) {
        const isHighlighted =
          sceneRef.current.lastHighlightedCountry === regionName;

        for (const line of lines) {
          const lineMaterial = line.material as any;
          const lineStyle = getBoundaryLineStyle(
            regionName,
            Boolean(line.userData.isVisited),
            colors,
          );

          line.userData.originalColor = lineStyle.color;
          line.userData.originalOpacity = lineStyle.opacity;
          line.userData.hoverColor = colors.hover;
          lineMaterial.color?.set(isHighlighted ? colors.hover : lineStyle.color);
          lineMaterial.opacity = isHighlighted ? 1 : lineStyle.opacity;
        }
      }

      sceneRef.current.renderer.render(
        sceneRef.current.scene,
        sceneRef.current.camera,
      );
      sceneRef.current.labelRenderer.render(
        sceneRef.current.scene,
        sceneRef.current.camera,
      );
    };

    applyThemeToScene();
  }, [theme]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-100 sm:h-112.5 md:h-125 lg:h-150 xl:h-175"
      />

      {(wasmError || mapError) && (
        <div className="world-heatmap-state-overlay absolute inset-0 flex items-center justify-center z-20">
          <div className="world-heatmap-state-card world-heatmap-state-card-error p-4 max-w-md">
            <h3 className="font-bold text-lg mb-2">
              地图加载错误
            </h3>
            <p className="text-sm">
              {wasmError || mapError}
            </p>
            <button
              className="world-heatmap-state-action mt-3 px-4 py-2 transition-colors"
              onClick={() => window.location.reload()}
            >
              重新加载
            </button>
          </div>
        </div>
      )}

      {mapLoading && !mapError && (
        <div className="world-heatmap-state-overlay absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="world-heatmap-loader inline-block w-12 h-12 animate-spin"></div>
            <p className="mt-3">
              加载地图数据中...
            </p>
          </div>
        </div>
      )}

      {hoveredCountry && (
        <div className="absolute bottom-5 left-0 right-0 text-center z-10">
          <div className="world-heatmap-hover-card inline-block px-6 py-3">
            <p className="font-medium text-lg flex items-center justify-center gap-2">
              {hoveredCountry}
              {hoveredCountry && visitedPlaces.includes(hoveredCountry) ? (
                <span
                  className="world-heatmap-status-pill inline-flex items-center justify-center px-2.5 py-1 text-sm ml-1.5 whitespace-nowrap"
                  data-visited="true"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  已去过
                </span>
              ) : (
                <span
                  className="world-heatmap-status-pill inline-flex items-center justify-center px-2.5 py-1 text-sm ml-1.5 whitespace-nowrap"
                  data-visited="false"
                >
                  尚未去过
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldHeatmap;
