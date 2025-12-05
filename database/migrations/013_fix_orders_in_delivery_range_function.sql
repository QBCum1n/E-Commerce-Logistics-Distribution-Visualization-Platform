-- 修复 orders_in_delivery_range_final 函数，确保返回结构与前端期望一致
-- 迁移脚本：修复数据库函数返回类型不匹配问题

-- 1. 首先检查当前函数定义
SELECT 
    proname,
    pg_get_function_arguments(oid) as args,
    pg_get_function_result(oid) as return_type,
    prosrc as source
FROM pg_proc 
WHERE proname = 'orders_in_delivery_range_final';

-- 2. 重新创建函数，确保返回结构与前端期望一致
DROP FUNCTION IF EXISTS orders_in_delivery_range_final(UUID);

CREATE OR REPLACE FUNCTION orders_in_delivery_range_final(shop_id_param UUID)
RETURNS TABLE (
    id UUID,
    order_number TEXT,
    shop_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    total_amount DECIMAL,
    status TEXT,
    priority TEXT,
    estimated_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    logistics_provider_id UUID,
    logistics_providers_name TEXT
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
        AND lt.location IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM shops s 
            WHERE s.id = shop_id_param 
            AND s.delivery_range IS NOT NULL
            AND ST_Contains(
                s.delivery_range::geometry, 
                lt.location
            )
        );
END;
$$ LANGUAGE plpgsql;

-- 3. 测试函数调用
-- 请替换下面的 shop_id 为一个实际存在的商家ID
-- SELECT * FROM orders_in_delivery_range_final('your-shop-id-here');

-- 4. 检查 orders 表中 customer_address 列的数据
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN customer_address IS NOT NULL THEN 1 END) as orders_with_address,
    COUNT(CASE WHEN customer_address IS NULL THEN 1 END) as orders_without_address
FROM orders;

-- 5. 检查 logistics_trajectories 表中的数据
SELECT 
    COUNT(*) as total_trajectories,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_trajectories,
    COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as trajectories_with_location
FROM logistics_trajectories;