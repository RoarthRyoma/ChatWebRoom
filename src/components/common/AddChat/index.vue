<script setup lang="ts">
import { computed, reactive } from 'vue'
import { CHAT_FRIENDS, CHAT_GPT, CHAT_NICKNAME_NULL, CHAT_ROOMID_NULL, useChatStore, useUserStore } from '@/store'
import { t } from '@/locales'
import { useSocket } from '@/views/chat/hooks/useSocket'

interface Props {
  visible: boolean
}
interface Emit {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()
const chatStore = useChatStore()
const userStore = useUserStore()
const message = useMessage()

const { emitJoinRoom, onJoinRoomResponse } = useSocket()

const show = computed({
  get: () => props.visible,
  set: (visible: boolean) => emit('update:visible', visible),
})

const form = reactive({
  roomId: '',
  roomName: '',
  nickName: '',
})

function resetForm(form: { roomId: string; roomName: string; nickName: string }) {
  form.roomId = ''
  form.roomName = ''
  form.nickName = ''
}

function handleAddSession() {
  chatStore.addHistory({ title: 'New Chat', uuid: Date.now(), isEdit: false, chatType: CHAT_GPT }, CHAT_GPT, CHAT_ROOMID_NULL, CHAT_NICKNAME_NULL)
  show.value = !show.value
}

function handleAddRoom() {
  const roomId = form.roomId
  const roomName = form.roomName
  const nickName = form.nickName.trim().length === 0 ? userStore.$state.userInfo.name : form.nickName.trim()
  const user = { username: nickName }

  emitJoinRoom(roomId, roomName, user)
  // debugger
  onJoinRoomResponse(handleJoinRoomResponse, nickName)
}

function handleJoinRoomResponse(data: { code: number; roomId: string; roomName: string }, nickName: string) {
  if (data.code === 0) {
    chatStore.addHistory({ title: data.roomName, uuid: Date.now(), isEdit: false, chatType: CHAT_FRIENDS }, CHAT_FRIENDS, data.roomId, nickName)
    show.value = !show.value
    resetForm(form)
    message.success(t('chat.createOrJoinRoomSuccess'))
  }
  else {
    message.error(t('chat.createOrJoinRoomFailed'))
  }
}
</script>

<template>
  <NModal
    v-model:show="show" style="width: 30%; max-width: 300px;" preset="card"
  >
    <div class="space-y-4">
      <NTabs type="segment">
        <NTabPane name="ChatGPT" :tab="$t('chat.withGPT')">
          <NButton block type="info" @click="handleAddSession">
            {{ $t('chat.newSessionButton') }}
          </NButton>
        </NTabPane>
        <NTabPane name="Online" :tab="$t('chat.withOnline')">
          <NForm :model:value="form" label-width="100px">
            <NFormItem :label="$t('chat.labelRoomId')">
              <NInput v-model:value="form.roomId" />
            </NFormItem>
            <NFormItem :label="$t('chat.labelRoomName')">
              <NInput v-model:value="form.roomName" />
            </NFormItem>
            <NFormItem :label="$t('chat.labelNickName')">
              <NInput v-model:value="form.nickName" />
            </NFormItem>
            <NButton block type="success" @click="handleAddRoom">
              {{ $t('chat.newRoomButton') }}
            </NButton>
          </NForm>
        </NTabPane>
      </NTabs>
    </div>
  </NModal>
</template>
