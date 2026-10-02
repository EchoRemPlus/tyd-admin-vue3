/**
 * 状态可视化色板：列表筛选胶囊、状态标签、行色条共用，
 * 保证巡检任务、设施档案、巡检路线、周期计划四个页面的状态语义一致。
 */
export interface StatusMeta {
  color: string
  bg: string
  border: string
}

export const ALL_TAB_META: StatusMeta = { color: '#0f766e', bg: '#e8f1f0', border: '#b8d5d2' }

/** 待办 / 进行中 / 完成 / 关闭，与 TasksView、工单看板保持一致。 */
export const TASK_STATUS_META: Record<string, StatusMeta> = {
  '0': { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  '1': { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  '2': { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  '3': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1' }
}

/** 设施：正常 / 故障 / 停用。故障用红色单独提示，停用归入关闭色。 */
export const FACILITY_STATUS_META: Record<string, StatusMeta> = {
  '0': { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  '1': { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  '2': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1' }
}

/** 巡检路线：0 启用 / 1 停用。 */
export const ROUTE_STATUS_META: Record<string, StatusMeta> = {
  '0': { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  '1': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1' }
}

/** 周期计划：enabled = 1 启用 / 0 停用，和路线的编码含义相反，注意不要混用。 */
export const PLAN_STATUS_META: Record<string, StatusMeta> = {
  '1': { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  '0': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1' }
}

/** 设施分类：0 正常 / 1 停用，与巡检路线编码含义一致。 */
export const CATEGORY_STATUS_META: Record<string, StatusMeta> = {
  '0': { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  '1': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1' }
}

/** 维修工单：0 待派发 / 1 待维修 / 2 维修中 / 3 已完成 / 4 已关闭，与工单看板分栏配色一致。 */
export const TICKET_STATUS_META: Record<string, StatusMeta> = {
  '0': { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  '1': { color: '#0f766e', bg: '#e8f1f0', border: '#99d5cf' },
  '2': { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  '3': { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  '4': { color: '#475569', bg: '#e2e8f0', border: '#cbd5e1' }
}

/** 工单行色条语义，与 TICKET_STATUS_META 一一对应。 */
export const TICKET_TONE: Record<string, RowTone> = {
  '0': 'pending',
  '1': 'waiting',
  '2': 'doing',
  '3': 'done',
  '4': 'closed'
}

/** 行色条语义：pending 待办 / waiting 待维修 / doing 进行中 / done 完成 / danger 异常 / closed 关闭。 */
export type RowTone = 'pending' | 'waiting' | 'doing' | 'done' | 'danger' | 'closed'

export function statusPillStyle(meta?: StatusMeta) {
  const value = meta || TASK_STATUS_META['3']
  return { color: value.color, background: value.bg, borderColor: value.border }
}

export function rowToneClass(tone?: RowTone) {
  return `row-tone-${tone || 'closed'}`
}
