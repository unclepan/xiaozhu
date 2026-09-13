import { describe, expect, it } from "vitest";
import { buildAmapMarkerUrl } from "./amap";

describe("buildAmapMarkerUrl", () => {
  it("按经纬度生成高德 marker 链接", () => {
    const url = buildAmapMarkerUrl(106.5516, 29.563, "Hotpot");
    expect(url).toBe(
      "https://uri.amap.com/marker?position=106.5516%2C29.563&src=cqlocal&coordinate=gaode&callnative=1&name=Hotpot",
    );
  });

  it("无名称时省略 name 参数", () => {
    const url = buildAmapMarkerUrl(106.5516, 29.563);
    expect(url).not.toContain("name=");
  });

  it("对名称做 URL 编码", () => {
    const url = buildAmapMarkerUrl(106.5516, 29.563, "A & B 店");
    expect(url).toContain(encodeURIComponent("A & B 店"));
  });

  it("坐标缺失或非法时返回 null", () => {
    expect(buildAmapMarkerUrl(null, null)).toBeNull();
    expect(buildAmapMarkerUrl(undefined, 29.563)).toBeNull();
    expect(buildAmapMarkerUrl(Number.NaN, 29.563)).toBeNull();
  });
});
