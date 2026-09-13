/** 把数值金额格式化为 ¥ 字符串，如 128 -> ¥128 */
export function formatYuan(amount: number): string {
  return `¥${amount}`;
}
