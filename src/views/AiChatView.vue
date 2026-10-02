<template>
  <div class="page-shell">
    <div class="page-heading">
      <div><h1 class="page-title">AI 助手</h1><p class="page-subtitle">面向景区运维的智能问答，仅提供辅助建议，不参与业务流程和状态流转。</p></div>
      <el-button type="primary" :icon="Plus" @click="newConversation">新建会话</el-button>
    </div>

    <div class="ai-body">
      <aside class="panel session-panel">
        <div class="session-head">会话列表</div>
        <div v-loading="loadingConversations" class="session-list">
          <div v-for="item in conversations" :key="item.id" class="session-item" :class="{ active: item.id === currentId }" @click="selectConversation(item.id!)">
            <div class="session-title">{{ item.title || '新对话' }}</div>
            <div class="session-meta">{{ item.model || '默认模型' }} · {{ formatTime(item.createTime) }}</div>
            <el-button link type="danger" class="session-del" @click.stop="removeConversation(item)">删除</el-button>
          </div>
          <el-empty v-if="!conversations.length" description="暂无会话" :image-size="60" />
        </div>
      </aside>

      <section class="panel chat-panel">
        <div ref="messageRef" v-loading="loadingMessages" class="message-area">
          <div v-if="!messages.length" class="chat-empty">
            <h3>可以这样提问</h3>
            <div class="sample-list">
              <span v-for="item in samples" :key="item" class="sample-item" @click="draft = item">{{ item }}</span>
            </div>
          </div>
          <div v-for="(item, index) in messages" :key="index" class="chat-row" :class="item.role === 'user' ? 'from-user' : 'from-ai'">
            <div class="bubble">
              <div class="bubble-role">{{ item.role === 'user' ? '我' : 'AI 助手' }}</div>
              <div class="bubble-text"><span v-html="renderMarkdown(item.content)"></span><span v-if="streamingIndex === index" class="caret"></span></div>
            </div>
          </div>
        </div>

        <div class="composer">
          <el-input v-model="draft" type="textarea" :rows="3" resize="none" :disabled="!currentId" placeholder="请输入运维相关问题，Enter 发送，Shift+Enter 换行" @keydown="onKeydown" />
          <div class="composer-actions">
            <span class="composer-hint">AI 建议仅供参考，请以系统数据和现场实际情况为准</span>
            <el-button v-if="sending" @click="stopStreaming">停止生成</el-button>
            <el-button type="primary" :disabled="!draft.trim() || !currentId || sending" @click="send">发送</el-button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createConversation, deleteConversation, listConversations, listMessages, streamChat, type AiConversation, type AiMessage } from '@/api/ai'
import { formatTime } from '@/utils/format'
import { renderMarkdown } from '@/utils/markdown'

const conversations = ref<AiConversation[]>([])
const messages = ref<AiMessage[]>([])
const currentId = ref<number>()
const draft = ref('')
const sending = ref(false)
const loadingConversations = ref(false)
const loadingMessages = ref(false)
const streamingIndex = ref(-1)
const messageRef = ref<HTMLElement>()
const samples = [
  '巡检任务逾期了应该怎么处理？',
  '景区护栏类设施的巡检要点有哪些？',
  '工单从派发到关闭的完整流程是什么？'
]
let controller: AbortController | undefined

async function loadConversations() {
  loadingConversations.value = true
  try {
    const result: any = await listConversations()
    conversations.value = result.data || []
  } finally { loadingConversations.value = false }
}

async function selectConversation(id: number) {
  if (sending.value) { ElMessage.warning('请等待当前回复完成'); return }
  currentId.value = id
  loadingMessages.value = true
  try {
    const result: any = await listMessages(id)
    messages.value = result.data || []
  } finally { loadingMessages.value = false }
  await scrollToBottom()
}

async function newConversation() {
  const result: any = await createConversation()
  const conversation = result.data
  if (!conversation?.id) { ElMessage.error('会话创建失败'); return }
  await loadConversations()
  await selectConversation(conversation.id)
}

async function removeConversation(item: AiConversation) {
  await ElMessageBox.confirm(`确定删除会话「${item.title || '新对话'}」及其消息？`, '删除会话', { type: 'warning' })
  await deleteConversation(item.id!)
  if (currentId.value === item.id) { currentId.value = undefined; messages.value = [] }
  await loadConversations()
  if (!currentId.value && conversations.value.length) await selectConversation(conversations.value[0].id!)
}

async function send() {
  const content = draft.value.trim()
  if (!content || !currentId.value || sending.value) return
  messages.value.push({ role: 'user', content })
  const replyIndex = messages.value.push({ role: 'assistant', content: '' }) - 1
  streamingIndex.value = replyIndex
  sending.value = true
  draft.value = ''
  await scrollToBottom()
  controller = new AbortController()
  const conversationId = currentId.value
  try {
    await streamChat(conversationId, content, {
      onToken: text => {
        messages.value[replyIndex].content += text
        scrollToBottom()
      },
      onDone: () => { streamingIndex.value = -1 },
      onError: message => {
        streamingIndex.value = -1
        messages.value[replyIndex].content = messages.value[replyIndex].content || `（AI 服务暂时不可用：${message}）`
        ElMessage.error(message)
      }
    }, controller.signal)
  } finally {
    sending.value = false
    streamingIndex.value = -1
    controller = undefined
    const result: any = await listMessages(conversationId)
    messages.value = result.data || messages.value
    await loadConversations()
    await scrollToBottom()
  }
}

function stopStreaming() { controller?.abort(); ElMessage.info('已停止生成') }

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messageRef.value) messageRef.value.scrollTop = messageRef.value.scrollHeight
}

onMounted(async () => {
  await loadConversations()
  if (conversations.value.length) await selectConversation(conversations.value[0].id!)
  else await newConversation()
})
onBeforeUnmount(() => controller?.abort())
</script>

<style scoped>
.ai-body { display: grid; grid-template-columns: 280px 1fr; gap: 16px; }
.session-panel { display: flex; flex-direction: column; overflow: hidden; }
.session-head { padding: 14px 16px; font-weight: 700; border-bottom: 1px solid var(--ops-border); }
.session-list { flex: 1; overflow-y: auto; padding: 10px; max-height: 620px; }
.session-item { position: relative; padding: 12px 14px; margin-bottom: 8px; border-radius: 12px; border: 1px solid transparent; cursor: pointer; transition: background .2s, border-color .2s; }
.session-item:hover { background: #f8fafc; }
.session-item.active { background: #f0fdfa; border-color: #99f6e4; }
.session-title { font-size: 13px; font-weight: 600; padding-right: 34px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-meta { margin-top: 6px; color: var(--ops-muted); font-size: 11px; }
.session-del { position: absolute; top: 10px; right: 8px; }
.chat-panel { display: flex; flex-direction: column; overflow: hidden; }
.message-area { flex: 1; min-height: 420px; max-height: 560px; overflow-y: auto; padding: 18px; background: #fbfdff; }
.chat-empty { padding: 40px 20px; text-align: center; }
.chat-empty h3 { margin: 0 0 18px; font-size: 15px; color: var(--ops-muted); font-weight: 600; }
.sample-list { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.sample-item { padding: 10px 16px; border: 1px dashed var(--ops-border); border-radius: 10px; color: var(--ops-primary); font-size: 13px; cursor: pointer; }
.sample-item:hover { background: #f0fdfa; border-color: #99f6e4; }
.chat-row { display: flex; margin-bottom: 16px; }
.chat-row.from-user { justify-content: flex-end; }
.bubble { max-width: 76%; padding: 12px 14px; border-radius: 14px; background: #fff; border: 1px solid var(--ops-border); box-shadow: 0 4px 14px rgba(15,23,42,.04); }
.from-user .bubble { background: #0f766e; border-color: #0f766e; color: #fff; }
.bubble-role { font-size: 11px; opacity: .75; margin-bottom: 6px; }
.bubble-text { font-size: 13px; line-height: 1.8; white-space: normal; word-break: break-word; }
.bubble-text :deep(p) { margin: 0 0 6px; }
.bubble-text :deep(p:last-child) { margin-bottom: 0; }
.bubble-text :deep(ul) { margin: 4px 0 8px; padding-left: 20px; }
.bubble-text :deep(li) { margin: 2px 0; }
.bubble-text :deep(h2), .bubble-text :deep(h3), .bubble-text :deep(h4) { margin: 8px 0 6px; line-height: 1.4; }
.bubble-text :deep(code) { padding: 1px 5px; border-radius: 5px; background: #f1f5f9; color: #0f766e; font-size: 12px; }
.from-user .bubble-text :deep(code) { background: rgba(255,255,255,.16); color: #fff; }
.caret { display: inline-block; width: 6px; height: 14px; margin-left: 2px; vertical-align: -2px; background: currentColor; animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }
.composer { border-top: 1px solid var(--ops-border); padding: 14px 16px; background: #fff; }
.composer-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.composer-hint { margin-right: auto; color: var(--ops-muted); font-size: 11px; }
@media (max-width: 1100px) { .ai-body { grid-template-columns: 1fr; } .session-list { max-height: 240px; } }
</style>