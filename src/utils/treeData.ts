export interface TreeRecord {
  [key: string]: any
  children?: TreeRecord[]
}

/**
 * Convert a flat parent-child list into a tree while preserving sibling order.
 * Orphaned nodes are kept as roots so filters cannot make records disappear.
 */
export function buildTree<T extends TreeRecord>(list: T[], idKey: string, parentKey: string): T[] {
  const nodes = list.map(item => ({ ...item, children: item.children ? [...item.children] : [] })) as T[]
  const nodeMap = new Map<unknown, T>()
  const roots: T[] = []

  nodes.forEach(node => nodeMap.set(node[idKey], node))
  nodes.forEach(node => {
    const parent = nodeMap.get(node[parentKey])
    if (parent && parent !== node) {
      parent.children = [...(parent.children || []), node]
    } else {
      roots.push(node)
    }
  })
  return roots
}

/**
 * Sort every sibling group recursively. The comparator keeps values with
 * equal keys stable and treats empty values as the smallest values.
 */
export function sortTree<T extends TreeRecord>(nodes: T[], prop: string, order: 'ascending' | 'descending'): T[] {
  const direction = order === 'ascending' ? 1 : -1
  return nodes
    .map(node => ({
      ...node,
      children: node.children?.length ? sortTree(node.children as T[], prop, order) : []
    }))
    .sort((left, right) => compareValues(left[prop], right[prop]) * direction)
}

function compareValues(left: unknown, right: unknown) {
  const leftEmpty = left === null || left === undefined || left === ''
  const rightEmpty = right === null || right === undefined || right === ''
  if (leftEmpty && rightEmpty) return 0
  if (leftEmpty) return -1
  if (rightEmpty) return 1

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }
  return String(left).localeCompare(String(right), 'zh-CN', { numeric: true, sensitivity: 'base' })
}
