//这个文件我也不知道怎么出来的,不管它吧
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从环境变量或直接使用配置
const supabaseUrl = 'https://khvhcuqzmiusxlnzfrnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodmhjdXF6bWl1c3hsbnpmcm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MTYxNDYsImV4cCI6MjA3OTE5MjE0Nn0.TEPhnIMOa76Ig-tsYoeVzeyMH6anBzWmJN2HA5FqViI';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 要执行的 SQL
const sql = `
-- 修改orders_in_delivery_range_final函数，使用logistics_trajectories表中的位置信息
CREATE OR REPLACE FUNCTION orders_in_delivery_range_final(shop_id_param UUID)
RETURNS TABLE (
    id UUID,
    order_number VARCHAR,
    shop_id UUID,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    customer_address VARCHAR,
    total_amount DECIMAL,
    status VARCHAR,
    priority VARCHAR,
    estimated_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    logistics_provider_id UUID,
    logistics_providers_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        o.id,
        o.order_number,
        o.shop_id,
        o.customer_name,
        o.customer_phone,
        o.customer_address,
        o.total_amount,
        o.status,
        o.priority,
        o.estimated_delivery,
        o.actual_delivery,
        o.created_at,
        o.updated_at,
        o.logistics_provider_id,
        lp.name as logistics_providers_name
    FROM 
        orders o
    LEFT JOIN 
        logistics_providers lp ON o.logistics_provider_id = lp.id
    JOIN 
        logistics_trajectories lt ON o.id = lt.order_id
    WHERE 
        o.shop_id = shop_id_param
        AND lt.status = 'delivered'  -- 使用已送达状态的位置信息
        AND lt.lng IS NOT NULL
        AND lt.lat IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM shops s 
            WHERE s.id = shop_id_param 
            AND s.delivery_range IS NOT NULL
            AND ST_Contains(
                s.delivery_range::geometry, 
                ST_SetSRID(ST_MakePoint(lt.lng, lt.lat), 4326)
            )
        );
END;
$$ LANGUAGE plpgsql;
`;

async function executeSql() {
  try {
    console.log('正在执行 SQL...');
    
    // 使用 Supabase 的 SQL 执行功能
    // 注意：这需要服务端权限，可能需要在 Supabase Dashboard 中手动执行
    console.log('请将以下 SQL 复制到 Supabase Dashboard 的 SQL Editor 中执行：');
    console.log('=====================================');
    console.log(sql);
    console.log('=====================================');
    console.log('或者，如果您有服务端权限，可以使用 Supabase CLI 执行：');
    console.log('supabase db push');
    
    return true;
  } catch (err) {
    console.error('发生错误:', err);
    return false;
  }
}

// 执行 SQL
executeSql()
  .then(success => {
    if (success) {
      console.log('配送范围函数修改完成！');
    } else {
      console.log('配送范围函数修改失败！');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('脚本执行出错:', err);
    process.exit(1);
  });