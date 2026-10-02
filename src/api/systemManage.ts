import http from './http'

export interface SysUser {
  userId?: number
  userName?: string
  nickName?: string
  deptId?: number
  dept?: { deptId?: number; deptName?: string }
  phonenumber?: string
  email?: string
  sex?: string
  status?: string
  password?: string
  roleIds?: number[]
  createTime?: string
  remark?: string
}

export interface SysRole {
  roleId?: number
  roleName?: string
  roleKey?: string
  roleSort?: number
  status?: string
  menuIds?: number[]
  createTime?: string
  remark?: string
}

export interface TreeNode {
  id?: number
  label?: string
  children?: TreeNode[]
}

export interface PageResult<T> {
  rows: T[]
  total: number
}

/* ------------------------------ 用户管理 ------------------------------ */

export const listSysUsers = (params: Record<string, unknown>) => http.get<PageResult<SysUser>>('/system/user/list', { params })
export const getSysUser = (userId: number) => http.get(`/system/user/${userId}`)
export const addSysUser = (data: SysUser) => http.post('/system/user', data)
export const updateSysUser = (data: SysUser) => http.put('/system/user', data)
export const deleteSysUsers = (ids: number[]) => http.delete(`/system/user/${ids.join(',')}`)
export const resetUserPwd = (userId: number, password: string) => http.put('/system/user/resetPwd', { userId, password })
export const changeUserStatus = (userId: number, status: string) => http.put('/system/user/changeStatus', { userId, status })
export const getDeptTree = () => http.get<TreeNode[]>('/system/user/deptTree')

/* ------------------------------ 角色管理 ------------------------------ */

export const listSysRoles = (params: Record<string, unknown>) => http.get<PageResult<SysRole>>('/system/role/list', { params })
export const getSysRole = (roleId: number) => http.get(`/system/role/${roleId}`)
export const addSysRole = (data: SysRole) => http.post('/system/role', data)
export const updateSysRole = (data: SysRole) => http.put('/system/role', data)
export const deleteSysRoles = (ids: number[]) => http.delete(`/system/role/${ids.join(',')}`)
export const changeRoleStatus = (roleId: number, status: string) => http.put('/system/role/changeStatus', { roleId, status })

/* ------------------------------ 菜单权限 ------------------------------ */

export const getMenuTree = () => http.get<TreeNode[]>('/system/menu/treeselect')
export interface RoleMenuTree {
  menus: TreeNode[]
  checkedKeys: number[]
}

export const getRoleMenuTree = (roleId: number) =>
  http.get<RoleMenuTree>(`/system/menu/roleMenuTreeselect/${roleId}`)

/* ------------------------------ 部门管理 ------------------------------ */

export interface SysDept {
  deptId?: number
  parentId?: number
  ancestors?: string
  deptName?: string
  orderNum?: number
  leader?: string
  phone?: string
  email?: string
  status?: string
  children?: SysDept[]
}

export const listSysDepts = (params: Record<string, unknown>) => http.get<SysDept[]>('/system/dept/list', { params })
export const getSysDept = (deptId: number) => http.get(`/system/dept/${deptId}`)
export const addSysDept = (data: SysDept) => http.post('/system/dept', data)
export const updateSysDept = (data: SysDept) => http.put('/system/dept', data)
export const deleteSysDept = (deptId: number) => http.delete(`/system/dept/${deptId}`)

/* ------------------------------ 岗位管理 ------------------------------ */

export interface SysPost {
  postId?: number
  postCode?: string
  postName?: string
  postSort?: number
  status?: string
  createTime?: string
  remark?: string
}

export const listSysPosts = (params: Record<string, unknown>) => http.get<PageResult<SysPost>>('/system/post/list', { params })
export const getSysPost = (postId: number) => http.get(`/system/post/${postId}`)
export const addSysPost = (data: SysPost) => http.post('/system/post', data)
export const updateSysPost = (data: SysPost) => http.put('/system/post', data)
export const deleteSysPosts = (ids: number[]) => http.delete(`/system/post/${ids.join(',')}`)

/* ------------------------------ 菜单管理 ------------------------------ */

export interface SysMenu {
  menuId?: number
  parentId?: number
  menuName?: string
  orderNum?: number
  path?: string
  component?: string
  query?: string
  isFrame?: string
  isCache?: string
  menuType?: string
  visible?: string
  status?: string
  perms?: string
  icon?: string
  children?: SysMenu[]
}

export const listSysMenus = (params: Record<string, unknown>) => http.get<SysMenu[]>('/system/menu/list', { params })
export const getSysMenu = (menuId: number) => http.get(`/system/menu/${menuId}`)
export const addSysMenu = (data: SysMenu) => http.post('/system/menu', data)
export const updateSysMenu = (data: SysMenu) => http.put('/system/menu', data)
export const deleteSysMenu = (menuId: number) => http.delete(`/system/menu/${menuId}`)

/* ------------------------------ 字典管理 ------------------------------ */

export interface SysDictType {
  dictId?: number
  dictName?: string
  dictType?: string
  status?: string
  createTime?: string
  remark?: string
}

export interface SysDictData {
  dictCode?: number
  dictSort?: number
  dictLabel?: string
  dictValue?: string
  dictType?: string
  listClass?: string
  isDefault?: string
  status?: string
  remark?: string
}

export const listSysDictTypes = (params: Record<string, unknown>) => http.get<PageResult<SysDictType>>('/system/dict/type/list', { params })
export const addSysDictType = (data: SysDictType) => http.post('/system/dict/type', data)
export const updateSysDictType = (data: SysDictType) => http.put('/system/dict/type', data)
export const deleteSysDictTypes = (ids: number[]) => http.delete(`/system/dict/type/${ids.join(',')}`)

export const listSysDictData = (params: Record<string, unknown>) => http.get<PageResult<SysDictData>>('/system/dict/data/list', { params })
export const addSysDictData = (data: SysDictData) => http.post('/system/dict/data', data)
export const updateSysDictData = (data: SysDictData) => http.put('/system/dict/data', data)
export const deleteSysDictData = (ids: number[]) => http.delete(`/system/dict/data/${ids.join(',')}`)

/* ------------------------------ 操作日志与登录日志 ------------------------------ */

export interface OperLog {
  operId?: number
  title?: string
  businessType?: number
  method?: string
  requestMethod?: string
  operName?: string
  operUrl?: string
  operIp?: string
  operLocation?: string
  status?: number
  errorMsg?: string
  operTime?: string
  costTime?: number
}

export interface LoginLog {
  infoId?: number
  userName?: string
  ipaddr?: string
  loginLocation?: string
  browser?: string
  os?: string
  status?: string
  msg?: string
  loginTime?: string
}

export const listOperLogs = (params: Record<string, unknown>) => http.get<PageResult<OperLog>>('/monitor/operlog/list', { params })
export const deleteOperLogs = (ids: number[]) => http.delete(`/monitor/operlog/${ids.join(',')}`)
export const cleanOperLogs = () => http.delete('/monitor/operlog/clean')

export const listLoginLogs = (params: Record<string, unknown>) => http.get<PageResult<LoginLog>>('/monitor/logininfor/list', { params })
export const deleteLoginLogs = (ids: number[]) => http.delete(`/monitor/logininfor/${ids.join(',')}`)
export const cleanLoginLogs = () => http.delete('/monitor/logininfor/clean')
export const unlockAccount = (userName: string) => http.get(`/monitor/logininfor/unlock/${userName}`)