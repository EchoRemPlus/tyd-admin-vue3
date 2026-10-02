import dayjs from 'dayjs'

export const ticketStatusMap: Record<string, string> = {
  '0': '待派发',
  '1': '待维修',
  '2': '维修中',
  '3': '已完成',
  '4': '已关闭'
}

export const ticketStatusType: Record<string, string> = {
  '0': 'warning',
  '1': 'primary',
  '2': 'info',
  '3': 'success',
  '4': 'info'
}

export const taskStatusMap: Record<string, string> = {
  '0': '待执行',
  '1': '执行中',
  '2': '已完成',
  '3': '已关闭'
}

export const facilityStatusMap: Record<string, string> = {
  '0': '正常',
  '1': '故障',
  '2': '停用'
}

export const priorityMap: Record<string, string> = {
  '1': '紧急',
  '2': '普通',
  '3': '较低'
}

export const formatTime = (value?: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'

export const repairResultMap: Record<string, string> = {
  '0': '待处理',
  '1': '已修复',
  '2': '无法修复',
  '3': '需更换'
}

export const logActionMap: Record<string, string> = {
  CREATE: '创建',
  UPDATE: '信息更新',
  ASSIGN: '派发工单',
  ACCEPT: '确认接单',
  REPAIR: '提交维修结果',
  COMPLETE: '任务完成',
  CLOSE: '关闭',
  REPAIR_RETURN: '维修退回待派发',
  RETURN: '退回待派发',
  START: '开始执行',
  SUBMIT: '提交巡检记录',
  SCHEDULE: '周期计划生成任务',
  KEEP_FAULT: '保持故障',
  RESTORE: '设施恢复正常',
  GENERATE: '生成任务实例'
}

/** 业务类型显示名 */
export const businessTypeMap: Record<string, string> = {
  inspectionTask: '巡检任务',
  inspectionRecord: '巡检记录',
  repairTicket: '维修工单',
  facility: '设施状态',
  inspectionPlan: '周期计划'
}

/** 各业务的状态取值含义，用于把审计日志里的状态码翻译成中文 */
const businessStatusMaps: Record<string, Record<string, string>> = {
  inspectionTask: { '0': '待执行', '1': '执行中', '2': '已完成', '3': '已关闭' },
  repairTicket: { '0': '待派发', '1': '待维修', '2': '维修中', '3': '已完成', '4': '已关闭' },
  facility: { '0': '正常', '1': '故障', '2': '停用' },
  inspectionRecord: { '0': '正常', '1': '异常' },
  inspectionPlan: { '0': '停用', '1': '启用' }
}

/** 把审计日志的状态码按业务类型翻译为中文，未知取值原样返回 */
export const businessStatusText = (businessType?: string, code?: string | null) => {
  if (code === null || code === undefined || code === '') return '-'
  const map = businessStatusMaps[businessType || '']
  return map?.[code] || code
}

export const categoryStatusMap: Record<string, string> = {
  '0': '正常',
  '1': '停用'
}
