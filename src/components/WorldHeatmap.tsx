import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import worldData from '@/assets/world.zh.json';
import chinaData from '@/assets/china.json';

interface WorldHeatmapProps {
  visitedPlaces: string[];
}

const WorldHeatmap: React.FC<WorldHeatmapProps> = ({ visitedPlaces }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    typeof document !== 'undefined' && 
    (document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark') 
    ? 'dark' : 'light'
  );

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
    regionImportance?: Map<string, number>;
    importanceThreshold?: number;
  } | null>(null);

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = 
        document.documentElement.classList.contains('dark') || 
        document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'dark' : 'light');
    };

    // 创建 MutationObserver 来监听 class 和 data-theme 属性的变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          (mutation.attributeName === 'class' && mutation.target === document.documentElement) ||
          (mutation.attributeName === 'data-theme' && mutation.target === document.documentElement)
        ) {
          handleThemeChange();
        }
      });
    });

    // 开始观察
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class', 'data-theme'] 
    });

    // 初始检查
    handleThemeChange();

    // 清理
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // 清理之前的场景
    if (sceneRef.current) {
      if (sceneRef.current.animationId !== null) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      sceneRef.current.renderer.dispose();
      sceneRef.current.labelRenderer.domElement.remove();
      sceneRef.current.scene.clear();
      containerRef.current.innerHTML = '';
    }

    // 检查当前是否为暗色模式
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                      document.documentElement.getAttribute('data-theme') === 'dark';
    
    // 根据当前模式设置颜色
    const getColors = () => {
      return {
        earthBase: isDarkMode ? '#111827' : '#f3f4f6', // 深色模式更暗，浅色模式更亮
        visited: isDarkMode ? '#065f46' : '#34d399', // 访问过的颜色更鲜明
        border: isDarkMode ? '#6b7280' : '#d1d5db', // 边界颜色更柔和
        visitedBorder: isDarkMode ? '#10b981' : '#059669', // 访问过的边界颜色更鲜明
        chinaBorder: isDarkMode ? '#f87171' : '#ef4444', // 中国边界使用红色
        text: isDarkMode ? '#f9fafb' : '#1f2937', // 文本颜色对比更强
        highlight: isDarkMode ? '#fbbf24' : '#d97706', // 高亮颜色更适合当前主题
      };
    };
    
    const colors = getColors();

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = null;

    // 添加一个动态计算小区域的机制
    const regionSizeMetrics = new Map<string, {
      boundingBoxSize?: number,
      pointCount?: number,
      importance?: number,
      isSmallRegion?: boolean,
      polygonArea?: number
    }>();

    // 创建材质的辅助函数
    const createMaterial = (color: string, side: THREE.Side = THREE.FrontSide, opacity: number = 1.0) => {
      return new THREE.MeshBasicMaterial({
        color: color,
        side: side,
        transparent: true,
        opacity: opacity
      });
    };

    // 创建地球几何体
    const earthGeometry = new THREE.SphereGeometry(2.0, 64, 64);
    const earthMaterial = createMaterial(colors.earthBase, THREE.FrontSide, isDarkMode ? 0.9 : 0.8);
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.renderOrder = 1;
    scene.add(earth);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.7 : 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(isDarkMode ? 0xeeeeff : 0xffffff, isDarkMode ? 0.6 : 0.5);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      45, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.z = 8;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true, 
      preserveDrawingBuffer: true,
      precision: "highp"
    });
    renderer.sortObjects = true; 
    renderer.setClearColor(0x000000, 0); 
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // 创建CSS2D渲染器用于标签
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
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
    
    controls.addEventListener('change', () => {
      if (sceneRef.current) {
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      }
    });

    // 创建国家边界
    const countries = new Map<string, THREE.Object3D>();
    const countryGroup = new THREE.Group();
    earth.add(countryGroup);
    
    // 保存所有线条对象的引用，用于快速检测
    const allLineObjects: THREE.Line[] = [];
    const lineToCountryMap = new Map<THREE.Line, string>();
    
    // 保存所有国家和省份的边界盒，用于优化检测
    const countryBoundingBoxes = new Map<string, THREE.Box3>();
    
    // 创建一个辅助函数，用于将经纬度转换为三维坐标
    const latLongToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
      // 调整经度范围，确保它在[-180, 180]之间
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (lon + 180) * Math.PI / 180;
      
      const x = -radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      return new THREE.Vector3(x, y, z);
    };
    
    // 省份边界和中心点数据结构
    const provinceCenters = new Map<string, THREE.Vector3>();

    // 创建一个通用函数，用于处理地理特性（国家或省份）
    const processGeoFeature = (
      feature: any, 
      parent: THREE.Group, 
      options: {
        regionType: 'country' | 'province',
        parentName?: string,
        scale?: number,
        borderColor?: string,
        visitedBorderColor?: string
      }
    ) => {
      const { regionType, parentName, scale = 2.01, borderColor, visitedBorderColor } = options;
      
      const regionName = regionType === 'province' && parentName 
        ? `${parentName}-${feature.properties.name}` 
        : feature.properties.name;
      
      const isRegionVisited = visitedPlaces.includes(regionName);
      
      // 为每个地区创建一个组
      const regionObject = new THREE.Group();
      regionObject.userData = { name: regionName, isVisited: isRegionVisited };
      
      // 计算地区中心点
      let centerLon = 0;
      let centerLat = 0;
      let pointCount = 0;
      
      // 创建边界盒用于碰撞检测
      const boundingBox = new THREE.Box3();
      
      // 首先检查GeoJSON特性中是否有预定义的中心点
      let hasPreDefinedCenter = false;
      let centerVector;
      
      if (feature.properties.cp && Array.isArray(feature.properties.cp) && feature.properties.cp.length === 2) {
        const [cpLon, cpLat] = feature.properties.cp;
        hasPreDefinedCenter = true;
        centerVector = latLongToVector3(cpLat, cpLon, scale + 0.005);
        centerLon = cpLon;
        centerLat = cpLat;
        
        // 保存预定义中心点
        if (regionType === 'province') {
          provinceCenters.set(regionName, centerVector);
        }
      }
      
      // 存储区域边界
      const boundaries: THREE.Vector3[][] = [];
      
      // 处理多边形坐标
      const processPolygon = (polygonCoords: any) => {
        const points: THREE.Vector3[] = [];
        
        // 收集多边形的点
        polygonCoords.forEach((point: number[]) => {
          const lon = point[0];
          const lat = point[1];
          centerLon += lon;
          centerLat += lat;
          pointCount++;
          
          // 使用辅助函数将经纬度转换为3D坐标
          const vertex = latLongToVector3(lat, lon, scale);
          points.push(vertex);
          
          // 扩展边界盒以包含此点
          boundingBox.expandByPoint(vertex);
        });
        
        // 保存边界多边形
        if (points.length > 2) {
          boundaries.push(points);
        }
        
        // 收集区域大小指标
        if (!regionSizeMetrics.has(regionName)) {
          regionSizeMetrics.set(regionName, {});
        }
        
        const metrics = regionSizeMetrics.get(regionName)!;
        if (points.length > 2) {
          // 计算边界框大小
          let minX = Infinity, minY = Infinity, minZ = Infinity;
          let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
          
          points.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            minZ = Math.min(minZ, point.z);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
            maxZ = Math.max(maxZ, point.z);
          });
          
          const sizeX = maxX - minX;
          const sizeY = maxY - minY;
          const sizeZ = maxZ - minZ;
          const boxSize = Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ);
          
          // 更新或初始化指标
          metrics.boundingBoxSize = metrics.boundingBoxSize ? 
            Math.max(metrics.boundingBoxSize, boxSize) : boxSize;
          metrics.pointCount = (metrics.pointCount || 0) + points.length;
        }
        
        // 创建边界线
        if (points.length > 1) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: isRegionVisited 
              ? (visitedBorderColor || colors.visitedBorder) 
              : (borderColor || colors.border),
            linewidth: isRegionVisited ? 1.5 : 1,
            transparent: true,
            opacity: isRegionVisited ? 0.9 : 0.7
          });
          
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData = { 
            name: regionName, 
            isVisited: isRegionVisited,
            originalColor: isRegionVisited 
              ? (visitedBorderColor || colors.visitedBorder) 
              : (borderColor || colors.border),
            highlightColor: colors.highlight  // 使用主题颜色中定义的高亮颜色
          };
          
          // 设置渲染顺序
          line.renderOrder = isRegionVisited ? 3 : 2;
          regionObject.add(line);
          
          // 保存线条对象引用和对应的国家/地区名称
          allLineObjects.push(line);
          lineToCountryMap.set(line, regionName);
        }
      };
      
      // 处理不同类型的几何体
      if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates.forEach((ring: any) => {
            processPolygon(ring);
          });
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach((polygon: any) => {
            polygon.forEach((ring: any) => {
              processPolygon(ring);
            });
          });
        }
        
        if (pointCount > 0 && !hasPreDefinedCenter) {
          // 计算平均中心点
            centerLon /= pointCount;
            centerLat /= pointCount;
          
          // 将中心点经纬度转换为3D坐标
          centerVector = latLongToVector3(centerLat, centerLon, scale + 0.005);
          
          // 保存计算的中心点
          if (regionType === 'province') {
            provinceCenters.set(regionName, centerVector);
          }
        }
        
        if (pointCount > 0) {
          // 保存地区的边界盒
          countryBoundingBoxes.set(regionName, boundingBox);
          
          // 添加地区对象到父组
          parent.add(regionObject);
          countries.set(regionName, regionObject);
        }
      }
      
      return regionObject;
    };

    // 处理世界GeoJSON数据
    worldData.features.forEach((feature: any) => {
      const countryName = feature.properties.name;
      
      // 跳过中国，因为我们将使用更详细的中国地图数据
      if (countryName === '中国') return;
      
      processGeoFeature(feature, countryGroup, {
        regionType: 'country',
        scale: 2.01
      });
    });
    
    // 处理中国的省份
    const chinaObject = new THREE.Group();
    chinaObject.userData = { name: '中国', isVisited: visitedPlaces.includes('中国') };
    
    chinaData.features.forEach((feature: any) => {
      processGeoFeature(feature, chinaObject, {
        regionType: 'province',
        parentName: '中国',
        scale: 2.015,
        borderColor: colors.chinaBorder,
        visitedBorderColor: colors.visitedBorder
      });
    });

    // 添加中国对象到国家组
    countryGroup.add(chinaObject);
    countries.set('中国', chinaObject);
    
    // 将视图旋转到中国位置
    const positionCameraToFaceChina = () => {
      // 检查是否为小屏幕
      const isSmallScreen = containerRef.current && containerRef.current.clientWidth < 640;
      
      // 根据屏幕大小设置不同的相机初始位置
      let fixedPosition;
      if (isSmallScreen) {
        // 小屏幕显示距离更远，以便看到更多地球
        fixedPosition = new THREE.Vector3(-2.10, 3.41, -8.0);
      } else {
        // 大屏幕使用原来的位置
        fixedPosition = new THREE.Vector3(-2.10, 3.41, -6.5);
      }
      
      // 应用位置
      camera.position.copy(fixedPosition);
      camera.lookAt(0, 0, 0);
      controls.update();
      
      // 禁用自动旋转一段时间
      controls.autoRotate = false;
      
      // 6秒后恢复旋转
      setTimeout(() => {
        if (sceneRef.current) {
          sceneRef.current.controls.autoRotate = true;
        }
      }, 6000);
      
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
      
      return function(this: any, ...args: any[]) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          lastRan = Date.now();
          setTimeout(() => inThrottle = false, limit);
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

    // 根据球面上的点找到最近的国家或地区
    const findNearestCountry = (point: THREE.Vector3): string | null => {
      let closestCountry = null;
      let minDistance = Infinity;
      let smallRegionDistance = Infinity;
      let smallRegionCountry = null;
      
      // 遍历所有国家/地区的边界盒
      for (const [countryName, box] of countryBoundingBoxes.entries()) {
        // 计算点到边界盒的距离
        const distance = box.distanceToPoint(point);
        
        // 估算边界盒大小
        const boxSize = box.getSize(new THREE.Vector3()).length();
        
        // 如果点在边界盒内或距离非常近，直接选择该区域
        if (distance < 0.001) {
          return countryName;
        }
        
        // 同时跟踪绝对最近的区域
        if (distance < minDistance) {
          minDistance = distance;
          closestCountry = countryName;
        }
        
        // 对于小区域，使用加权距离
        // 小区域的阈值（较小的边界盒尺寸）
        const SMALL_REGION_THRESHOLD = 0.5;
        if (boxSize < SMALL_REGION_THRESHOLD) {
          // 针对小区域的加权距离（降低小区域的选中难度）
          const weightedDistance = distance * (0.5 + boxSize / 2);
          if (weightedDistance < smallRegionDistance) {
            smallRegionDistance = weightedDistance;
            smallRegionCountry = countryName;
          }
        }
      }
      
      // 小区域优化逻辑
      if (smallRegionCountry && smallRegionDistance < minDistance * 2) {
        return smallRegionCountry;
      }
      
      // 处理中国的特殊情况 - 如果点击非常接近省份边界
      if (closestCountry === "中国") {
        // 查找最近的中国省份
        let closestProvince = null;
        let minProvinceDistance = Infinity;
        
        // 查找最近的中国省份
        for (const [countryName, box] of countryBoundingBoxes.entries()) {
          if (countryName.startsWith("中国-")) {
            const distance = box.distanceToPoint(point);
            if (distance < minProvinceDistance) {
              minProvinceDistance = distance;
              closestProvince = countryName;
            }
          }
        }
        
        if (closestProvince && minProvinceDistance < minDistance * 1.5) {
          return closestProvince;
        }
      }
      
      return closestCountry;
    };
    
    // 解决射线检测和球面相交的问题
    const getPointOnSphere = (mouseX: number, mouseY: number, camera: THREE.Camera, radius: number): THREE.Vector3 | null => {
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
        return earthIntersects[0].point;
      }
      
      // 如果没有直接相交，使用球体辅助检测
      const sphereGeom = new THREE.SphereGeometry(radius, 32, 32);
      const sphereMesh = new THREE.Mesh(sphereGeom);
      
      const intersects = ray.intersectObject(sphereMesh);
      if (intersects.length > 0) {
        return intersects[0].point;
      }
      
      return null;
    };

    // 简化的鼠标移动事件处理函数
    const onMouseMove = throttle((event: MouseEvent) => {
      if (!containerRef.current || !sceneRef.current) return;
      
      // 获取鼠标在球面上的点
      const spherePoint = getPointOnSphere(event.clientX, event.clientY, camera, 2.01);
      
      // 重置所有线条颜色
      allLineObjects.forEach(line => {
        if (line.material instanceof THREE.LineBasicMaterial) {
          line.material.color.set(line.userData.originalColor);
        }
      });
      
      // 如果找到点，寻找最近的国家/地区
      if (spherePoint) {
        const countryName = findNearestCountry(spherePoint);
        
        if (countryName) {
          // 高亮显示该国家/地区的线条
          allLineObjects.forEach(line => {
            if (lineToCountryMap.get(line) === countryName && line.material instanceof THREE.LineBasicMaterial) {
              line.material.color.set(line.userData.highlightColor);
            }
          });
          
          // 更新悬停国家
          if (countryName !== hoveredCountry) {
            setHoveredCountry(countryName);
          }
          
          // 禁用自动旋转
          controls.autoRotate = false;
        } else {
          // 如果没有找到国家/地区，清除悬停状态
          if (hoveredCountry) {
            setHoveredCountry(null);
            controls.autoRotate = true;
          }
        }
      } else {
        // 如果没有找到球面点，清除悬停状态
        if (hoveredCountry) {
          setHoveredCountry(null);
          controls.autoRotate = true;
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
      allLineObjects.forEach(line => {
        if (line.material instanceof THREE.LineBasicMaterial) {
          line.material.color.set(line.userData.originalColor);
        }
      });
      
      setHoveredCountry(null);
      if (sceneRef.current) {
        sceneRef.current.lastClickedCountry = null;
        sceneRef.current.lastHoverTime = null;
      }
      controls.autoRotate = true;
    };

    // 简化的鼠标点击事件处理函数
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current || !sceneRef.current) return;
      
      // 获取鼠标在球面上的点
      const spherePoint = getPointOnSphere(event.clientX, event.clientY, camera, 2.01);
      
      // 如果找到点，寻找最近的国家/地区
      if (spherePoint) {
        const countryName = findNearestCountry(spherePoint);
        
        if (countryName) {
          // 重置所有线条颜色
          allLineObjects.forEach(line => {
            if (line.material instanceof THREE.LineBasicMaterial) {
              line.material.color.set(line.userData.originalColor);
            }
          });
          
          // 高亮显示该国家/地区的线条
          allLineObjects.forEach(line => {
            if (lineToCountryMap.get(line) === countryName && line.material instanceof THREE.LineBasicMaterial) {
              line.material.color.set(line.userData.highlightColor);
            }
          });
          
          // 更新选中国家
          setHoveredCountry(countryName);
          sceneRef.current.lastClickedCountry = countryName;
          controls.autoRotate = false;
        } else {
          // 如果没有找到国家/地区，清除选择
          clearSelection();
        }
      } else {
        // 如果没有找到球面点，清除选择
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
    containerRef.current.addEventListener('mousemove', onMouseMove);
    containerRef.current.addEventListener('click', onClick);
    containerRef.current.addEventListener('dblclick', onDoubleClick);

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
      regionImportance: undefined,
      importanceThreshold: undefined
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

    window.addEventListener('resize', handleResize);

    // 开始动画
    sceneRef.current.animationId = requestAnimationFrame(animate);

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
        containerRef.current.removeEventListener('mousemove', onMouseMove);
        containerRef.current.removeEventListener('click', onClick);
        containerRef.current.removeEventListener('dblclick', onDoubleClick);
      }
      
      // 移除窗口事件监听器
      window.removeEventListener('resize', handleResize);
    };
  }, [visitedPlaces, theme]); // 依赖于visitedPlaces和theme变化

  return (
    <div className="relative">
      <div 
        ref={containerRef} 
        className="w-full h-[400px] sm:h-[450px] md:h-[500px] lg:h-[600px] xl:h-[700px]"
      />
      {hoveredCountry && (
        <div className="absolute bottom-5 left-0 right-0 text-center z-10">
          <div className="inline-block bg-white/95 dark:bg-gray-800/95 px-6 py-3 rounded-xl shadow-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:scale-105">
            <p className="text-gray-800 dark:text-white font-medium text-lg flex items-center justify-center gap-2">
              {hoveredCountry} 
              {hoveredCountry && visitedPlaces.includes(hoveredCountry) ? (
                <span className="inline-flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-sm ml-1.5 whitespace-nowrap">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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