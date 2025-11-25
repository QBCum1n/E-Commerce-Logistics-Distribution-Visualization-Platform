import type { CSSProperties, HTMLAttributes, RefObject } from 'react';
import { cn } from '@/utils/cn';

export interface IconfontProps extends HTMLAttributes<HTMLElement> {
  /**
   * 图标名称，例如：'icon-home', 'icon-user' 等
   */
  name: string;
  /**
   * 图标尺寸，可以是数字（px）或字符串（'12px', '1rem' 等）
   */
  size?: number | string;
  /**
   * 图标颜色
   */
  color?: string;
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * Iconfont 图标组件
 *
 * @example
 * ```tsx
 * // 基础用法
 * <Iconfont name="icon-home" />
 *
 * // 自定义尺寸和颜色
 * <Iconfont name="icon-user" size={20} color="#1890ff" />
 *
 * // 使用 Tailwind CSS 类名
 * <Iconfont name="icon-setting" className="text-blue-500 text-xl" />
 *
 * // 使用内联样式
 * <Iconfont
 *   name="icon-heart"
 *   style={{ fontSize: '24px', color: '#f56565' }}
 * />
 * ```
 */
function Iconfont({ ref, name, size, color, className, style, ...props }: IconfontProps & { ref?: RefObject<HTMLElement | null> }) {
  const iconStyle: CSSProperties = {
    ...style,
    ...(size && {
      fontSize: typeof size === 'number' ? `${size}px` : size,
      width: typeof size === 'number' ? `${size}px` : size,
      height: typeof size === 'number' ? `${size}px` : size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    ...(color && { color }),
  };

  return (
    <i
      ref={ref}
      className={cn('iconfont cursor-pointer', name, className)}
      style={iconStyle}
      {...props}
    />
  );
}

Iconfont.displayName = 'Iconfont';

export default Iconfont;
