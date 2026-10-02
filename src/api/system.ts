import http from './http'

export interface PageResult<T> {
  rows: T[]
  total: number
}

export interface Task {
  taskId?: number
  taskNo?: string
  taskName?: string
  taskType?: string
  cronExpression?: string
  routeId?: number
  routeName?: string
  assigneeId?: number
  assigneeName?: string
  taskStatus?: string
  plannedTime?: string
  actualTime?: string
  deadline?: string
  createTime?: string
  remark?: string
}

export interface Ticket {
  ticketId?: number
  ticketNo?: string
  recordId?: number
  recordNo?: string
  facilityId?: number
  facilityName?: string
  facilityArea?: string
  facilityLocation?: string
  issueDesc?: string
  faultKey?: string
  faultTypeName?: string
  priority?: string
  reporterId?: number
  reporterName?: string
  assigneeId?: number
  assigneeName?: string
  ticketStatus?: string
  assignTime?: string
  closeReason?: string
  deadline?: string
  completeTime?: string
  createTime?: string
  updateTime?: string
  remark?: string
}

export interface Facility {
  facilityId?: number
  facilityName?: string
  facilityCode?: string
  qrCode?: string
  categoryId?: number
  categoryName?: string
  createByName?: string
  area?: string
  location?: string
  latitude?: number
  longitude?: number
  facilityStatus?: string
  description?: string
}

export interface RouteFacilityRel {
  relId?: number
  routeId?: number
  facilityId?: number
  sortOrder?: number
  facilityCode?: string
  facilityName?: string
}

export interface TaskFacility {
  taskFacilityId?: number
  taskId?: number
  facilityId?: number
  sortOrder?: number
  inspectionStatus?: string
  recordId?: number
  facilityCode?: string
  facilityName?: string
  facilityArea?: string
  facilityLocation?: string
  qrCode?: string
}

export interface RouteInfo {
  routeId?: number
  routeNo?: string
  routeName?: string
  routeDesc?: string
  routeStatus?: string
  tydRouteFacilityRelList?: RouteFacilityRel[]
}

export interface Plan {
  planId?: number
  planName?: string
  routeId?: number
  routeName?: string
  taskName?: string
  cronExpression?: string
  assigneeId?: number
  assigneeName?: string
  startTime?: string
  endTime?: string
  enabled?: string
  nextFireTime?: string
  lastGenerateTime?: string
}

export interface BusinessLog {
  logId?: number
  businessType?: string
  businessId?: number
  businessNo?: string
  action?: string
  fromStatus?: string
  toStatus?: string
  operatorId?: number
  operatorName?: string
  operatorNickName?: string
  reason?: string
  createTime?: string
}

export interface MessageInfo {
  messageId?: number
  title?: string
  content?: string
  messageType?: string
  businessType?: string
  businessId?: number
  senderId?: number
  receiverId?: number
  isRead?: string
  readTime?: string
  createByName?: string
  senderName?: string
  receiverName?: string
  createTime?: string
}

export const login = (data: Record<string, unknown>) => http.post('/login', data)
export const logout = () => http.post('/logout')
export const getInfo = () => http.get('/getInfo')
export const getCaptcha = () => http.get('/captchaImage')

export const listTasks = (params: Record<string, unknown>) => http.get<PageResult<Task>>('/system/task/list', { params })
export const getTask = (id: number) => http.get(`/system/task/${id}`)
export const getTaskFacilities = (id: number) => http.get(`/system/task/${id}/facilities`)
export const addTask = (data: Task) => http.post('/system/task', data)
export const updateTask = (data: Task) => http.put('/system/task', data)
export const closeTask = (id: number, reason: string) => http.put(`/system/task/close/${id}`, { reason })

export const listTickets = (params: Record<string, unknown>) => http.get<PageResult<Ticket>>('/system/ticket/list', { params })
export const getTicket = (id: number) => http.get(`/system/ticket/${id}`)
export const updateTicket = (data: Ticket) => http.put('/system/ticket', data)
export const closeTicket = (id: number, reason: string) => http.put(`/system/ticket/close/${id}`, { reason })

export const listFacilities = (params: Record<string, unknown>) => http.get<PageResult<Facility>>('/system/facility/list', { params })
export const addFacility = (data: Facility) => http.post('/system/facility', data)
export const updateFacility = (data: Facility) => http.put('/system/facility', data)
export const regenerateQrCode = (id: number) => http.post(`/system/facility/qrcode/${id}`)
export const deleteFacility = (id: number) => http.delete(`/system/facility/${id}`)

export const listRoutes = (params: Record<string, unknown>) => http.get<PageResult<RouteInfo>>('/system/route/list', { params })
export const addRoute = (data: RouteInfo) => http.post('/system/route', data)
export const updateRoute = (data: RouteInfo) => http.put('/system/route', data)
export const getRoute = (id: number) => http.get(`/system/route/${id}`)
export const deleteRoute = (ids: number | number[]) => http.delete(`/system/route/${Array.isArray(ids) ? ids.join(',') : ids}`)

export const listPlans = (params: Record<string, unknown>) => http.get<PageResult<Plan>>('/system/plan/list', { params })
export const getPlanStatusCounts = (params: Record<string, unknown>) => http.get<Record<string, number>>('/system/plan/statusCounts', { params })
export const addPlan = (data: Plan) => http.post('/system/plan', data)
export const updatePlan = (data: Plan) => http.put('/system/plan', data)
export const deletePlan = (ids: number | number[]) => http.delete(`/system/plan/${Array.isArray(ids) ? ids.join(',') : ids}`)

export const listBusinessLogs = (params: Record<string, unknown>) => http.get<PageResult<BusinessLog>>('/system/businessLog/list', { params })
export const getBusinessTimeline = (businessType: string, businessId: number) =>
  http.get<BusinessLog[]>(`/system/businessLog/timeline/${businessType}/${businessId}`)
export const listMessages = (params: Record<string, unknown>) => http.get<PageResult<MessageInfo>>('/system/message/list', { params })
export const listUsers = (params: Record<string, unknown>) => http.get<PageResult<Record<string, any>>>('/system/user/list', { params })
export interface UserOption {
  userId: number
  userName: string
  nickName: string
}

export const listUserOptions = (params: Record<string, unknown>) => http.get<UserOption[]>('/system/user/options', { params })

export interface RepairProcess {
  processId?: number
  ticketId?: number
  ticketNo?: string
  handlerId?: number
  handlerName?: string
  createByName?: string
  repairTime?: string
  repairResult?: string
  recordType?: string
  description?: string
}

export interface FacilityCategory {
  categoryId?: number
  categoryName?: string
  categoryCode?: string
  categoryStatus?: string
  orderNum?: number
}

export interface NameValue {
  name?: string
  value?: number
}

export interface MonthlyRecord {
  month?: string
  normal?: number
  abnormal?: number
}

export interface MonthlyAbnormalRate {
  month?: string
  rate?: number
}

export interface StatisticsOverview {
  facilityCount?: number
  facilityFault?: number
  pendingTicket?: number
  completedTicket?: number
  closedTicket?: number
  totalTicket?: number
  runningTask?: number
  recentTickets?: Ticket[]
  todayRecord?: number
  facilityStatus?: NameValue[]
  facilityArea?: NameValue[]
  monthlyRecord?: MonthlyRecord[]
  ticketStatus?: NameValue[]
  priority?: NameValue[]
  repairResult?: NameValue[]
  repairProcessResult?: NameValue[]
  inspectorWorkload?: NameValue[]
  repairerWorkload?: NameValue[]
  repairerCurrentLoad?: NameValue[]
  faultFacilityTop10?: NameValue[]
  monthlyAbnormalRate?: MonthlyAbnormalRate[]
}

export const listRepairProcesses = (params: Record<string, unknown>) => http.get<PageResult<RepairProcess>>('/system/process/list', { params })
export const markMessageRead = (messageId: number) => http.put('/system/message/read', { messageId })
export const getStatisticsOverview = () => http.get<StatisticsOverview>('/system/statistics/overview')
export const listFacilityCategories = (params: Record<string, unknown>) => http.get<PageResult<FacilityCategory>>('/system/category/list', { params })
export const addFacilityCategory = (data: FacilityCategory) => http.post('/system/category', data)
export const updateFacilityCategory = (data: FacilityCategory) => http.put('/system/category', data)
export const deleteFacilityCategory = (ids: number | number[]) =>
  http.delete(`/system/category/${Array.isArray(ids) ? ids.join(',') : ids}`)

export interface Attachment {
  attachmentId?: number
  relatedType?: string
  relatedId?: number
  fileName?: string
  fileUrl?: string
  filePath?: string
  fileSize?: number
  fileType?: string
  createTime?: string
}

export const listAttachments = (relatedType: string, relatedId: number) =>
  http.get<Attachment[]>('/system/attachment/related', { params: { relatedType, relatedId } })

export interface InspectionRecord {
  recordId?: number
  recordNo?: string
  taskId?: number
  taskNo?: string
  facilityId?: number
  facilityName?: string
  inspectorId?: number
  inspectorName?: string
  createByName?: string
  inspectionTime?: string
  facilityStatus?: string
  hasIssue?: string
  description?: string
  issueDesc?: string
  qrVerified?: string
  locationVerified?: string
  locationDistance?: number
  scanTime?: string
}

export const listRecords = (params: Record<string, unknown>) => http.get<PageResult<InspectionRecord>>('/system/record/list', { params })
export const getRecord = (id: number) => http.get<InspectionRecord>(`/system/record/${id}`)
