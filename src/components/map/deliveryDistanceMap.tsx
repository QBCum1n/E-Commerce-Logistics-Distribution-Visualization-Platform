import React, { useState, useEffect, useRef, useCallback } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { Spin, message, Card, Statistic, Row, Col } from "antd";
import { getOrderTrajectoryWithDistance } from "@/services/orderService";
import type { LogisticsTrajectory } from "@/types/order";

type AMapSDK = Awaited<ReturnType<typeof AMapLoader.load>>;
type AMapMapInstance = InstanceType<AMapSDK["Map"]>;
type AMapMarker = InstanceType<AMapSDK["Marker"]>;
type AMapPolyline = InstanceType<AMapSDK["Polyline"]>;

declare global {
	interface Window {
		_AMapSecurityConfig?: {
			securityJsCode: string;
		};
		AMap?: AMapSDK;
	}
}

const DEFAULT_CENTER: [number, number] = [114.057868, 22.543099];

// 定义状态类型
type TrajectoryStatus = "pickup" | "in_transit" | "out_for_delivery" | "delivered";

// 状态颜色映射
const STATUS_COLORS: Record<TrajectoryStatus, string> = {
	pickup: "#1890ff", // 蓝色 - 已取件
	in_transit: "#faad14", // 橙色 - 运输中
	out_for_delivery: "#52c41a", // 绿色 - 派送中
	delivered: "#722ed1", // 紫色 - 已送达
};

// 状态名称映射
const STATUS_NAMES: Record<TrajectoryStatus, string> = {
	pickup: "已取件",
	in_transit: "运输中",
	out_for_delivery: "派送中",
	delivered: "已送达",
};

interface DeliveryDistanceMapProps {
	orderId: string; // 订单ID
}

const DeliveryDistanceMap: React.FC<DeliveryDistanceMapProps> = ({ orderId }) => {
	const [messageApi, contextHolder] = message.useMessage();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapInstanceRef = useRef<AMapMapInstance | null>(null);
	const [loading, setLoading] = useState(true);
	const [trajectoryLoading, setTrajectoryLoading] = useState(false);
	const [trajectory, setTrajectory] = useState<LogisticsTrajectory | null>(null);
	const [totalDistance, setTotalDistance] = useState<number>(0);
	const markersRef = useRef<AMapMarker[]>([]);
	const polylinesRef = useRef<AMapPolyline[]>([]);
	const distanceLabelRef = useRef<AMapMarker | null>(null);

	// 加载订单轨迹和配送距离
	const loadOrderTrajectoryWithDistance = useCallback(async () => {
		if (!orderId) return;
		
		setTrajectoryLoading(true);
		try {
			const result = await getOrderTrajectoryWithDistance(orderId);
			// 将 TrajectoryPoint[] 转换为 LogisticsTrajectory
			const logisticsTrajectory: LogisticsTrajectory | null = result.trajectory.length > 0 
				? { orderId, points: result.trajectory }
				: null;
			
			setTrajectory(logisticsTrajectory);
			setTotalDistance(result.totalDistance);
			if (logisticsTrajectory) {
				renderTrajectoryOnMap(logisticsTrajectory, result.totalDistance);
			}
		} catch (error) {
			console.error("加载订单轨迹和配送距离失败:", error);
			messageApi.error("加载订单轨迹和配送距离失败");
		} finally {
			setTrajectoryLoading(false);
		}
	}, [orderId, messageApi]);

	// 清除地图上的所有轨迹
	const clearTrajectoriesFromMap = useCallback(() => {
		// 清除标记点
		markersRef.current.forEach(marker => {
			mapInstanceRef.current?.remove(marker);
		});
		markersRef.current = [];
		
		// 清除轨迹线
		polylinesRef.current.forEach(polyline => {
			mapInstanceRef.current?.remove(polyline);
		});
		polylinesRef.current = [];
		
		// 清除距离标签
		if (distanceLabelRef.current) {
			mapInstanceRef.current?.remove(distanceLabelRef.current);
			distanceLabelRef.current = null;
		}
	}, []);

	// 在地图上渲染轨迹和配送距离
	const renderTrajectoryOnMap = useCallback((trajectory: LogisticsTrajectory, distance: number) => {
		if (!mapInstanceRef.current || !trajectory.points || trajectory.points.length === 0) return;

		clearTrajectoriesFromMap();

		const { points } = trajectory;

		// 转换坐标点
		const path = points.map(point => {
			const [lng, lat] = point.location.coordinates;
			return new window.AMap!.LngLat(lng, lat);
		});

		// 创建轨迹线
		const polyline = new window.AMap!.Polyline({
			path: path,
			strokeColor: "#1890ff",
			strokeWeight: 4,
			strokeOpacity: 0.8,
			showDir: true,
		});
		
		mapInstanceRef.current.add(polyline);
		polylinesRef.current.push(polyline);

		// 为每个轨迹点添加标记
		points.forEach((point, index) => {
			const [lng, lat] = point.location.coordinates;
			const position = new window.AMap!.LngLat(lng, lat);
			
			// 创建标记点
			const marker = new window.AMap!.Marker({
				position: position,
				icon: new window.AMap!.Icon({
					size: new window.AMap!.Size(25, 34),
					image: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
						<svg width="25" height="34" viewBox="0 0 25 34" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.8 12.5 34 12.5 34S25 19.8 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="${STATUS_COLORS[point.status as TrajectoryStatus]}"/>
							<text x="12.5" y="18" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
						</svg>
					`)}`,
					imageSize: new window.AMap!.Size(25, 34),
				}),
				offset: new window.AMap!.Pixel(-12, -34),
			});
			
			// 创建信息窗体
			const infoWindow = new window.AMap!.InfoWindow({
				content: `
					<div style="padding: 8px; max-width: 200px;">
						<div style="font-weight: bold; margin-bottom: 5px;">${STATUS_NAMES[point.status as TrajectoryStatus]}</div>
						<div style="font-size: 12px; color: #666; margin-bottom: 3px;">${point.description}</div>
						<div style="font-size: 11px; color: #999;">${new Date(point.timestamp).toLocaleString()}</div>
					</div>
				`,
				offset: new window.AMap!.Pixel(0, -34),
			});
			
			// 点击标记点显示信息窗体
			marker.on('click', () => {
				infoWindow.open(mapInstanceRef.current!, position);
			});
			
			mapInstanceRef.current.add(marker);
			markersRef.current.push(marker);
		});

		// 在轨迹中点添加距离标签
		if (path.length >= 2) {
			const midIndex = Math.floor(path.length / 2);
			const midPoint = path[midIndex];
			
			// 创建距离标签
			const distanceLabel = new window.AMap!.Marker({
				position: midPoint,
				content: `
					<div style="
						background-color: rgba(24, 144, 255, 0.8);
						color: white;
						padding: 4px 8px;
						border-radius: 4px;
						font-size: 12px;
						font-weight: bold;
						box-shadow: 0 2px 4px rgba(0,0,0,0.2);
						white-space: nowrap;
					">
						总配送距离: ${distance.toFixed(2)} 公里
					</div>
				`,
				offset: new window.AMap!.Pixel(-60, -20),
			});
			
			mapInstanceRef.current.add(distanceLabel);
			distanceLabelRef.current = distanceLabel;
		}

		// 调整地图视野以包含所有轨迹点
		mapInstanceRef.current.setFitView([polyline, ...markersRef.current]);
	}, [clearTrajectoriesFromMap]);

	// 初始化地图
	useEffect(() => {
		let destroyed = false;

		const key = import.meta.env.VITE_AMAP_KEY;
		const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;
		if (!key || !securityCode) {
			messageApi.error("地图配置错误，请检查环境变量");
			console.error("请设置 VITE_AMAP_KEY或者VITE_AMAP_SECURITY_CODE");
			setLoading(false);
			return;
		}

		window._AMapSecurityConfig = { securityJsCode: securityCode };

		const init = async () => {
			try {
				const AMap = await AMapLoader.load({
					key,
					version: "2.0",
					plugins: ["AMap.PlaceSearch", "AMap.AutoComplete"],
				});

				if (destroyed || !containerRef.current) return;

				mapInstanceRef.current = new AMap.Map(containerRef.current, {
					zoom: 13,
					center: DEFAULT_CENTER,
					viewMode: "3D",
				});

				window.AMap = AMap;

				messageApi.success("地图加载成功");
			} catch (error) {
				console.error("地图初始化失败:", error);
				messageApi.error("地图加载失败");
			} finally {
				if (!destroyed) setLoading(false);
			}
		};

		init();

		return () => {
			destroyed = true;
			mapInstanceRef.current?.destroy();
		};
	}, [messageApi]);

	// 当订单ID变化时，加载对应轨迹和距离
	useEffect(() => {
		if (orderId) {
			loadOrderTrajectoryWithDistance();
		}
	}, [orderId, loadOrderTrajectoryWithDistance]);

	return (
		<div style={{ position: "relative", width: "100%", height: "100%" }}>
			{contextHolder}
			{loading && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexDirection: "column",
						background: "rgba(255,255,255,0.8)",
						zIndex: 1,
					}}>
					<Spin size="large" />
					<span style={{ marginTop: 8, color: "#555" }}>地图加载中...</span>
				</div>
			)}
			
			{/* 配送距离信息面板 */}
			<Card
				style={{
					position: "absolute",
					top: 10,
					right: 10,
					zIndex: 2,
					width: 280,
				}}
				size="small"
				title="配送距离信息"
			>
				<Row gutter={16}>
					<Col span={24}>
						<Statistic
							title="总配送距离"
							value={totalDistance}
							precision={2}
							suffix="公里"
							valueStyle={{ color: '#1890ff' }}
						/>
					</Col>
				</Row>
				
				{trajectoryLoading && (
					<div style={{ textAlign: "center", color: "#666", marginTop: 16 }}>
						<Spin size="small" /> 轨迹加载中...
					</div>
				)}
				
				{trajectory && (
					<div style={{ marginTop: 16 }}>
						<div style={{ marginBottom: 8 }}>状态图例:</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
							{Object.entries(STATUS_COLORS).map(([status, color]) => (
								<div key={status} style={{ display: "flex", alignItems: "center" }}>
									<div
										style={{
											width: 12,
											height: 12,
											borderRadius: "50%",
											backgroundColor: color,
											marginRight: 4,
										}}
									/>
									<span style={{ fontSize: 12 }}>{STATUS_NAMES[status as TrajectoryStatus]}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</Card>
			
			<div ref={containerRef} style={{ width: "100%", height: "100%" }} />
		</div>
	);
};

export default DeliveryDistanceMap;