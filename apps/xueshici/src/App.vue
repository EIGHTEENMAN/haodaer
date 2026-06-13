<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { poemsIndex, categories, categoryColors, poetBios, type PoemMeta } from './data/poems-meta'
import type { Poem, Section } from './data/poems'
import { speak, stopSpeaking } from './lib/audio'
import { filterApps } from '@shared/composables/useSearch'
import { reportLearningProgress, getActiveChildId } from '@shared/composables/useLearningProgress'
import { useLearningStats } from '@shared/composables/useLearningStats'
import { useAuth } from '@shared/composables/useAuth'
import HeaderBar from '@shared/components/HeaderBar.vue'
import AppSearchResults from '@shared/components/AppSearchResults.vue'
import ContentSearchResults from '@shared/components/ContentSearchResults.vue'
import FooterBar from '@shared/components/FooterBar.vue'
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import ReadingChallenge from '@shared/components/ReadingChallenge.vue'
import PointReader from '@shared/components/PointReader.vue'
import PoemIllustration from './components/PoemIllustration.vue'

// Lazy loading state for full poem data
const fullData = ref<Poem[] | null>(null)
const loadingData = ref(false)
let fullDataPromise: Promise<void> | null = null

async function ensureFullData() {
  if (fullData.value) return
  if (fullDataPromise) return fullDataPromise
  loadingData.value = true
  fullDataPromise = import('./data/poems').then(mod => {
    fullData.value = mod.poemsData
    loadingData.value = false
  })
  await fullDataPromise
}

// Navigation: home -> poet -> detail -> reader
type View = 'home' | 'poet' | 'detail' | 'reader' | 'search'
const currentView = ref<View>('home')
const currentPoet = ref<string>('')
const currentPoem = ref<Poem | null>(null)
const currentSection = ref<Section | null>(null)
const activeDynasty = ref('全部')
const searchQuery = ref('')
const apiResults = ref<any[]>([])
const searchResults = ref<{ poem: Poem; sections: Section[] }[]>([])

const filteredApps = computed(() => filterApps(searchQuery.value))

// Daily quote — random poem
const dailyPoem = ref<PoemMeta | null>(null)
const dailyQuote = computed(() => {
  if (!dailyPoem.value) return ''
  const lines = dailyPoem.value.summary.split('\n')
  if (lines.length <= 1) return dailyPoem.value.summary
  const allSame = lines.every(l => l.length === lines[0].length)
  const n = allSame ? Math.min(2, lines.length) : Math.min(3, lines.length)
  return lines.slice(0, n).join('，') + '。'
})

// Learning progress tracking
const readerEntryTime = ref(0)
const showChallenge = ref(false)
const challengeSectionRef = ref('')
const { token, user } = useAuth()
const stats = useLearningStats('xueshici')

watch(currentView, (newView, oldView) => {
  if (oldView === 'reader' && newView !== 'reader' && readerEntryTime.value > 0) {
    const childId = getActiveChildId()
    if (childId) {
      const elapsed = Math.round((Date.now() - readerEntryTime.value) / 60000)
      reportLearningProgress(childId, 'poetry', 1, Math.max(1, elapsed))
    }
    readerEntryTime.value = 0
    if (challengeSectionRef.value) showChallenge.value = true
  }
  if (newView === 'reader') {
    readerEntryTime.value = Date.now()
    if (currentPoem.value && currentSection.value) {
      challengeSectionRef.value = `shici:${currentPoem.value.id}:${currentSection.value.id}`
    }
  }
})

// Favorites
const favoriteIds = ref<string[]>(JSON.parse(localStorage.getItem('haodaer_shici_fav') || '[]'))
function toggleFavorite(id: string) {
  const i = favoriteIds.value.indexOf(id)
  i >= 0 ? favoriteIds.value.splice(i, 1) : favoriteIds.value.push(id)
  localStorage.setItem('haodaer_shici_fav', JSON.stringify(favoriteIds.value))
}
function isFavorite(id: string) { return favoriteIds.value.includes(id) }

// Search/filter poems
const filteredPoems = computed(() => {
  let list = poemsIndex
  if (activeDynasty.value !== '全部') list = list.filter(p => p.dynasty === activeDynasty.value)
  if (currentPoet.value) list = list.filter(p => p.author === currentPoet.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.title.includes(q) || p.author.includes(q))
  }
  return list
})

// Poets grouped by dynasty (for home page)
interface PoetGroup {
  name: string
  poems: Poem[]
  count: number
}
interface DynastyGroup {
  dynasty: string
  color: string
  poets: PoetGroup[]
}

const poetsByDynasty = computed<DynastyGroup[]>(() => {
  // Filter by search query for home page
  let base = poemsIndex
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    base = base.filter(p => p.title.includes(q) || p.author.includes(q))
  }
  const dynasties = activeDynasty.value === '全部' ? categories : [activeDynasty.value]
  return dynasties.map(dyn => {
    const dynPoems = base.filter(p => p.category === dyn)
    const poetMap = new Map<string, Poem[]>()
    dynPoems.forEach(p => {
      if (!poetMap.has(p.author)) poetMap.set(p.author, [])
      poetMap.get(p.author)!.push(p)
    })
    const poets = Array.from(poetMap.entries()).map(([name, poems]) => ({
      name, poems, count: poems.length
    })).sort((a, b) => b.count - a.count)
    return { dynasty: dyn, color: categoryColors[dyn] || '#64748b', poets }
  }).filter(g => g.poets.length > 0)
})

// Poems of current poet (for poet view)
const currentPoetPoems = computed(() => {
  return poemsIndex.filter(p => p.author === currentPoet.value)
})

function openPoet(name: string) {
  stopSpeaking()
  stats.markOpened(name)
  currentPoet.value = name
  currentView.value = 'poet'
  saveHash()
}

function openDetail(p: Poem) {
  stopSpeaking()
  stats.markRead(p.id)
  currentPoem.value = p
  currentSection.value = null
  currentView.value = 'detail'
  saveHash()
}

async function openDetailFromMeta(meta: PoemMeta) {
  stopSpeaking()
  await ensureFullData()
  const poem = fullData.value?.find(p => p.id == meta.id)
  if (poem) { openDetail(poem) }
}

function openReader(s: Section) {
  currentSection.value = s
  currentView.value = 'reader'
  saveHash()
}

function goHome() {
  stopSpeaking()
  currentView.value = 'home'
  currentPoet.value = ''
  currentPoem.value = null
  currentSection.value = null
  history.pushState(null, '', window.location.pathname)
}

function goBack() {
  stopSpeaking()
  history.back()
}

// Hash-based URL persistence for browser refresh / back-forward
function saveHash() {
  let hash = ''
  if (currentView.value === 'poet' && currentPoet.value) {
    hash = `poet/${encodeURIComponent(currentPoet.value)}`
  } else if (currentView.value === 'detail' && currentPoem.value) {
    hash = `detail/${currentPoem.value.id}`
  } else if (currentView.value === 'reader' && currentSection.value) {
    hash = `reader/${currentSection.value.id}`
  }
  history.pushState(null, '', hash ? '#' + hash : window.location.pathname)
}
async function restoreFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return
  const slashIdx = hash.indexOf('/')
  const view = slashIdx >= 0 ? hash.slice(0, slashIdx) : hash
  const id = slashIdx >= 0 ? hash.slice(slashIdx + 1) : ''
  if (!id) return
  if (view === 'poet') {
    currentPoet.value = decodeURIComponent(id)
    currentView.value = 'poet'
  } else if (view === 'detail') {
    await ensureFullData()
    const item = fullData.value?.find(p => p.id == id)
    if (item) { currentPoem.value = item; currentView.value = 'detail' }
  } else if (view === 'reader') {
    await ensureFullData()
    for (const p of fullData.value!) {
      const sec = p.sections.find(s => s.id == id)
      if (sec) { currentPoem.value = p; currentSection.value = sec; currentView.value = 'reader'; break }
    }
  }
}

// Audio
const speaking = ref(false)
function playText(text: string) {
  stopSpeaking()
  if (!text.trim()) return
  speaking.value = true
  speak(text, 0.8, () => { speaking.value = false })
}
function playOriginalText() {
  if (!currentPoem.value || !currentSection.value) return
  const info = `《${currentPoem.value.title}》${currentPoem.value.author}，${currentPoem.value.dynasty}。`
  playText(info + '\n' + currentSection.value.original)
}
function stopAudio() { stopSpeaking(); speaking.value = false }
function getReaderContent(): string {
  if (!currentPoem.value || !currentSection.value) return ''
  const info = `《${currentPoem.value.title}》${currentPoem.value.author}，${currentPoem.value.dynasty}。`
  return info + '\n' + currentSection.value.original
}

async function doSearch() {
  if (!searchQuery.value) return
  await ensureFullData()
  const q = searchQuery.value.toLowerCase().trim()
  const results: { poem: Poem; sections: Section[] }[] = []
  for (const poem of fullData.value!) {
    const poemMatch = poem.title.toLowerCase().includes(q) || poem.author.toLowerCase().includes(q)
    const matchingSections: Section[] = []
    for (const section of poem.sections) {
      const sectionMatch =
        section.title.toLowerCase().includes(q) ||
        section.original.toLowerCase().includes(q) ||
        section.translation.toLowerCase().includes(q) ||
        section.interpretation.toLowerCase().includes(q)
      if (poemMatch || sectionMatch) {
        matchingSections.push(section)
      }
    }
    if (matchingSections.length > 0) {
      results.push({ poem, sections: matchingSections })
    }
  }
  searchResults.value = results
  currentView.value = 'search'
  // API search
  try {
    const _res = await fetch('/api/search?q=' + encodeURIComponent(q))
    const _data = await _res.json()
    apiResults.value = _data.data || []
  } catch { apiResults.value = [] }
  history.replaceState(null, '', window.location.pathname)
}

function goToSection(poem: Poem, section: Section) {
  stopSpeaking()
  stats.markRead(poem.id)
  currentPoem.value = poem
  currentSection.value = section
  currentView.value = 'reader'
  saveHash()
}

onMounted(async () => {
  if (poemsIndex.length > 0) {
    dailyPoem.value = poemsIndex[Math.floor(Math.random() * poemsIndex.length)]
  }
  window.addEventListener('beforeunload', stopSpeaking)
  // Check for ?q= param from main-site search results
  const params = new URLSearchParams(window.location.search)
  const qParam = params.get('q')
  if (qParam) { searchQuery.value = qParam }

  // Restore view state from URL hash (supports browser refresh and back/forward)
  await restoreFromHash()
  window.addEventListener('popstate', restoreFromHash)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', stopSpeaking)
  window.removeEventListener('popstate', restoreFromHash)
})
</script>

<template>
  <YouthModeGate>
  <div class="page" style="--hd-accent:#2563eb;--hd-accent-hover:#1d4ed8;--hd-accent-light:#bfdbfe;--hd-accent-shadow:rgba(59,130,246,0.1);--hd-accent-bg:#f0f9ff">
    <HeaderBar v-model="searchQuery" @search="doSearch" />

    <!-- ===== HOME VIEW: Dynasty -> Poets ===== -->
    <template v-if="currentView === 'home'">
      <!-- Hero -->
      <section class="sc-hero">
        <div class="sc-hero-inner animate-fadeInUp">
          <div class="sc-hero-row">
            <div class="sc-hero-left">
              <h1 class="sc-hero-title">学诗词</h1>
              <p class="sc-hero-desc">唐诗宋词，古韵童声</p>
            </div>
            <div class="sc-hero-right">
              <div class="sc-quote-box" v-if="dailyPoem">
                <p class="sc-quote-text">{{ dailyQuote }}</p>
                <p class="sc-quote-source">{{ dailyPoem.author }} · {{ dailyPoem.title }}</p>
              </div>
            </div>
          </div>
          <!-- Dynasty Tags -->
          <div class="sc-tags animate-fadeIn">
            <button v-for="dyn in ['全部', ...categories]" :key="dyn" @click="activeDynasty = dyn"
              class="sc-tag" :class="activeDynasty === dyn ? 'sc-tag-active' : ''">
              {{ dyn }}
            </button>
          </div>
        </div>
      </section>

      <!-- Learning Progress -->
      <div class="ls-bar animate-fadeIn">
        <template v-if="token && user">
          <span class="ls-user">{{ user.nickname || user.username }}</span>
          <span class="ls-dot"></span>
          <span>👤 已认识 {{ stats.openedCount }}/299 位诗人</span>
          <span class="ls-dot"></span>
          <span>📜 已学习 {{ stats.readCount }}/934 首诗词</span>
        </template>
        <template v-else>
          <span>👤 学习进度：0/299 位诗人，0/934 首诗词 — <a href="https://grandand.com?login=1" class="ls-login-link">登录后同步记录</a></span>
        </template>
      </div>

      <!-- Poets Grid by Dynasty -->
      <section class="sc-grid-section" v-for="g in poetsByDynasty" :key="g.dynasty">
        <h2 class="section-title">
          <span class="section-title-dot" :style="{ backgroundColor: g.color }"></span>
          {{ g.dynasty }}（{{ g.poets.length }}位诗人）
        </h2>
        <div class="sc-grid">
          <div v-for="poet in g.poets" :key="poet.name" class="sc-card" @click="openPoet(poet.name)">
            <div class="sc-card-title">{{ poet.name }} <span class="sc-card-count">{{ poet.count }}首</span></div>
            <div class="sc-card-bio">{{ poetBios[poet.name] || '' }}</div>
          </div>
        </div>
        <p v-if="g.poets.length === 0" class="sc-empty">暂无诗人</p>
      </section>
      <p v-if="poetsByDynasty.length === 0" class="sc-empty" style="padding:60px 24px">没有找到匹配的诗人</p>
    </template>

    <!-- ===== SEARCH RESULTS VIEW ===== -->
    <template v-if="currentView === 'search'">
      <div class="sc-poet-wrap">
        <button class="sc-back" @click="goBack()">← 返回</button>
        <div class="sc-search-header">
          <p class="sc-search-summary">搜索 "{{ searchQuery }}"</p>
        </div>

        <AppSearchResults :apps="filteredApps" />
        <ContentSearchResults :results="apiResults" :query="searchQuery" />

        <div v-if="searchResults.length > 0" class="sc-content-section">
          <h3 class="sc-section-title">📚 内容搜索结果</h3>
          <div v-for="result in searchResults" :key="result.poem.id" class="sc-search-group">
            <div class="sc-poem-item" @click="openDetail(result.poem)">
              <div class="sc-poem-item-info">
                <span class="sc-poem-item-title">{{ result.poem.title }}</span>
                <p class="sc-poem-item-preview">{{ result.poem.author }} · {{ result.poem.dynasty }}</p>
              </div>
              <span class="sc-poem-item-tag" :style="{ color: categoryColors[result.poem.category], borderColor: categoryColors[result.poem.category] }">{{ result.poem.dynasty }}</span>
            </div>
            <div v-for="section in result.sections" :key="section.id" class="sc-search-section" @click="goToSection(result.poem, section)">
              <div class="sc-section-info">
                <span class="sc-section-name">{{ section.title || '全文' }}</span>
                <p class="sc-section-preview">{{ section.original.split('\n')[0].substring(0, 60) }}{{ section.original.split('\n')[0].length > 60 ? '...' : '' }}</p>
              </div>
            </div>
          </div>
        </div>
        <div v-if="filteredApps.length === 0 && searchResults.length === 0" class="sc-empty">没有找到相关内容</div>
      </div>
    </template>

    <!-- ===== POET VIEW: Poet -> Poem List ===== -->
    <template v-if="currentView === 'poet'">
      <div class="sc-poet-wrap">
        <button class="sc-back" @click="goHome()">← 返回</button>
        <div class="sc-poet-header">
          <div class="sc-poet-avatar-large">
            <span>👤</span>
          </div>
          <div class="sc-poet-info">
            <h1 class="sc-poet-name">{{ currentPoet }}</h1>
            <p class="sc-poet-meta">
              {{ currentPoetPoems[0]?.dynasty }} · {{ currentPoetPoems.length }}首作品
            </p>
          </div>
        </div>

        <h3 class="sc-sections-title">作品列表</h3>
        <div class="sc-poem-list">
          <div v-for="p in currentPoetPoems" :key="p.id" class="sc-poem-item" @click="openDetailFromMeta(p)">
            <div class="sc-poem-item-info">
              <span class="sc-poem-item-title">{{ p.title }}</span>
              <p class="sc-poem-item-preview">{{ p.summary.substring(0, 40) }}{{ p.summary.length > 40 ? '...' : '' }}</p>
            </div>
            <span class="sc-poem-item-tag" :style="{ color: categoryColors[p.category], borderColor: categoryColors[p.category] }">{{ p.dynasty }}</span>
          </div>
        </div>
        <p v-if="currentPoetPoems.length === 0" class="sc-empty">暂无作品</p>
      </div>
    </template>

    <!-- ===== LOADING ===== -->
    <div v-if="loadingData && (currentView === 'detail' || currentView === 'reader')" class="sc-empty" style="padding:80px 24px;font-size:16px">数据加载中...</div>

    <!-- ===== DETAIL VIEW ===== -->
    <template v-if="!loadingData && currentView === 'detail' && currentPoem">
      <div class="sc-detail-wrap">
        <button class="sc-back" @click="goBack()">← 返回</button>
        <div class="sc-detail-card">
          <!-- 诗配画（详情页缩小版） -->
          <PoemIllustration
            v-if="currentPoem"
            :poemId="currentPoem.id"
            :poemTitle="currentPoem.title"
            :poemAuthor="currentPoem.author"
            :poemDynasty="currentPoem.dynasty"
            :color="categoryColors[currentPoem.category]"
          />
          <h1 class="sc-detail-title">{{ currentPoem.title }}</h1>
          <p class="sc-detail-meta">{{ currentPoem.author }} · {{ currentPoem.dynasty }}</p>
          <div class="sc-detail-tags">
            <span v-for="tag in (typeof currentPoem.tags === 'string' ? currentPoem.tags.split(',') : currentPoem.tags)" :key="tag" class="sc-detail-tag">{{ tag }}</span>
          </div>
          <p class="sc-detail-summary" style="white-space: pre-line">{{ currentPoem.summary }}</p>
        </div>

        <h3 class="sc-sections-title">诵读</h3>
        <div class="sc-sections">
          <div v-for="sec in currentPoem.sections" :key="sec.id" class="sc-section-item" @click="openReader(sec)">
            <div class="sc-section-info">
              <span class="sc-section-name">{{ sec.title || '全文' }}</span>
              <p class="sc-section-preview">{{ sec.original.split('\n')[0].substring(0, 40) }}{{ sec.original.split('\n')[0].length > 40 ? '...' : '' }}</p>
            </div>
            <button class="sc-section-fav" @click.stop="toggleFavorite(currentPoem.id + '-' + sec.id)"
              :style="{ color: isFavorite(currentPoem.id + '-' + sec.id) ? '#eab308' : '#94a3b8' }">
              {{ isFavorite(currentPoem.id + '-' + sec.id) ? '★' : '☆' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== READER VIEW ===== -->
    <template v-if="!loadingData && currentView === 'reader' && currentSection">
      <div class="sc-reader-wrap">
        <div class="sc-reader-header">
          <button class="sc-back" @click="goBack()">← 返回</button>
          <span class="sc-reader-title">{{ currentPoem?.title }} · {{ currentSection.title || '全文' }}</span>
        </div>

        <!-- 诗配画 -->
        <PoemIllustration
          v-if="currentPoem"
          :poemId="currentPoem.id"
          :poemTitle="currentPoem.title"
          :poemAuthor="currentPoem.author"
          :poemDynasty="currentPoem.dynasty"
          :color="categoryColors[currentPoem.category]"
        />

        <div class="sc-content-sections">
          <div class="sc-content-block">
            <div class="sc-content-label">
              <span>原文</span>
              <button class="sc-block-play" @click="speaking ? stopAudio() : playOriginalText()">{{ speaking ? '⏹' : '▶' }}</button>
            </div>
            <div class="sc-original-text">
              <p v-for="(line, i) in currentSection.original.split('\n')" :key="i" class="sc-original-line"><PointReader :text="line" /></p>
            </div>
          </div>
          <div class="sc-content-block">
            <div class="sc-content-label">
              <span>译文</span>
              <button class="sc-block-play" @click="speaking ? stopAudio() : playText(currentSection.translation)">{{ speaking ? '⏹' : '▶' }}</button>
            </div>
            <p class="sc-translation-text">{{ currentSection.translation }}</p>
          </div>
          <div class="sc-content-block">
            <div class="sc-content-label">
              <span>赏析</span>
              <button class="sc-block-play" @click="speaking ? stopAudio() : playText(currentSection.interpretation)">{{ speaking ? '⏹' : '▶' }}</button>
            </div>
            <p class="sc-translation-text">{{ currentSection.interpretation }}</p>
          </div>
        </div>

        <div class="sc-reader-actions">
          <button class="sc-action-btn sc-action-play" @click="speaking ? stopAudio() : playText(getReaderContent())">
            {{ speaking ? '⏹ 停止' : '▶ 播放全文' }}
          </button>
        </div>
      </div>
    </template>

    <!-- ===== FOOTER ===== -->
    <div v-if="currentView === 'home'" class="sc-copyright">
      <p>本平台所收录的古典诗词均为公有领域作品。现代作品片段仅作教学引用，版权归原作者所有。如涉及侵权，请联系我们处理。 · <a href="https://grandand.com/legal#complaint" style="color:#94a3b8;text-decoration:underline;">侵权投诉</a></p>
    </div>
    <FooterBar v-if="currentView === 'home'" />
    <ReadingChallenge
      :visible="showChallenge"
      subject="shici"
      :sectionRef="challengeSectionRef"
      server-url="https://tiaozhan.grandand.com"
      @close="showChallenge = false"
    />
  </div>
  </YouthModeGate>
</template>

<style>
/* ===== Shared ===== */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out both; }

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', sans-serif;
  background: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased;
}

/* ===== Hero ===== */
.sc-hero {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  padding: 28px 0 24px;
  border-bottom: 1px solid #fde68a;
}
.sc-hero-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
.sc-hero-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 24px; }
.sc-hero-left { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.sc-hero-title { font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: 1px; }
.sc-hero-desc { font-size: 15px; color: #64748b; line-height: 1.6; }
.sc-hero-right { flex-shrink: 0; }
.sc-quote-box { text-align: right;  }
.sc-quote-text { font-size: 18px; font-weight: 700; color: #d97706; letter-spacing: 1px; }
.sc-quote-source { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.sc-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.sc-tag {
  padding: 5px 16px; border-radius: 10px; font-size: 13px; font-weight: 500;
  cursor: pointer; border: 2px solid #e2e8f0; background: white; color: #475569; transition: all 0.2s;
}
.sc-tag:hover { border-color: #d97706; color: #d97706; }
.sc-tag-active { background: #d97706; color: white; border-color: #d97706; }
.sc-tag-active:hover { background: #b45309; border-color: #b45309; color: white; }

/* ===== Learning Stats Bar ===== */
.ls-bar {
  max-width: 1200px; margin: 0 auto; padding: 16px 24px;
  display: flex; align-items: center; gap: 12px;
  font-size: 15px; font-weight: 500; color: #334155; background: white;
  border-bottom: 1px solid #e2e8f0;
}
.ls-dot {
  width: 4px; height: 4px; border-radius: 50%; background: #cbd5e1;
}
.ls-user {
  font-weight: 700; color: #d97706; font-size: 15px;
}
.ls-login-link {
  color: #d97706; text-decoration: none; font-weight: 500;
}
.ls-login-link:hover { text-decoration: underline; }

/* ===== Grid Section (Poets) ===== */
.sc-grid-section { max-width: 1200px; margin: 0 auto; padding: 32px 24px 8px; }
.section-title { font-size: 20px; font-weight: 700; margin-bottom: 18px; color: #0f172a; display: flex; align-items: center; gap: 10px; }
.section-title-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.sc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.sc-card {
  background: white; border-radius: 10px; padding: 12px 14px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
}
.sc-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-2px); }
.sc-card-title { font-size: 13px; font-weight: 700; color: #0f172a; }
.sc-card-count { font-size: 11px; color: #64748b; font-weight: 400; margin-left: 3px; }
.sc-card-bio { font-size: 11px; color: #94a3b8; margin-top: 3px; line-height: 1.3; }
.sc-empty { text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px; }

/* ===== Poet View ===== */
.sc-poet-wrap { max-width: 1200px; margin: 0 auto; padding: 16px 24px; }
.sc-poet-header {
  display: flex; align-items: center; gap: 18px;
  background: white; border-radius: 18px; padding: 24px 28px;
  border: 1px solid #e2e8f0; margin: 10px 0 20px;
}
.sc-poet-avatar-large {
  width: 64px; height: 64px; border-radius: 50%;
  background: #fef3c7; display: flex; align-items: center; justify-content: center;
  font-size: 32px; flex-shrink: 0;
}
.sc-poet-info { flex: 1; }
.sc-poet-name { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.sc-poet-meta { font-size: 13px; color: #64748b; }

.sc-poem-list { display: flex; flex-direction: column; gap: 8px; }
.sc-poem-item {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border-radius: 14px; padding: 14px 18px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
}
.sc-poem-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #fde68a; }
.sc-poem-item-info { flex: 1; min-width: 0; }
.sc-poem-item-title { font-size: 15px; font-weight: 600; color: #0f172a; display: block; margin-bottom: 3px; }
.sc-poem-item-preview { font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis;  }
.sc-poem-item-tag {
  font-size: 11px; font-weight: 500; padding: 2px 10px; border-radius: 8px;
  border: 1px solid; flex-shrink: 0; margin-left: 12px;
}

/* ===== Back button ===== */
.sc-back { background: none; border: none; font-size: 13px; color: #d97706; cursor: pointer; padding: 4px 0; display: block;  }
.sc-back:hover { color: #b45309; }

/* ===== Detail View ===== */
.sc-detail-wrap { max-width: 1200px; margin: 0 auto; padding: 16px 24px; }
.sc-detail-card {
  background: white; border-radius: 18px; padding: 28px; margin: 10px 0 20px;
  border: 1px solid #e2e8f0;
}
.sc-detail-title { font-size: 26px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
.sc-detail-meta { font-size: 13px; color: #64748b; margin-bottom: 10px; }
.sc-detail-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.sc-detail-tag { padding: 2px 10px; background: #fef3c7; color: #d97706; border-radius: 8px; font-size: 11px; font-weight: 500; }
.sc-detail-summary { font-size: 13px; color: #64748b; line-height: 1.7; }
.sc-sections-title { font-size: 16px; font-weight: 600; margin: 0 0 10px; color: #0f172a; }
.sc-sections { display: flex; flex-direction: column; gap: 8px; }
.sc-section-item {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border-radius: 14px; padding: 14px 18px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
}
.sc-section-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #fde68a; }
.sc-section-info { flex: 1; min-width: 0; }
.sc-section-name { font-size: 14px; font-weight: 600; color: #0f172a; display: block; margin-bottom: 3px; }
.sc-section-preview { font-size: 12px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis;  }
.sc-section-fav {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: #f8fafc; font-size: 18px; cursor: pointer;
  flex-shrink: 0; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.sc-section-fav:hover { background: #fefce8; transform: scale(1.15); }

/* ===== Reader View ===== */
.sc-reader-wrap { max-width: 1200px; margin: 0 auto; padding: 24px; }
.sc-reader-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.sc-reader-header .sc-back { margin-bottom: 0; }
.sc-reader-title { font-size: 15px; font-weight: 600; color: #475569; }
.sc-content-sections { display: flex; flex-direction: column; gap: 20px; }
.sc-content-block { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; }
.sc-content-label {
  font-size: 14px; font-weight: 700; color: #d97706;
  margin-bottom: 12px; padding-bottom: 8px;
  border-bottom: 2px solid #fef3c7;
  display: flex; align-items: center; justify-content: space-between;
}
.sc-original-text { font-family: "Noto Serif SC", "STSong", serif; }
.sc-original-line { font-size: 17px; line-height: 2.2; color: #0f172a; }
.sc-translation-text { font-size: 14px; line-height: 1.9; color: #475569; white-space: pre-line; }
.sc-block-play {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: #fef3c7; color: #d97706; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.sc-block-play:hover { background: #d97706; color: white; }
.sc-reader-actions { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }
.sc-action-btn { padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; }
.sc-action-play { background: #d97706; color: white; }
.sc-action-play:hover { background: #b45309; }

/* ===== Search Results ===== */
.sc-search-header { margin: 10px 0 20px; }
.sc-search-summary { font-size: 15px; color: #0f172a; font-weight: 600; }
.sc-search-group { margin-bottom: 16px; }
.sc-search-group .sc-poem-item { margin-bottom: 4px; }
.sc-search-section {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border-radius: 12px; padding: 10px 14px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; margin-top: 4px;
}
.sc-search-section:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #fde68a; }
.sc-section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }

/* ===== Copyright Disclaimer ===== */
.sc-copyright { max-width: 1200px; margin: 0 auto; padding: 20px 24px 8px; text-align: center; }
.sc-copyright p { font-size: 11px; color: #94a3b8; line-height: 1.7; }

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .sc-hero { padding: 20px 0 16px; }
  .sc-hero-title { font-size: 26px; }
  .sc-hero-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .sc-hero-right { width: 100%; }
  .sc-hero-left { flex-direction: column; align-items: flex-start; gap: 4px; }
  .sc-quote-box { text-align: left; white-space: normal; }
  .sc-quote-text { font-size: 16px; }
  .sc-grid { grid-template-columns: repeat(2, 1fr); }
  .sc-detail-card { margin: 8px 0; padding: 20px; }
  .sc-poet-header { padding: 18px; }
  .sc-reader-wrap { padding: 14px; }
  .sc-content-block { padding: 16px; }
  .sc-original-line { font-size: 15px; }
}
</style>
