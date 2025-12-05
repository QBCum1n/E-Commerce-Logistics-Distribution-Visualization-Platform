import { useState } from "react";
import { Card, Button, message, Space, Typography } from "antd";
import { setDefaultFutianDeliveryRange } from "@/services/shopService";

const { Title, Paragraph } = Typography;

const DeliveryRangeManagementPage = () => {
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 为所有商家设置默认的深圳市福田区矩形配送范围
  const handleSetDefaultDeliveryRange = async () => {
    try {
      setLoading(true);
      const result = await setDefaultFutianDeliveryRange();
      
      if (result.success) {
        messageApi.success(result.message);
      } else {
        messageApi.error(result.message);
      }
    } catch (error) {
      console.error("设置默认配送范围失败:", error);
      messageApi.error("设置默认配送范围失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Card>
        <Title level={2}>配送范围管理</Title>
        <Paragraph>
          此页面用于管理商家的配送范围。点击下方按钮可以为所有没有设置配送范围的商家设置默认的深圳市福田区矩形配送范围。
        </Paragraph>
        <Paragraph>
          <strong>默认配送范围说明：</strong>
          <ul>
            <li>区域类型：矩形</li>
            <li>位置：深圳市福田区中心区域</li>
            <li>经度范围：114.05° - 114.09°</li>
            <li>纬度范围：22.52° - 22.55°</li>
            <li>面积：约16平方公里</li>
          </ul>
        </Paragraph>
        <Space>
          <Button 
            type="primary" 
            loading={loading}
            onClick={handleSetDefaultDeliveryRange}
          >
            为所有商家设置默认配送范围
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default DeliveryRangeManagementPage;