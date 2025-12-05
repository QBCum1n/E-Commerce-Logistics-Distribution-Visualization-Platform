-- 修改 orders_in_delivery_range_final 函数
-- 使用 logistics_trajectories 表中的位置信息而不是 orders 表的经纬度字段

-- 重新创建函数，确保返回类型与前端匹配
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

-- 添加注释说明
COMMENT ON FUNCTION orders_in_delivery_range_final(UUID) IS '获取商家配送范围内的订单，使用logistics_trajectories表中的位置信息而不是orders表的经纬度字段';