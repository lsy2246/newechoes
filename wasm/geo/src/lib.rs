use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use geojson::{Feature, GeoJson, Value};
use std::collections::HashMap;
use std::f64::consts::PI;
use kdtree::KdTree;
use kdtree::distance::squared_euclidean;
use serde_wasm_bindgen;

// 初始化错误处理
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

// 表示3D向量的结构
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Vector3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[wasm_bindgen]
impl Vector3 {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64, z: f64) -> Vector3 {
        Vector3 { x, y, z }
    }
}

// 表示边界盒的结构
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct BoundingBox {
    pub min_x: f64,
    pub min_y: f64,
    pub min_z: f64,
    pub max_x: f64,
    pub max_y: f64,
    pub max_z: f64,
}

#[wasm_bindgen]
impl BoundingBox {
    #[wasm_bindgen(constructor)]
    pub fn new(min_x: f64, min_y: f64, min_z: f64, max_x: f64, max_y: f64, max_z: f64) -> BoundingBox {
        BoundingBox {
            min_x, min_y, min_z,
            max_x, max_y, max_z,
        }
    }

    // 计算点到边界盒的距离
    pub fn distance_to_point(&self, point: &Vector3) -> f64 {
        let dx = if point.x < self.min_x {
            self.min_x - point.x
        } else if point.x > self.max_x {
            point.x - self.max_x
        } else {
            0.0
        };

        let dy = if point.y < self.min_y {
            self.min_y - point.y
        } else if point.y > self.max_y {
            point.y - self.max_y
        } else {
            0.0
        };

        let dz = if point.z < self.min_z {
            self.min_z - point.z
        } else if point.z > self.max_z {
            point.z - self.max_z
        } else {
            0.0
        };

        (dx * dx + dy * dy + dz * dz).sqrt()
    }

    // 获取边界盒的大小（对角线长度）
    pub fn get_size(&self) -> f64 {
        let dx = self.max_x - self.min_x;
        let dy = self.max_y - self.min_y;
        let dz = self.max_z - self.min_z;
        (dx * dx + dy * dy + dz * dz).sqrt()
    }
}

// 区域信息结构
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RegionInfo {
    pub name: String,
    pub is_visited: bool,
    pub center: Vector3,
    pub bounding_box: BoundingBox,
}

// 表示带有属性的边界线的结构
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BoundaryLine {
    pub points: Vec<Vector3>,
    pub region_name: String,
    pub is_visited: bool,
}

// 地理处理器
#[wasm_bindgen]
pub struct GeoProcessor {
    region_tree: Option<KdTree<f64, String, [f64; 3]>>,
    regions: HashMap<String, RegionInfo>,
    boundary_lines: Vec<BoundaryLine>,
}

#[wasm_bindgen]
impl GeoProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GeoProcessor {
        GeoProcessor {
            region_tree: None,
            regions: HashMap::new(),
            boundary_lines: Vec::new(),
        }
    }

    // 将经纬度转换为三维坐标
    pub fn lat_long_to_vector3(&self, lat: f64, lon: f64, radius: f64) -> Vector3 {
        // 确保经度在 -180 到 180 之间
        let lon = if lon > 180.0 { lon - 360.0 } else if lon < -180.0 { lon + 360.0 } else { lon };
        
        let phi = (90.0 - lat) * PI / 180.0;
        let theta = (lon + 180.0) * PI / 180.0;

        let x = -radius * phi.sin() * theta.cos();
        let y = radius * phi.cos();
        let z = radius * phi.sin() * theta.sin();

        Vector3 { x, y, z }
    }

    // 处理GeoJSON数据并构建优化的空间索引和边界线
    #[wasm_bindgen]
    pub fn process_geojson(&mut self, world_json: &str, china_json: &str, visited_places_json: &str, scale: f64) -> Result<(), JsValue> {
        // 解析访问过的地点
        let visited_places: Vec<String> = serde_json::from_str(visited_places_json)
            .map_err(|e| JsValue::from_str(&format!("Error parsing visited places: {}", e)))?;
        
        // 解析世界数据
        let world_geojson: GeoJson = world_json.parse()
            .map_err(|e| JsValue::from_str(&format!("Error parsing world GeoJSON: {}", e)))?;
        
        // 解析中国数据
        let china_geojson: GeoJson = china_json.parse()
            .map_err(|e| JsValue::from_str(&format!("Error parsing China GeoJSON: {}", e)))?;
        
        // 创建空间索引
        let mut region_tree = KdTree::new(3);
        let mut regions = HashMap::new();
        let mut boundary_lines = Vec::new();
        
        // 处理世界地图的特征
        if let GeoJson::FeatureCollection(collection) = world_geojson {
            for feature in collection.features {
                // 跳过中国，因为会用更详细的中国地图数据
                if let Some(props) = &feature.properties {
                    if let Some(serde_json::Value::String(name)) = props.get("name") {
                        if name == "中国" {
                            continue;
                        }
                        
                        self.process_feature(&feature, &visited_places, None, scale, 
                                             &mut region_tree, &mut regions, &mut boundary_lines)?;
                    }
                }
            }
        }
        
        // 处理中国地图数据
        if let GeoJson::FeatureCollection(collection) = china_geojson {
            for feature in collection.features {
                self.process_feature(&feature, &visited_places, Some("中国"), scale, 
                                     &mut region_tree, &mut regions, &mut boundary_lines)?;
            }
        }
        
        // 保存处理结果
        self.region_tree = Some(region_tree);
        self.regions = regions;
        self.boundary_lines = boundary_lines;
        
        Ok(())
    }
    
    // 处理单个地理特征
    fn process_feature(
        &self,
        feature: &Feature,
        visited_places: &[String],
        parent_name: Option<&str>,
        scale: f64,
        region_tree: &mut KdTree<f64, String, [f64; 3]>,
        regions: &mut HashMap<String, RegionInfo>,
        boundary_lines: &mut Vec<BoundaryLine>
    ) -> Result<(), JsValue> {
        if let Some(props) = &feature.properties {
            if let Some(serde_json::Value::String(name)) = props.get("name") {
                // 确定完整的区域名称
                let region_name = if let Some(parent) = parent_name {
                    format!("{}-{}", parent, name)
                } else {
                    name.clone()
                };
                
                // 检查是否已访问
                let is_visited = visited_places.contains(&region_name);
                
                // 处理几何体
                if let Some(geom) = &feature.geometry {
                    match &geom.value {
                        Value::Polygon(polygon) => {
                            self.process_polygon(polygon, &region_name, is_visited, scale, 
                                                 region_tree, regions, boundary_lines)?;
                        }
                        Value::MultiPolygon(multi_polygon) => {
                            for polygon in multi_polygon {
                                self.process_polygon(polygon, &region_name, is_visited, scale, 
                                                     region_tree, regions, boundary_lines)?;
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
        Ok(())
    }
    
    // 处理多边形
    fn process_polygon(
        &self,
        polygon: &Vec<Vec<Vec<f64>>>,
        region_name: &str,
        is_visited: bool,
        scale: f64,
        region_tree: &mut KdTree<f64, String, [f64; 3]>,
        regions: &mut HashMap<String, RegionInfo>,
        boundary_lines: &mut Vec<BoundaryLine>
    ) -> Result<(), JsValue> {
        if polygon.is_empty() || polygon[0].is_empty() {
            return Ok(());
        }
        
        // 外环
        let exterior = &polygon[0];
        
        // 计算中心点和边界盒
        let mut center_lon = 0.0;
        let mut center_lat = 0.0;
        let mut count = 0;
        
        let mut min_x = f64::INFINITY;
        let mut min_y = f64::INFINITY;
        let mut min_z = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut max_y = f64::NEG_INFINITY;
        let mut max_z = f64::NEG_INFINITY;
        
        let mut points = Vec::new();
        
        // 遍历所有点
        for point in exterior {
            if point.len() >= 2 {
                let lon = point[0];
                let lat = point[1];
                
                center_lon += lon;
                center_lat += lat;
                count += 1;
                
                // 转换为3D坐标
                let vertex = self.lat_long_to_vector3(lat, lon, scale);
                points.push(vertex);
                
                // 更新边界盒
                min_x = min_x.min(vertex.x);
                min_y = min_y.min(vertex.y);
                min_z = min_z.min(vertex.z);
                max_x = max_x.max(vertex.x);
                max_y = max_y.max(vertex.y);
                max_z = max_z.max(vertex.z);
            }
        }
        
        if count > 0 {
            // 计算中心点
            center_lon /= count as f64;
            center_lat /= count as f64;
            
            // 创建中心点3D坐标
            let center = self.lat_long_to_vector3(center_lat, center_lon, scale + 0.005);
            
            // 创建边界盒
            let bounding_box = BoundingBox {
                min_x, min_y, min_z,
                max_x, max_y, max_z,
            };
            
            // 保存区域信息
            let region_info = RegionInfo {
                name: region_name.to_string(),
                is_visited,
                center,
                bounding_box,
            };
            
            // 添加到区域索引
            regions.insert(region_name.to_string(), region_info);
            
            // 添加到KD树
            let coord_key = [center.x, center.y, center.z];
            region_tree.add(coord_key, region_name.to_string())
                .map_err(|e| JsValue::from_str(&format!("Error adding to KD tree: {}", e)))?;
            
            // 创建边界线
            if points.len() > 1 {
                let boundary_line = BoundaryLine {
                    points,
                    region_name: region_name.to_string(),
                    is_visited,
                };
                
                boundary_lines.push(boundary_line);
            }
        }
        
        Ok(())
    }
    
    // 查找最近的国家/地区
    #[wasm_bindgen]
    pub fn find_nearest_country(&self, point_x: f64, point_y: f64, point_z: f64, _radius: f64) -> Option<String> {
        let point = Vector3 { x: point_x, y: point_y, z: point_z };
        
        // 先检查点是否在任何边界盒内
        for (name, region) in &self.regions {
            if region.bounding_box.distance_to_point(&point) < 0.001 {
                return Some(name.clone());
            }
        }
        
        // 全局最近区域
        let mut closest_name = None;
        let mut min_distance = f64::INFINITY;
        let mut small_region_distance = f64::INFINITY;
        let mut small_region_name = None;
        
        // KD树搜索的数量
        const K_NEAREST: usize = 10;
        
        // 使用KD树搜索最近的区域
        if let Some(tree) = &self.region_tree {
            if let Ok(nearest) = tree.nearest(&[point.x, point.y, point.z], K_NEAREST, &squared_euclidean) {
                for (dist, name) in nearest {
                    // 转换距离
                    let distance = dist.sqrt();
                    
                    // 检查是否更接近
                    if distance < min_distance {
                        min_distance = distance;
                        closest_name = Some(name.clone());
                    }
                    
                    // 处理小区域逻辑
                    if let Some(region) = self.regions.get(name) {
                        let box_size = region.bounding_box.get_size();
                        
                        // 如果是小区域，使用加权距离
                        const SMALL_REGION_THRESHOLD: f64 = 0.5;
                        if box_size < SMALL_REGION_THRESHOLD {
                            let weighted_distance = distance * (0.5 + box_size / 2.0);
                            if weighted_distance < small_region_distance {
                                small_region_distance = weighted_distance;
                                small_region_name = Some(name.clone());
                            }
                        }
                    }
                }
            }
        }
        
        // 小区域优化逻辑
        if let Some(name) = &small_region_name {
            if small_region_distance < min_distance * 2.0 {
                return Some(name.clone());
            }
        }
        
        // 处理中国的特殊情况
        if let Some(name) = &closest_name {
            if name == "中国" {
                // 查找最近的中国省份
                let mut closest_province = None;
                let mut min_province_distance = f64::INFINITY;
                
                for (region_name, region) in &self.regions {
                    if region_name.starts_with("中国-") {
                        let distance = region.bounding_box.distance_to_point(&point);
                        if distance < min_province_distance {
                            min_province_distance = distance;
                            closest_province = Some(region_name.clone());
                        }
                    }
                }
                
                if let Some(province) = closest_province {
                    if min_province_distance < min_distance * 1.5 {
                        return Some(province);
                    }
                }
            }
        }
        
        closest_name
    }
    
    // 获取边界线数据，用于在JS中渲染
    #[wasm_bindgen]
    pub fn get_boundary_lines(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.boundary_lines).unwrap_or(JsValue::NULL)
    }
    
    // 获取所有区域信息
    #[wasm_bindgen]
    pub fn get_regions(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.regions).unwrap_or(JsValue::NULL)
    }
} 