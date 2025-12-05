-- 检查数据库表结构
-- 迁移脚本：检查 orders 和 logistics_trajectories 表的实际结构

-- 检查 orders 表的实际结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_name = 'orders'
ORDER BY 
  ordinal_position;

-- 检查 logistics_trajectories 表的结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM 
  information_schema.columns
WHERE 
  table_name = 'logistics_trajectories'
ORDER BY 
  ordinal_position;

-- 查看 logistics_trajectories 表中是否有地址相关的字段
SELECT 
  column_name
FROM 
  information_schema.columns
WHERE 
  table_name = 'logistics_trajectories'
  AND (
    column_name ILIKE '%address%' OR 
    column_name ILIKE '%addr%' OR 
    column_name ILIKE '%location%' OR 
    column_name ILIKE '%desc%'
  );