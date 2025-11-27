import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { Spin, message } from "antd";

type AMapSDK = Awaited<ReturnType<typeof AMapLoader.load>>;
type AMapMapInstance = InstanceType<AMapSDK["Map"]>;

declare global {
	interface Window {
		_AMapSecurityConfig?: {
			securityJsCode: string;
		};
		AMap?: AMapSDK;
	}
}

// 提取静态配置，减少渲染消耗
const DEFAULT_CENTER: [number, number] = [114.057868, 22.543099];
const MAP_OPTIONS = {
	zoom: 13,
	center: DEFAULT_CENTER,
	viewMode: "3D" as const,
	pitch: 0,
	showIndoorMap: false, // 关闭室内地图
	mapStyle: "amap://styles/normal",
	zooms: [4, 20] as [number, number], // 限制最小缩放，防止加载全球海量瓦片
	resizeEnable: true,
	rotateEnable: true,
	pitchEnable: true,
	skyColor: "#F8FAFC",
};

// 单例缓存 Loader，防止 React 严格模式下的重复加载请求
let loaderPromise: Promise<AMapSDK> | null = null;

const Map = () => {
	const [messageApi, contextHolder] = message.useMessage();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapInstanceRef = useRef<AMapMapInstance | null>(null);

	// 初始 Loading 状态根据 Key 是否存在来判断，避免无 Key 时先 True 后 False 的闪烁
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let destroyed = false;
		let animationFrameId: number;

		// 环境变量获取
		const key = import.meta.env.VITE_AMAP_KEY;
		const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE;

		// 设置安全密钥
		if (securityCode) {
			window._AMapSecurityConfig = { securityJsCode: securityCode };
		}

		// 初始化加载器 (单例模式)
		if (!loaderPromise && key) {
			loaderPromise = AMapLoader.load({
				key,
				version: "2.0",
				plugins: ["AMap.PlaceSearch", "AMap.AutoComplete", "AMap.ToolBar", "AMap.Scale"],
			});
		}

		const initMap = async () => {
			// 将校验逻辑移入异步流程，避免 Effect 内同步 setState
			if (!key || !securityCode) {
				if (!destroyed) {
					messageApi.error("地图配置错误：缺少 Key 或 Security Code");
					setLoading(false); // 此时在异步/回调中，是安全的
				}
				return;
			}

			try {
				const AMap = await loaderPromise;
				if (destroyed || !containerRef.current) return;

				// 使用 requestAnimationFrame 将重型渲染推迟到下一帧
				animationFrameId = requestAnimationFrame(() => {
					if (destroyed || !containerRef.current) return;

					// 清理旧实例
					if (mapInstanceRef.current) {
						mapInstanceRef.current.destroy();
					}

					// 创建地图
					const map = new AMap!.Map(containerRef.current, MAP_OPTIONS);
					mapInstanceRef.current = map;
					window.AMap = AMap;

					// 添加控件
					map.addControl(new AMap!.ToolBar({ position: "RB" }));
					map.addControl(new AMap!.Scale());

					// 监听 complete 事件来关闭 loading，消除白屏时间
					map.on("complete", () => {
						if (!destroyed) setLoading(false);
					});

					map.on("error", () => {
						if (!destroyed) {
							messageApi.error("地图加载发生错误");
							setLoading(false);
						}
					});
				});
			} catch (error) {
				console.error("地图初始化失败:", error);
				if (!destroyed) {
					messageApi.error("地图服务连接失败");
					setLoading(false);
				}
			}
		};

		initMap();

		return () => {
			destroyed = true;
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			if (mapInstanceRef.current) {
				mapInstanceRef.current.destroy();
				mapInstanceRef.current = null;
			}
		};
	}, [messageApi]);

	return (
		<div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
			{contextHolder}

			{/* Loading 遮罩 */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexDirection: "column",
					background: "#F8FAFC",
					zIndex: 2,
					opacity: loading ? 1 : 0,
					pointerEvents: loading ? "auto" : "none",
					transition: "opacity 0.4s ease-out", // 优化：平滑过渡
				}}>
				<Spin size="large" />
				<span style={{ marginTop: 12, color: "#64748b", fontSize: "12px" }}>正在加载地理数据...</span>
			</div>

			<div
				ref={containerRef}
				style={{
					width: "100%",
					height: "100%",
					willChange: "transform", // 优化：提示浏览器优化图层
					background: "#F8FAFC",
				}}
			/>
		</div>
	);
};

export default Map;
