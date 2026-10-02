import http, { TOKEN_KEY } from './http'

export interface AiConversation {
  id?: number
  title?: string
  model?: string
  status?: number
  createTime?: string
}

export interface AiMessage {
  id?: number
  conversationId?: number
  role?: string
  content?: string
  tokens?: number
  createTime?: string
}

export interface ChatStreamHandlers {
  onToken: (text: string) => void
  onDone: () => void
  onError: (message: string) => void
}

export const listConversations = () => http.get<AiConversation[]>('/ai/chat/conversations')
export const createConversation = (model?: string) =>
  http.post('/ai/chat/conversations', null, { params: model ? { model } : {} })
export const renameConversation = (id: number, title: string) =>
  http.put(`/ai/chat/conversations/${id}/title`, null, { params: { title } })
export const deleteConversation = (id: number) => http.delete(`/ai/chat/conversations/${id}`)
export const listMessages = (id: number) => http.get<AiMessage[]>(`/ai/chat/conversations/${id}/messages`)

/**
 * 以流式方式发送消息。
 *
 * 后端使用 SSE 推送 token，但原生 EventSource 无法携带 Authorization 头，
 * 因此这里用 fetch 读取响应流并手动解析 SSE 事件。
 */
export async function streamChat(
  conversationId: number,
  message: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY)
  const base = import.meta.env.VITE_API_BASE as string
  const url = `${base}/ai/chat/stream?conversationId=${conversationId}&message=${encodeURIComponent(message)}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal
    })
  } catch (error) {
    handlers.onError(error instanceof Error ? error.message : '无法连接 AI 服务')
    return
  }
  if (!response.ok || !response.body) {
    handlers.onError(`AI 服务返回异常状态：${response.status}`)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false
  try {
    while (!finished) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''
      for (const block of blocks) {
        let eventName = 'message'
        const dataLines: string[] = []
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
        }
        const data = dataLines.join('\n')
        if (eventName === 'done') {
          finished = true
          handlers.onDone()
          break
        }
        if (eventName === 'error') {
          finished = true
          handlers.onError(data || 'AI 服务异常')
          break
        }
        if (eventName === 'message' && data) handlers.onToken(data)
      }
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      handlers.onError(error instanceof Error ? error.message : '流式读取失败')
    }
  } finally {
    if (!finished) handlers.onDone()
  }
}