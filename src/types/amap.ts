// 高德地图相关类型定义

// 高德地图事件类型
export interface AMapMouseEvent {
  lnglat: {
    getLng(): number;
    getLat(): number;
  };
  stopPropagation(): void;
}

// 高德地图实例
export interface AMapInstance {
  on(event: string, handler: (e: AMapMouseEvent) => void): void;
  off(event: string, handler: (e: AMapMouseEvent) => void): void;
  add<T>(component: T): void;
  remove<T>(component: T): void;
  setFitView(components?: unknown[]): void;
}

// 高德地图组件类型
export interface AMapComponent {
  setPath(path: [number, number][]): void;
}