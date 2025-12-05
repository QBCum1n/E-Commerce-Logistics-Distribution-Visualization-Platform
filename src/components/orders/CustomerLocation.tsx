import React, { useState, useEffect } from "react";
import { Tooltip } from "antd";
import { supabase } from "@/lib/supabaseClient";

interface CustomerLocationProps {
  orderId: string;
}

const CustomerLocation: React.FC<CustomerLocationProps> = ({ orderId }) => {
  const [location, setLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomerLocation = async () => {
      setLoading(true);
      try {
        // 从logistics_trajectories表中获取状态为'delivered'的轨迹点，这通常是客户位置
        const { data, error } = await supabase
          .from("logistics_trajectories")
          .select("location")
          .eq("order_id", orderId)
          .eq("status", "delivered")
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          // location是PostGIS几何对象，格式为 {coordinates: [lng, lat]}
          const coords = data[0].location.coordinates;
          setLocation({ lng: coords[0], lat: coords[1] });
        }
      } catch (error) {
        console.error("获取客户位置失败:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchCustomerLocation();
    }
  }, [orderId]);

  if (loading) {
    return <span className="text-slate-400 text-xs">加载中...</span>;
  }

  if (!location) {
    return <span className="text-slate-400 text-xs">未设置</span>;
  }

  return (
    <Tooltip title={`经度: ${location.lng}, 纬度: ${location.lat}`} placement="topLeft" className="max-w-xs">
      <span className="text-slate-400 text-xs">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
    </Tooltip>
  );
};

export default CustomerLocation;