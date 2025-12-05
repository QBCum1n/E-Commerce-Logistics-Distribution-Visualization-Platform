-- 创建更新商家配送范围的存储过程
-- 描述: 创建一个存储过程，用于更新商家的配送范围
-- 创建: 2025-06-18

-- 创建更新商家配送范围的存储过程
CREATE OR REPLACE FUNCTION update_shop_delivery_range(
  shop_id_param UUID,
  delivery_range_param GEOMETRY
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  delivery_range GEOMETRY,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- 更新商家配送范围
  UPDATE shops 
  SET delivery_range = delivery_range_param,
      updated_at = NOW()
  WHERE id = shop_id_param
  RETURNING 
    id, 
    name, 
    delivery_range, 
    updated_at;
END;
$$ LANGUAGE plpgsql;

-- 创建更新商家圆形配送范围的存储过程
CREATE OR REPLACE FUNCTION update_shop_circular_delivery_range(
  shop_id_param UUID,
  center_lng FLOAT,
  center_lat FLOAT,
  radius_meters FLOAT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  delivery_range GEOMETRY,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- 使用ST_Buffer创建一个圆形区域
  -- 首先创建一个点，然后使用ST_Buffer创建缓冲区（圆形）
  UPDATE shops 
  SET delivery_range = ST_Buffer(
          ST_GeomFromText(format('POINT(%s %s)', center_lng, center_lat), 4326)::geography,
          radius_meters
        )::geometry,
      updated_at = NOW()
  WHERE id = shop_id_param
  RETURNING 
    id, 
    name, 
    delivery_range, 
    updated_at;
END;
$$ LANGUAGE plpgsql;

-- 创建更新商家矩形配送范围的存储过程
CREATE OR REPLACE FUNCTION update_shop_rectangular_delivery_range(
  shop_id_param UUID,
  min_lng FLOAT,
  min_lat FLOAT,
  max_lng FLOAT,
  max_lat FLOAT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  delivery_range GEOMETRY,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- 创建矩形区域
  UPDATE shops 
  SET delivery_range = ST_GeomFromText(
          format('POLYGON((%s %s, %s %s, %s %s, %s %s, %s %s))', 
                 min_lng, min_lat, 
                 max_lng, min_lat, 
                 max_lng, max_lat, 
                 min_lng, max_lat, 
                 min_lng, min_lat), 
          4326
        ),
      updated_at = NOW()
  WHERE id = shop_id_param
  RETURNING 
    id, 
    name, 
    delivery_range, 
    updated_at;
END;
$$ LANGUAGE plpgsql;

-- 验证存储过程创建成功
SELECT 
  '✅ 商家配送范围更新存储过程创建成功' as completion_message,
  proname as procedure_name,
  pg_get_functiondef(oid) as procedure_definition
FROM pg_proc 
WHERE proname IN ('update_shop_delivery_range', 'update_shop_circular_delivery_range', 'update_shop_rectangular_delivery_range');