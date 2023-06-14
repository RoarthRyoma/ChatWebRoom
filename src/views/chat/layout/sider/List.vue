<script setup lang='ts'>
import { computed } from 'vue'
import { NInput, NPopconfirm, NScrollbar } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { CHAT_FRIENDS, CHAT_GPT, useAppStore, useChatStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { debounce } from '@/utils/functions/debounce'
import { t } from '@/locales'
import socket from '@/utils/request/socket'
import { copyToClip } from '@/utils/copy'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const chatStore = useChatStore()
const message = useMessage()

const dataSources = computed(() => chatStore.history)

async function handleSelect({ uuid }: Chat.History) {
  if (isActive(uuid))
    return

  if (chatStore.active)
    chatStore.updateHistory(chatStore.active, { isEdit: false })
  await chatStore.setActive(uuid)

  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleEdit({ uuid }: Chat.History, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  chatStore.updateHistory(uuid, { isEdit })
}

function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  const chatType = chatStore.$state.chat[index].chatType
  if (chatType === CHAT_FRIENDS) {
    const room = chatStore.$state.chat[index].roomId // 获取要删除的房间id
    const userNickName = chatStore.$state.chat[index].nickName // 获取加入房间时的昵称
    socket.emit('leaveRoom', { roomId: room, nickName: userNickName }) // 发送 leaveRoom 事件
    socket.off('joinRoomResponse') // 移除 joinRoomResponse 事件的监听器
  }
  chatStore.deleteHistory(index)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

const handleDeleteDebounce = debounce(handleDelete, 600)

function handleEnter({ uuid }: Chat.History, isEdit: boolean, event: KeyboardEvent) {
  event?.stopPropagation()
  if (event.key === 'Enter')
    chatStore.updateHistory(uuid, { isEdit })
}

function isActive(uuid: number) {
  return chatStore.active === uuid
}

const copyRoomId = async (index: number) => {
  const roomId = chatStore.$state.chat[index].roomId
  copyToClip(roomId).then(() => {
    message.success(t('common.copySuccess'))
  }).catch((err) => {
    globalThis.console.log('copy failed: ', err)
    message.error(t('common.copyFail'))
  })
}
</script>

<template>
  <NScrollbar class="px-4">
    <div class="flex flex-col gap-2 text-sm">
      <template v-if="!dataSources.length">
        <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
          <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
          <span>{{ $t('common.noData') }}</span>
        </div>
      </template>
      <template v-else>
        <div v-for="(item, index) of dataSources" :key="index">
          <a
            class="flex flex-col gap-1 px-1 py-1 break-all border rounded-md cursor-pointer hover:bg-neutral-100 group dark:border-neutral-800 dark:hover:bg-[#24272e]"
            :class="isActive(item.uuid) && ['border-[#4b9e5f]', 'bg-neutral-100', 'text-[#4b9e5f]', 'dark:bg-[#24272e]', 'dark:border-[#4b9e5f]', 'pr-5']"
            @click="handleSelect(item)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 py-1 pl-2">
                <span>
                  <SvgIcon v-if="item.chatType === CHAT_GPT" icon="ri:message-3-line" />
                  <SvgIcon v-if="item.chatType === CHAT_FRIENDS" icon="ri:discuss-line" />
                </span>
                <div class="relative flex-1 overflow-hidden break-all text-ellipsis whitespace-nowrap">
                  <NInput
                    v-if="item.isEdit"
                    v-model:value="item.title" size="tiny"
                    @keypress="handleEnter(item, false, $event)"
                  />
                  <span v-else>{{ item.title }}</span>
                </div>
              </div>
              <div v-if="isActive(item.uuid)" class="z-10 flex visible right-1">
                <template v-if="item.isEdit">
                  <button class="p-1" @click="handleEdit(item, false, $event)">
                    <SvgIcon icon="ri:save-line" />
                  </button>
                </template>
                <template v-else>
                  <button class="p-1">
                    <SvgIcon icon="ri:edit-line" @click="handleEdit(item, true, $event)" />
                  </button>
                  <NPopconfirm placement="bottom" @positive-click="handleDeleteDebounce(index, $event)">
                    <template #trigger>
                      <button class="p-1">
                        <SvgIcon icon="ri:delete-bin-line" />
                      </button>
                    </template>
                    {{ item.chatType === CHAT_GPT ? $t('chat.deleteHistoryConfirm') : $t('chat.deleteSessionConfirm') }}
                  </NPopconfirm>
                </template>
              </div>
            </div>
            <div v-if="item.chatType === CHAT_FRIENDS" class="flex items-center gap-5 pl-2">
              <SvgIcon icon="ri:profile-line" />
              <NButton quaternary round type="success" @click="copyRoomId(index)">
                {{ $t('common.copyRoomId') }}
              </NButton>
            </div>
          </a>
        </div>
      </template>
    </div>
  </NScrollbar>
</template>
