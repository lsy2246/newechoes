import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

// WASM模块接口
interface GeoWasmModule {
  GeoProcessor: new () => {
    process_geojson: (worldData: string, chinaData: string, visitedPlaces: string, scale: number) => void;
    get_boundary_lines: () => any[];
    find_nearest_country: (x: number, y: number, z: number, radius: number) => string | null;
  };
  default?: () => Promise<any>;
}

interface WorldHeatmapProps {
  visitedPlaces: string[];
}

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

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    controls: OrbitControls;
    earth: THREE.Mesh;
    countries: Map<string, THREE.Object3D>;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    animationId: number | null;
    lastCameraPosition: THREE.Vector3 | null;
    lastMouseEvent: MouseEvent | null;
    lastClickedCountry: string | null;
    lastMouseX: number | null;
    lastMouseY: number | null;
    lastHoverTime: number | null;
    lineToCountryMap: Map<THREE.Line, string>;
    allLineObjects: THREE.Line[];
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

  // 动态加载地图数据
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setMapLoading(true);
        setMapError(null);
        
        // 并行加载两个地图数据
        const [worldDataModule, chinaDataModule] = await Promise.all([
          import("@/assets/map/world.zh.json"),
          import("@/assets/map/china.json")
        ]);
        
        setMapData({
          worldData: worldDataModule.default || worldDataModule,
          chinaData: chinaDataModule.default || chinaDataModule
        });
        
        setMapLoading(false);
      } catch (err) {
        console.error("加载地图数据失败:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setMapError(`地图数据加载失败: ${errorMessage}`);
        setMapLoading(false);
      }
    };
    
    loadMapData();
  }, []);

  // 加载WASM模块
  useEffect(() => {
    const loadWasmModule = async () => {
      try {
        // 改为使用JS胶水文件方式加载WASM
        const wasm = await import(
          "@/assets/wasm/geo/geo_wasm.js"
        );
        if (typeof wasm.default === "function") {
          await wasm.default();
        }
        setWasmModule(wasm as unknown as GeoWasmModule);
        setWasmError(null);
      } catch (err) {
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
    
    try {
      // 使用JS胶水层方式初始化WASM
      const geoProcessorInstance = new wasmModule.GeoProcessor();
      geoProcessorInstance.process_geojson(
        JSON.stringify(mapData.worldData),
        JSON.stringify(mapData.chinaData),
        JSON.stringify(visitedPlaces),
        2.01
      );
      
      setGeoProcessor(geoProcessorInstance);
      setWasmReady(true);
    } catch (error) {
      console.error("WASM数据处理失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setWasmError(`WASM数据处理失败: ${errorMessage}`);
    }
  }, [wasmModule, visitedPlaces, mapData.worldData, mapData.chinaData]);

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
    
    // 检查当前是否为暗色模式
    const isDarkMode =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";

    // 根据当前模式设置颜色
    const getColors = () => {
      return {
        earthBase: isDarkMode ? "#111827" : "#2a4d69", // 深色模式保持深色，浅色模式改为更柔和的蓝色
        visited: isDarkMode ? "#065f46" : "#34d399", // 访问过的颜色更鲜明
        border: isDarkMode ? "#6b7280" : "#e0e0e0", // 边界颜色调整为更亮的浅灰色
        visitedBorder: isDarkMode ? "#10b981" : "#0d9488", // 访问过的边界颜色
        chinaBorder: isDarkMode ? "#f87171" : "#ef4444", // 中国边界使用红色
        text: isDarkMode ? "#f9fafb" : "#1f2937", // 文本颜色对比更强
        highlight: isDarkMode ? "#fcd34d" : "#60a5fa", // 高亮颜色改为浅蓝色，更配合背景
      };
    };

    const colors = getColors();

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = null;

    // 创建材质的辅助函数
    const createMaterial = (
      color: string,
      side: THREE.Side = THREE.FrontSide,
      opacity: number = 1.0,
    ) => {
      return new THREE.MeshBasicMaterial({
        color: color,
        side: side,
        transparent: true,
        opacity: opacity,
      });
    };

    // 创建地球几何体
    const earthGeometry = new THREE.SphereGeometry(2.0, 64, 64);
    const earthMaterial = createMaterial(
      colors.earthBase,
      THREE.FrontSide,
      isDarkMode ? 0.9 : 0.9, // 调整明亮模式下的不透明度
    );
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.renderOrder = 1;
    scene.add(earth);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      isDarkMode ? 0.7 : 0.85, // 微调明亮模式下的光照强度
    );
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      isDarkMode ? 0xeeeeff : 0xffffff, // 恢复明亮模式下的纯白光源
      isDarkMode ? 0.6 : 0.65, // 微调明亮模式下的定向光强度
    );
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 8;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
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
    controls.dampingFactor = 0.25; // 大幅增加阻尼因子，从0.1到0.25提高稳定性
    controls.rotateSpeed = 0.2; // 降低旋转速度，提高稳定性
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3; // 降低自动旋转速度
    controls.minDistance = 5;
    controls.maxDistance = 15;

    controls.minPolarAngle = Math.PI * 0.1;
    controls.maxPolarAngle = Math.PI * 0.9;

    controls.addEventListener("change", () => {
      if (sceneRef.current) {
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      }
    });

    // 保存所有线条对象的引用，用于快速检测
    const allLineObjects: THREE.Line[] = [];
    const lineToCountryMap = new Map<THREE.Line, string>();
    
    // 创建国家边界组
    const countryGroup = new THREE.Group();
    earth.add(countryGroup);
    
    // 创建国家边界
    const countries = new Map<string, THREE.Object3D>();
    
    // 从WASM获取边界线数据
    const boundaryLines = geoProcessor.get_boundary_lines();
    
    // 处理边界线数据
    if (boundaryLines) {
      // 遍历所有边界线
      for (const boundaryLine of boundaryLines) {
        const { points, region_name, is_visited } = boundaryLine;
        
        // 创建区域组
        const regionObject = new THREE.Group();
        regionObject.userData = { name: region_name, isVisited: is_visited };
        
        // 转换点数组为THREE.Vector3数组
        const threePoints = points.map((p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z));
        
        // 创建边界线
        if (threePoints.length > 1) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(threePoints);
          
          // 确定线条颜色
          const isChina = region_name === "中国" || region_name.startsWith("中国-");
          let borderColor;
          
          if (is_visited) {
            // 已访问的地区，包括中国城市，都使用绿色边界
            borderColor = colors.visitedBorder;
          } else if (isChina) {
            // 未访问的中国和中国区域使用红色边界
            borderColor = colors.chinaBorder;
          } else {
            // 其他未访问区域使用默认边界颜色
            borderColor = colors.border;
          }
          
          const lineMaterial = new THREE.LineBasicMaterial({
            color: borderColor,
            linewidth: is_visited ? 1.8 : 1.2, // 微调线条宽度，保持已访问区域更明显
            transparent: true,
            opacity: is_visited ? 0.95 : 0.85, // 调整不透明度，使边界明显但不突兀
          });

          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData = {
            name: region_name,
            isVisited: is_visited,
            originalColor: borderColor,
            highlightColor: colors.highlight,
          };

          // 设置渲染顺序
          line.renderOrder = is_visited ? 3 : 2;
          regionObject.add(line);
          
          // 保存线条对象引用和对应的区域名称
          allLineObjects.push(line);
          lineToCountryMap.set(line, region_name);
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
        fixedPosition = new THREE.Vector3(-2.1, 3.41, -8.0);
      } else {
        // 大屏幕使用原来的位置
        fixedPosition = new THREE.Vector3(-2.1, 3.41, -6.5);
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
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

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
            lastFunc = window.setTimeout(() => {
              if (lastRan && Date.now() - lastRan >= limit) {
                func.apply(this, args);
                lastRan = Date.now();
              }
            }, Math.max(limit - sinceLastRan, 0));
          }
        }
      };
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

      // 重置所有线条颜色
      allLineObjects.forEach((line) => {
        if (line.material instanceof THREE.LineBasicMaterial) {
          line.material.color.set(line.userData.originalColor);
        }
      });

      // 如果找到点和对应的国家/地区
      if (result && result.countryName) {
        // 高亮显示该国家/地区的线条
        allLineObjects.forEach((line) => {
          if (
            lineToCountryMap.get(line) === result.countryName &&
            line.material instanceof THREE.LineBasicMaterial
          ) {
            line.material.color.set(line.userData.highlightColor);
          }
        });

        // 更新悬停国家
        if (result.countryName !== hoveredCountry) {
          setHoveredCountry(result.countryName);
        }

        // 不禁用自动旋转，保持地球旋转
      } else {
        // 如果没有找到国家/地区，清除悬停状态
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
      // 恢复所有线条的原始颜色
      allLineObjects.forEach((line) => {
        if (line.material instanceof THREE.LineBasicMaterial) {
          line.material.color.set(line.userData.originalColor);
        }
      });

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
        // 重置所有线条颜色
        allLineObjects.forEach((line) => {
          if (line.material instanceof THREE.LineBasicMaterial) {
            line.material.color.set(line.userData.originalColor);
          }
        });

        // 高亮显示该国家/地区的线条
        allLineObjects.forEach((line) => {
          if (
            lineToCountryMap.get(line) === result.countryName &&
            line.material instanceof THREE.LineBasicMaterial
          ) {
            line.material.color.set(line.userData.highlightColor);
          }
        });

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
    containerRef.current.addEventListener("mousemove", onMouseMove, { passive: true });
    containerRef.current.addEventListener("click", onClick, { passive: false });
    containerRef.current.addEventListener("dblclick", onDoubleClick, { passive: false });

    // 简化的动画循环函数
    const animate = () => {
      if (!sceneRef.current) return;

      // 更新控制器
      sceneRef.current.controls.update();

      // 渲染
      sceneRef.current.renderer.render(scene, camera);
      sceneRef.current.labelRenderer.render(scene, camera);

      // 请求下一帧
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

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
      lineToCountryMap,
      allLineObjects,
    };

    // 开始动画
    sceneRef.current.animationId = requestAnimationFrame(animate);

    // 获取球面上的点对应的国家/地区
    const getPointOnSphere = (
      mouseX: number,
      mouseY: number,
      camera: THREE.Camera,
      radius: number,
    ): { point: THREE.Vector3, countryName: string | null } | null => {
      // 计算鼠标在画布中的归一化坐标
      const rect = containerRef.current!.getBoundingClientRect();
      const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
      const y = -((mouseY - rect.top) / rect.height) * 2 + 1;

      // 创建射线
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(x, y), camera);

      // 检测射线与实际地球模型的相交
      const earthIntersects = ray.intersectObject(earth, false);
      if (earthIntersects.length > 0) {
        const point = earthIntersects[0].point;
        
        // 使用WASM查找最近的国家/地区
        const countryName = geoProcessor.find_nearest_country(
          point.x, point.y, point.z, radius
        );
        
        return { point, countryName };
      }

      // 如果没有直接相交，使用球体辅助检测
      const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);
      const sphereMesh = new THREE.Mesh(sphereGeom);

      const intersects = ray.intersectObject(sphereMesh);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // 使用WASM查找最近的国家/地区
        const countryName = geoProcessor.find_nearest_country(
          point.x, point.y, point.z, radius
        );
        
        return { point, countryName };
      }

      return null;
    };

    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;

      const { camera, renderer, labelRenderer } = sceneRef.current;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);

      // 立即渲染一次
      renderer.render(sceneRef.current.scene, camera);
      labelRenderer.render(sceneRef.current.scene, camera);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    // 清理函数
    return () => {
      // 清理资源和事件监听器
      if (sceneRef.current) {
        // 取消动画帧
        if (sceneRef.current.animationId !== null) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }

        // 处理渲染器的处理
        sceneRef.current.renderer.dispose();
        sceneRef.current.renderer.forceContextLoss();
        sceneRef.current.renderer.domElement.remove();

        // 移除标签渲染器
        if (sceneRef.current.labelRenderer) {
          sceneRef.current.labelRenderer.domElement.remove();
        }

        // 释放控制器
        if (sceneRef.current.controls) {
          sceneRef.current.controls.dispose();
        }
      }

      // 移除事件监听器
      if (containerRef.current) {
        containerRef.current.removeEventListener("mousemove", onMouseMove);
        containerRef.current.removeEventListener("click", onClick);
        containerRef.current.removeEventListener("dblclick", onDoubleClick);
      }

      // 移除窗口事件监听器
      window.removeEventListener("resize", handleResize);
    };
  }, [visitedPlaces, theme, wasmReady, geoProcessor]); // 添加geoProcessor依赖

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="w-full h-[400px] sm:h-[450px] md:h-[500px] lg:h-[600px] xl:h-[700px]"
      />
      
      {(wasmError || mapError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-20">
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg shadow-lg max-w-md">
            <h3 className="text-red-700 dark:text-red-300 font-bold text-lg mb-2">地图加载错误</h3>
            <p className="text-red-600 dark:text-red-400 text-sm">{wasmError || mapError}</p>
            <button 
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              重新加载
            </button>
          </div>
        </div>
      )}
      
      {mapLoading && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 z-20">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
            <p className="mt-3 text-gray-700 dark:text-gray-300">加载地图数据中...</p>
          </div>
        </div>
      )}
      
      {hoveredCountry && (
        <div className="absolute bottom-5 left-0 right-0 text-center z-10">
          <div className="inline-block bg-white/95 dark:bg-gray-800/95 px-6 py-3 rounded-xl shadow-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:scale-105">
            <p className="text-gray-800 dark:text-white font-medium text-lg flex items-center justify-center gap-2">
              {hoveredCountry}
              {hoveredCountry && visitedPlaces.includes(hoveredCountry) ? (
                <span className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-sm ml-1.5 whitespace-nowrap">
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
                <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full text-sm ml-1.5 whitespace-nowrap">
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
