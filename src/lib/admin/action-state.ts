/** 表单型 Server Action 的统一返回结构（配合 useActionState 使用） */
export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

/** 初始状态：未提交、无提示 */
export const IDLE_STATE: ActionState = { ok: false };
