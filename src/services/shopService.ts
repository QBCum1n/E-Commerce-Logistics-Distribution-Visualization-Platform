import { supabase } from "@/lib/supabaseClient";

// 商家类型定义
export interface Shop {
  id: string;
  name: string;
  owner_id: string;
  address?: string; // 存储为geometry类型，但在前端使用时会转换为WKT格式字符串
  phone?: string;
  email?: string;
  is_active: boolean;
  delivery_range?: string; // PostGIS geometry in WKT format (supports Polygon, Circle, Rectangle, etc.)
  delivery_range_type?: 'polygon' | 'circle' | 'rectangle'; // 配送范围类型
  created_at: string;
  updated_at: string;
}

// 获取商家信息
export const getShop = async (shopId: string): Promise<Shop | null> => {
  try {
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single();

    if (error) throw error;
    
    // 创建新对象返回，确保类型安全
    return data;
  } catch (error) {
    console.error("获取商家信息失败:", error);
    throw error;
  }
};

// 更新商家配送范围
export const updateShopDeliveryRange = async (shopId: string, deliveryRange: string): Promise<Shop> => {
  try {
    console.log("更新商家配送范围 - 商家ID:", shopId);
    console.log("更新商家配送范围 - 配送范围:", deliveryRange);
    
    const { data, error } = await supabase
      .from("shops")
      .update({ delivery_range: deliveryRange })
      .eq("id", shopId)
      .select()
      .single();

    if (error) {
      console.error("Supabase错误:", error);
      throw error;
    }
    
    console.log("更新成功，返回数据:", data);
    return data;
  } catch (error) {
    console.error("更新商家配送范围失败:", error);
    throw error;
  }
};

// 获取当前登录用户的商家信息
export const getCurrentUserShop = async (): Promise<Shop | null> => {
  try {
    console.log("获取当前用户商家信息...");
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("用户未登录");
      throw new Error("用户未登录");
    }
    
    console.log("当前用户ID:", user.id);

    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 是没有找到记录的错误码
      console.error("查询商家信息失败:", error);
      throw error;
    }

    console.log("查询到的商家信息:", data);
    return data;
  } catch (error) {
    console.error("获取当前用户商家信息失败:", error);
    throw error;
  }
};

// 更新商家多边形配送范围
export const updateShopPolygonDeliveryRange = async (shopId: string, coordinates: Array<[number, number]>): Promise<Shop> => {
  try {
    console.log("更新商家多边形配送范围 - 商家ID:", shopId);
    console.log("更新商家多边形配送范围 - 坐标点:", coordinates);
    
    // 构建多边形的WKT表示
    const polygonWKT = `POLYGON((${coordinates.map(coord => `${coord[0]} ${coord[1]}`).join(', ')}))`;
    
    const { data, error } = await supabase
      .from("shops")
      .update({ 
        delivery_range: polygonWKT
      })
      .eq("id", shopId)
      .select()
      .single();

    if (error) {
      console.error("Supabase错误:", error);
      throw error;
    }
    
    console.log("更新成功，返回数据:", data);
    return data;
  } catch (error) {
    console.error("更新商家多边形配送范围失败:", error);
    throw error;
  }
};

// 更新商家矩形配送范围
export const updateShopRectangularDeliveryRange = async (
  shopId: string, 
  minLng: number, 
  minLat: number, 
  maxLng: number, 
  maxLat: number
): Promise<Shop> => {
  try {
    console.log("更新商家矩形配送范围 - 商家ID:", shopId);
    console.log("更新商家矩形配送范围 - 最小经纬度:", minLng, minLat);
    console.log("更新商家矩形配送范围 - 最大经纬度:", maxLng, maxLat);
    
    // 构建矩形范围的WKT表示
    const rectangleWKT = `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;
    
    const { data, error } = await supabase
      .from("shops")
      .update({ 
        delivery_range: rectangleWKT
      })
      .eq("id", shopId)
      .select()
      .single();

    if (error) {
      console.error("Supabase错误:", error);
      throw error;
    }
    
    console.log("更新成功，返回数据:", data);
    return data;
  } catch (error) {
    console.error("更新商家矩形配送范围失败:", error);
    throw error;
  }
};

// 为所有商家设置默认的深圳市福田区矩形配送范围
export const setDefaultFutianDeliveryRange = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("为所有商家设置默认的深圳市福田区矩形配送范围");
    
    // 福田区中心区域矩形范围 (经度: 114.05-114.09, 纬度: 22.52-22.55)
    const { data, error } = await supabase
      .from("shops")
      .update({ 
        delivery_range: 'POLYGON((114.05 22.52, 114.09 22.52, 114.09 22.55, 114.05 22.55, 114.05 22.52))'
      })
      .is('delivery_range', null)
      .select('id');

    if (error) {
      console.error("Supabase错误:", error);
      throw error;
    }
    
    console.log("更新成功，影响的商家数量:", data?.length || 0);
    return { 
      success: true, 
      message: `成功为${data?.length || 0}个商家设置默认的深圳市福田区矩形配送范围` 
    };
  } catch (error) {
    console.error("设置默认配送范围失败:", error);
    return { 
      success: false, 
      message: `设置默认配送范围失败: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};