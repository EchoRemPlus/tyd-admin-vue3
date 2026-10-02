const escapeHtml = (text: string) => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const renderInline = (text: string) => text
  .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')

/** AI 回复的最小 Markdown 渲染：先转义 HTML，再支持标题、列表、加粗、斜体和行内代码。 */
export function renderMarkdown(source?: string) {
  if (!source) return ''
  const lines = escapeHtml(source).split(/\r?\n/)
  const html: string[] = []
  let inList = false

  const closeList = () => {
    if (inList) { html.push('</ul>'); inList = false }
  }

  for (const line of lines) {
    const listItem = line.match(/^\s*[-*]\s+(.+)$/)
    if (listItem) {
      if (!inList) { html.push('<ul>'); inList = true }
      html.push('<li>' + renderInline(listItem[1]) + '</li>')
      continue
    }
    closeList()
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length + 1
      html.push('<h' + level + '>' + renderInline(heading[2]) + '</h' + level + '>')
    } else if (!line.trim()) {
      html.push('<br>')
    } else {
      html.push('<p>' + renderInline(line) + '</p>')
    }
  }
  closeList()
  return html.join('')
}
