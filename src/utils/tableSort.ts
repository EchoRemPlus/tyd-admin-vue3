export interface TableSortChange {
  prop?: string
  order?: 'ascending' | 'descending' | null
}

/**
 * 把 Element Plus 的排序事件转换成 RuoYi 分页参数。
 * 取消排序时移除参数，后端会恢复列表默认顺序。
 */
export function applyTableSort<T extends object>(query: T, change: TableSortChange) {
  const target = query as Record<string, unknown>
  if (change.prop && change.order) {
    target.orderByColumn = change.prop
    target.isAsc = change.order === 'ascending' ? 'asc' : 'desc'
    return
  }
  delete target.orderByColumn
  delete target.isAsc
}
