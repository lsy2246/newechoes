use std::io::{self, Read};
use flate2::{Compression, write::GzEncoder, read::GzDecoder};

/// 魔数常量 - 用于标识文件格式
pub const MAGIC_BYTES: &'static [u8] = b"NECMP"; // NewEchoes Compressed

/// 将对象序列化为二进制格式
pub fn to_binary<T: serde::Serialize>(obj: &T) -> Result<Vec<u8>, io::Error> {
    // 直接使用bincode标准配置序列化原始对象
    bincode::serde::encode_to_vec(obj, bincode::config::standard())
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("序列化失败: {}", e)))
}

/// 从二进制格式反序列化对象
pub fn from_binary<T: for<'a> serde::de::Deserialize<'a>>(data: &[u8]) -> Result<T, io::Error> {
    // 使用bincode标准配置从二进制数据反序列化对象
    bincode::serde::decode_from_slice(data, bincode::config::standard())
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("反序列化失败: {}", e)))
        .map(|(value, _)| value)
}

/// 将对象序列化为压缩的二进制格式
pub fn to_compressed<T: serde::Serialize>(obj: &T, version: [u8; 2]) -> Result<Vec<u8>, io::Error> {
    // 序列化
    let binary = to_binary(obj)?;
    
    // 创建输出缓冲区并写入魔数
    let mut output = Vec::with_capacity(binary.len() / 2);
    output.extend_from_slice(MAGIC_BYTES);
    
    // 写入版本号
    output.extend_from_slice(&version);
    
    // 写入原始数据大小
    let data_len = (binary.len() as u32).to_le_bytes();
    output.extend_from_slice(&data_len);
    
    // 压缩数据
    let mut encoder = GzEncoder::new(Vec::new(), Compression::best());
    std::io::Write::write_all(&mut encoder, &binary)?;
    let compressed_data = encoder.finish()?;
    
    // 添加压缩后的数据
    output.extend_from_slice(&compressed_data);
    
    Ok(output)
}

/// 从压缩的二进制格式反序列化对象，使用默认最大版本4
pub fn from_compressed<T: for<'a> serde::de::Deserialize<'a>>(data: &[u8]) -> Result<T, io::Error> {
    from_compressed_with_max_version(data, 4)
}

/// 从压缩的二进制格式反序列化对象，允许指定支持的最大版本
pub fn from_compressed_with_max_version<T: for<'a> serde::de::Deserialize<'a>>(
    data: &[u8], 
    max_version: u8
) -> Result<T, io::Error> {
    // 检查数据长度是否足够
    if data.len() < MAGIC_BYTES.len() + 2 + 4 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("数据太短，无法解析: {} 字节", data.len())
        ));
    }

    // 验证魔数
    if &data[0..MAGIC_BYTES.len()] != MAGIC_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "无效的文件格式：魔数不匹配"
        ));
    }

    // 读取版本号
    let version_offset = MAGIC_BYTES.len();
    let version = [data[version_offset], data[version_offset + 1]];
    
    // 验证版本兼容性
    if version[0] > max_version {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("不支持的版本: {}.{}", version[0], version[1])
        ));
    }

    // 读取原始数据大小
    let size_offset = version_offset + 2;
    let mut size_bytes = [0u8; 4];
    size_bytes.copy_from_slice(&data[size_offset..size_offset + 4]);
    let original_size = u32::from_le_bytes(size_bytes);

    // 提取压缩数据
    let compressed_data = &data[size_offset + 4..];

    // 解压数据
    let mut decoder = GzDecoder::new(compressed_data);
    let mut decompressed_data = Vec::with_capacity(original_size as usize);
    decoder.read_to_end(&mut decompressed_data)?;
    
    // 检查解压后的数据大小
    if decompressed_data.len() != original_size as usize {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("解压后数据大小不匹配: 期望 {} 字节, 实际 {} 字节", 
                   original_size, decompressed_data.len())
        ));
    }

    // 反序列化数据
    from_binary(&decompressed_data)
}

/// 验证压缩数据是否有效
pub fn validate_compressed_data(data: &[u8]) -> Result<[u8; 2], io::Error> {
    validate_compressed_data_with_max_version(data, 4)
}

/// 验证压缩数据是否有效，允许指定支持的最大版本
pub fn validate_compressed_data_with_max_version(data: &[u8], max_version: u8) -> Result<[u8; 2], io::Error> {
    // 检查数据长度是否足够
    if data.len() < MAGIC_BYTES.len() + 2 + 4 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("数据太短，无法验证: {} 字节", data.len())
        ));
    }

    // 验证魔数
    if &data[0..MAGIC_BYTES.len()] != MAGIC_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "无效的文件格式：魔数不匹配"
        ));
    }

    // 读取版本号
    let version_offset = MAGIC_BYTES.len();
    let version = [data[version_offset], data[version_offset + 1]];
    
    // 验证版本兼容性
    if version[0] > max_version {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("不支持的版本: {}.{}", version[0], version[1])
        ));
    }
    
    Ok(version)
} 