import type { Locale } from '@/content/chapters'
import { LOCALES } from '@/content/chapters'

export function isLocale(value: string | undefined): value is Locale {
  return value === 'zh' || value === 'en'
}

export { LOCALES }
export type { Locale }

// UI string table. Content prose lives in MDX; this covers chrome only.
const strings = {
  'site.title': { zh: 'Eino 机制图解', en: 'Eino by Mechanism' },
  'site.tagline': {
    zh: '以 ADK 为核心的可视化 Agent 教程',
    en: 'An ADK-centric, visual Agent tutorial',
  },
  'nav.overview': { zh: '总览', en: 'Overview' },
  'nav.chapters': { zh: '章节', en: 'Chapters' },
  'nav.onThisPage': { zh: '本页目录', en: 'On this page' },
  'nav.prev': { zh: '上一章', en: 'Previous' },
  'nav.next': { zh: '下一章', en: 'Next' },
  'nav.sources': { zh: '源码锚点', en: 'Source anchors' },
  'source.preview': { zh: '预览源码', en: 'Preview source' },
  'source.viewOnGithub': { zh: '在 GitHub 打开', en: 'View on GitHub' },
  'source.lines': { zh: '第 {a}–{b} 行 / 共 {n} 行', en: 'Lines {a}–{b} of {n}' },
  'source.close': { zh: '关闭', en: 'Close' },
  'source.copy': { zh: '复制', en: 'Copy' },
  'source.copied': { zh: '已复制', en: 'Copied' },
  'chapter.number': { zh: '第 {n} 章', en: 'Chapter {n}' },
  'status.written': { zh: '已成稿', en: 'Written' },
  'status.placeholder': { zh: '建设中', en: 'In progress' },
  'placeholder.title': { zh: '本章建设中', en: 'This chapter is in progress' },
  'placeholder.body': {
    zh: '本章内容尚在撰写。以下是本章大纲要点与源码锚点，可先据此对照源码阅读。',
    en: 'This chapter is still being written. Below are its outline and source anchors to read against.',
  },
  'viz.step': { zh: '步骤', en: 'Step' },
  'viz.play': { zh: '播放', en: 'Play' },
  'viz.pause': { zh: '暂停', en: 'Pause' },
  'viz.prev': { zh: '上一步', en: 'Prev' },
  'viz.next': { zh: '下一步', en: 'Next' },
  'viz.reset': { zh: '重置', en: 'Reset' },
  'landing.cta': { zh: '开始学习', en: 'Start learning' },
  'landing.redline': { zh: '贯穿全书的设计红线', en: 'Design threads across the book' },
  'landing.parts': { zh: '五个部分', en: 'Five parts' },
  'landing.hero.badge': { zh: 'CloudWeGo Eino · v0.9', en: 'CloudWeGo Eino · v0.9' },
  'landing.hero.lead': {
    zh: '不背 API，而是看清机制。用可交互的动画拆解 Eino 的 Agent 设计哲学——从 ADK 的使用、设计到实现，再下沉到支撑它的编排引擎。',
    en: 'Learn the mechanisms, not just the API. Interactive animations unpack Eino’s Agent design philosophy — from using, designing and implementing the ADK, down to the engine beneath it.',
  },
  'landing.hero.ctaSources': { zh: '对照源码', en: 'Read the source' },
  'landing.threads.title': { zh: '四条设计红线', en: 'Four design threads' },
  'landing.threads.subtitle': {
    zh: '它们在不同章节反复出现，是理解 Eino 的钥匙。',
    en: 'They recur across chapters — the keys to understanding Eino.',
  },
  'landing.outline.title': { zh: '学习路线', en: 'The learning path' },
  'landing.viz.title': { zh: '五个旗舰可交互演示', en: 'Five flagship interactive demos' },
  'landing.viz.subtitle': {
    zh: '每个演示都对应一章正文，并直接锚定 Eino 源码。',
    en: 'Each maps to a chapter and anchors straight into the Eino source.',
  },
  'landing.chapterCount': { zh: '{n} 章', en: '{n} chapters' },
  'landing.viewChapter': { zh: '查看章节', en: 'View chapter' },
  'theme.toggle': { zh: '切换主题', en: 'Toggle theme' },
  'lang.toggle': { zh: 'EN', en: '中文' },
} as const

export type StringKey = keyof typeof strings

export function t(locale: Locale, key: StringKey, vars?: Record<string, string | number>): string {
  let out: string = strings[key][locale]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v))
    }
  }
  return out
}

/** The other locale, for language toggles. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'zh' ? 'en' : 'zh'
}
