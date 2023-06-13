<script lang="ts" setup>
import { computed, onMounted, onUnmounted, onUpdated, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import mila from 'markdown-it-link-attributes'
import hljs from 'highlight.js'
import { MdPreview } from 'md-editor-v3'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { copyToClip } from '@/utils/copy'
import { useAppStore } from '@/store'

interface Props {
  inversion?: boolean
  error?: boolean
  text?: string
  loading?: boolean
  asRawText?: boolean
}

const props = defineProps<Props>()

const appStore = useAppStore()
const { isMobile } = useBasicLayout()

const theme = computed(() => appStore.theme === 'auto' ? 'light' : appStore.theme)
const textRef = ref<HTMLElement>()
const id = 'preview-only'

const mdi = new MarkdownIt({
  html: false,
  linkify: true,
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlight(code, { language: lang }).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  },
})

mdi.use(mila, { attrs: { target: '_blank', rel: 'noopener' } })
mdi.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })

const wrapClass = computed(() => {
  return [
    'text-wrap',
    'min-w-[20px]',
    'rounded-md',
    isMobile.value ? 'p-2' : 'px-3 py-2',
    props.inversion ? 'bg-[#d2f9d1]' : 'bg-[#f4f6f8]',
    props.inversion ? 'dark:bg-[#2d3339]' : 'dark:bg-[#1e1e20]', // 'dark:bg-[#a1dc95]' : 'dark:bg-[#1e1e20]'
    props.inversion ? 'message-request' : 'message-reply',
    { 'text-red-500': props.error },
  ]
})

const wrapMdPreviewClass = computed(() => {
  let res: string
  if (appStore.theme === 'light' || appStore.theme === 'auto')
    res = `${props.inversion ? 'light-bg-true' : 'light-bg-false'}`

  else
    res = `${props.inversion ? 'dark:bg-[#2d3339]' : 'dark:bg-[#1e1e20]'}`

  return res
})

const text = computed(() => {
  const value = props.text ?? ''
  // if (!props.asRawText)
  //   return mdi.render(value)
  return value
})

function highlightBlock(str: string, lang?: string) {
  return `<pre class="code-block-wrapper"><div class="code-block-header"><span class="code-block-header__lang">${lang}</span><span class="code-block-header__copy">${t('chat.copyCode')}</span></div><code class="hljs code-block-body ${lang}">${str}</code></pre>`
}

function addCopyEvents() {
  if (textRef.value) {
    const copyBtn = textRef.value.querySelectorAll('.code-block-header__copy')
    copyBtn.forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.parentElement?.nextElementSibling?.textContent
        if (code) {
          copyToClip(code).then(() => {
            btn.textContent = '复制成功'
            setTimeout(() => {
              btn.textContent = '复制代码'
            }, 1000)
          })
        }
      })
    })
  }
}

function removeCopyEvents() {
  if (textRef.value) {
    const copyBtn = textRef.value.querySelectorAll('.code-block-header__copy')
    copyBtn.forEach((btn) => {
      btn.removeEventListener('click', () => {})
    })
  }
}

onMounted(() => {
  addCopyEvents()
})

onUpdated(() => {
  addCopyEvents()
})

onUnmounted(() => {
  removeCopyEvents()
})
</script>

<template>
  <div class="text-black" :class="wrapClass">
    <div ref="textRef" class="leading-relaxed break-words">
      <!-- <div v-if="!inversion">
        <div v-if="!asRawText" class="markdown-body" v-html="text" />
        <div v-else class="whitespace-pre-wrap" v-text="text" />
      </div>
      <div v-else class="whitespace-pre-wrap" v-html="text" /> -->
      <!-- <div class="markdown-body" v-html="text" /> -->
      <MdPreview v-if="!asRawText" :class="wrapMdPreviewClass" :editor-id="id" :model-value="text" :theme="theme" />
      <div v-else class="whitespace-pre-wrap" v-text="text" />
      <template v-if="loading">
        <span class="dark:text-white w-[4px] h-[20px] block animate-blink" />
      </template>
    </div>
  </div>
</template>

<style lang="less">
@import url(./style.less);

.md-editor.md-editor-previewOnly .md-editor-preview-wrapper {
  padding: 0;
}
.md-editor.md-editor-previewOnly .md-editor-preview-wrapper article > pre {
  margin: 0;
}
article#preview-only-preview * {
  margin: 0;
  padding: 0;
}
.light-bg-true {
  background-color: #d2f9d1 !important;
}
.light-bg-false {
  background-color: #f4f6f8 !important;
}
</style>
