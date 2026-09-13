// 高德地图 URI API：https://lbs.amap.com/api/uri-api/gettingstarted
//   marker    —— 按经纬度打点
//   callnative=1 —— 移动端尝试唤起高德地图 App，未安装 / PC 端自动落网页版
//   coordinate=gaode —— 传入的是 GCJ-02（高德）坐标

/** 调用方来源标识，便于高德侧统计 */
const SRC = "cqlocal";

/**
 * 生成「在高德地图中查看该地点」的链接。
 *
 * @param lng 经度（GCJ-02）
 * @param lat 纬度（GCJ-02）
 * @param name 打点显示名称，一般为商户/活动名
 * @returns 无有效坐标时返回 null（调用方应隐藏入口）
 */
export function buildAmapMarkerUrl(
  lng: number | null | undefined,
  lat: number | null | undefined,
  name?: string,
): string | null {
  if (
    typeof lng !== "number" ||
    typeof lat !== "number" ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat)
  ) {
    return null;
  }

  // URLSearchParams 会把空格编码成 "+"，这里统一用 encodeURIComponent，
  // 保证 name 里的中文 / 空格在高德侧解析一致
  const parts = [
    `position=${encodeURIComponent(`${lng},${lat}`)}`,
    `src=${encodeURIComponent(SRC)}`,
    "coordinate=gaode",
    "callnative=1",
  ];
  if (name) parts.push(`name=${encodeURIComponent(name)}`);

  return `https://uri.amap.com/marker?${parts.join("&")}`;
}
