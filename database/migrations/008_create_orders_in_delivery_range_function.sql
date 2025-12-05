-- 创建获取商家配送范围内订单的函数
CREATE OR REPLACE FUNCTION orders_in_delivery_range(shop_id_param UUID)
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
    SELECT 
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
    WHERE 
        o.shop_id = shop_id_param
        AND EXISTS (
            SELECT 1 FROM shops s 
            WHERE s.id = shop_id_param 
            AND s.delivery_range IS NOT NULL
            AND ST_Contains(
                s.delivery_range::geometry, 
                -- 这里假设订单地址有经纬度信息，如果没有，需要先进行地理编码
                -- 暂时使用一个示例点，实际应用中需要从订单地址获取经纬度
                ST_SetSRID(ST_MakePoint(114.057, 22.543), 4326)
            )
        );
END;
$$ LANGUAGE plpgsql;

-- 创建一个更通用的函数，通过地理编码获取订单地址的经纬度
CREATE OR REPLACE FUNCTION get_order_address_geometry(address_text VARCHAR)
RETURNS GEOMETRY AS $$
BEGIN
    -- 这里应该调用地理编码服务，将地址转换为经纬度
    -- 暂时返回一个示例点，实际应用中需要集成真实的地理编码服务
    RETURN ST_SetSRID(ST_MakePoint(114.057, 22.543), 4326);
END;
$$ LANGUAGE plpgsql;

-- 创建改进版的订单筛选函数
CREATE OR REPLACE FUNCTION orders_in_delivery_range_v2(shop_id_param UUID)
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
    SELECT 
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
    WHERE 
        o.shop_id = shop_id_param
        AND EXISTS (
            SELECT 1 FROM shops s 
            WHERE s.id = shop_id_param 
            AND s.delivery_range IS NOT NULL
            AND ST_Contains(
                s.delivery_range::geometry, 
                get_order_address_geometry(o.customer_address)
            )
        );
END;
$$ LANGUAGE plpgsql;

-- 注意：由于我们暂时没有真实的地理编码服务，上述函数可能无法正常工作
-- 在实际应用中，您需要：
-- 1. 在订单表中添加经纬度字段，或者
-- 2. 集成真实的地理编码服务（如高德、百度等）将地址转换为经纬度

-- 临时解决方案：假设订单表中已经添加了经纬度字段
-- 首先为订单表添加经纬度字段（如果还没有的话）
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_lng DECIMAL(10, 7);
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_lat DECIMAL(10, 7);

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