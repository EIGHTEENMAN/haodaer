<template>
  <div class="how-to-play-overlay" @click.self="$emit('back')">
    <div class="how-to-play-panel">
      <div class="htp-header">
        <div class="mode-tabs">
          <span class="mode-tab" :class="{ active: mode === 'quest' }" @click="mode = 'quest'">QUEST</span>
          <span class="mode-tab" :class="{ active: mode === 'arena' }" @click="mode = 'arena'">ARENA</span>
        </div>
        <span class="htp-close" @click="$emit('back')">✕</span>
      </div>

      <div class="htp-content">
        <!-- ═══════════════ QUEST MODE ═══════════════ -->
        <template v-if="mode === 'quest'">
          <div v-if="!showChinese" class="htp-en">
            <section>
              <p class="section-title">🎯 YOUR GOAL</p>
              <p>Collect all the Word Monsters in every world!</p>
            </section>

            <section>
              <p class="section-title">🌍 EXPLORE</p>
              <p>Use <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> or Arrow Keys to move around.</p>
              <p>Walk in the grass to find wild Word Monsters!</p>
            </section>

            <section>
              <p class="section-title">⚔️ BATTLE</p>
              <p>When you meet a wild monster, you fight!</p>
              <div class="cmd-list">
                <div><span class="cmd">FIGHT</span> — Attack to lower its HP</div>
                <div><span class="cmd">FOCUS</span> — Answer a word quiz for 2x damage!</div>
                <div><span class="cmd">SWITCH</span> — Change to another team monster</div>
                <div><span class="cmd">FLEE</span> — Run away from the battle</div>
              </div>
            </section>

            <section>
              <p class="section-title">👥 TEAM</p>
              <p>Carry up to <strong>6</strong> monsters in your team.</p>
              <p>When one faints, the next one comes out!</p>
              <p>If all faint — go back to rest and heal fully. No worries!</p>
            </section>

            <section>
              <p class="section-title">🔴 CAPTURE</p>
              <p>Lower the wild monster's HP, then try to capture it!</p>
              <p>Throw a ball and hope it works!</p>
            </section>

            <section>
              <p class="section-title">📖 COLLECT</p>
              <p>Every captured monster goes to your <strong>POKEDEX</strong>.</p>
              <p>Collect all <strong>300</strong> words in each world!</p>
            </section>

            <section>
              <p class="section-title">⭐ EVOLVE</p>
              <p>Use <strong>FOCUS</strong> in battles to answer word quizzes.</p>
              <p>5 correct answers → <strong>EVOLVE!</strong> (Stage 2)</p>
              <p>15 correct answers → <strong>ULTIMATE FORM!</strong> (Stage 3)</p>
            </section>

            <section>
              <p class="section-title">💡 TIPS</p>
              <p>✅ No penalty for wrong answers — just try your best!</p>
              <p>✅ Monsters heal when you go back to world select.</p>
              <p>✅ Words get harder as you progress through stages!</p>
            </section>
          </div>

          <div v-else class="htp-cn">
            <section>
              <p class="section-title">🎯 游戏目标</p>
              <p>收集每个世界的所有单词兽！</p>
            </section>

            <section>
              <p class="section-title">🌍 探索</p>
              <p>使用 <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> 或方向键移动。</p>
              <p>在草丛中走动会遇到野生单词兽！</p>
            </section>

            <section>
              <p class="section-title">⚔️ 战斗</p>
              <p>遇到野生单词兽就进入战斗！</p>
              <div class="cmd-list">
                <div><span class="cmd">FIGHT</span> — 攻击，降低野怪 HP</div>
                <div><span class="cmd">FOCUS</span> — 回答单词题，答对伤害翻倍！</div>
                <div><span class="cmd">SWITCH</span> — 切换队伍中的另一只上场</div>
                <div><span class="cmd">FLEE</span> — 逃跑，回到地图</div>
              </div>
            </section>

            <section>
              <p class="section-title">👥 队伍</p>
              <p>最多携带 <strong>6</strong> 只单词兽组成队伍。</p>
              <p>当前单词兽倒下时，下一只自动上场！</p>
              <p>全部倒下也不怕——自动满血复活重新出发！</p>
            </section>

            <section>
              <p class="section-title">🔴 捕捉</p>
              <p>把野生单词兽打到残血，然后尝试捕捉！</p>
              <p>投掷精灵球，摇一摇就抓住了！</p>
            </section>

            <section>
              <p class="section-title">📖 收集</p>
              <p>每只捕捉到的单词兽加入 <strong>图鉴</strong>。</p>
              <p>收集每个世界全部 <strong>300</strong> 个单词！</p>
            </section>

            <section>
              <p class="section-title">⭐ 进化</p>
              <p>战斗中用 <strong>FOCUS</strong> 回答单词题。</p>
              <p>答对 5 次 → <strong>进化！</strong>（第 2 阶段）</p>
              <p>答对 15 次 → <strong>终极形态！</strong>（第 3 阶段）</p>
            </section>

            <section>
              <p class="section-title">💡 小贴士</p>
              <p>✅ 答错了没有惩罚，大胆尝试！</p>
              <p>✅ 返回世界选择时自动回满血。</p>
              <p>✅ 越往后关卡单词越难哦！</p>
            </section>
          </div>
        </template>

        <!-- ═══════════════ ARENA MODE ═══════════════ -->
        <template v-if="mode === 'arena'">
          <div v-if="!showChinese" class="htp-en">
            <section>
              <p class="section-title">🎯 YOUR GOAL</p>
              <p>Clear each stage by defeating all monsters before time runs out!</p>
            </section>

            <section>
              <p class="section-title">🎮 CONTROLS</p>
              <div class="cmd-list">
                <div><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span><span class="key-suffix"> / Arrow Keys</span> — Move your character</div>
                <div><span class="key">SPACE</span> — Attack the nearest monster</div>
                <div><span class="key">1</span><span class="key">2</span><span class="key">3</span><span class="key">4</span><span class="key">5</span> — Select and activate skills</div>
              </div>
            </section>

            <section>
              <p class="section-title">💥 ATTACK</p>
              <p>Press <span class="key">SPACE</span> to attack the nearest monster.</p>
              <p>You must hit the <strong>TARGET</strong> monster (shown in the hint bar) for damage to count!</p>
              <p>Hitting the wrong monster won't deal damage.</p>
            </section>

            <section>
              <p class="section-title">🔊 HINT SYSTEM</p>
              <p>A hint bar at the top tells you which monster to attack.</p>
              <div class="cmd-list">
                <div>🔊 <strong>Audio</strong> — Listen and find the word you hear</div>
                <div>📝 <strong>Chinese</strong> — Find the word matching the meaning</div>
                <div>🎨 <strong>Emoji</strong> — Find the word matching the emoji</div>
              </div>
              <p>Tap the hint bar to replay audio hints!</p>
            </section>

            <section>
              <p class="section-title">⚡ COMBO</p>
              <p>Chain successful hits to build your combo!</p>
              <div class="cmd-list">
                <div>Combo x5+ → <span class="highlight-blue">Blue glow</span></div>
                <div>Combo x10+ → <span class="highlight-purple">Purple glow</span> + 2x damage</div>
                <div>Combo x20+ → <span class="highlight-gold">Gold glow</span> + 3x damage</div>
              </div>
            </section>

            <section>
              <p class="section-title">🔧 SKILLS</p>
              <p>Press <span class="key">1</span>-<span class="key">5</span> to select a skill, then press <span class="key">SPACE</span> to activate it.</p>
              <div class="cmd-list">
                <div>1. <strong>Punch</strong> — Heavy melee attack</div>
                <div>2. <strong>Kick</strong> — AoE ground slam, destroys obstacles</div>
                <div>3. <strong>Power</strong> — Charge forward, pierce through</div>
                <div>4. <strong>Whirlwind</strong> — Spin attack around you</div>
                <div>5. <strong>Ultimate</strong> — Massive AoE, damages all nearby monsters!</div>
              </div>
              <p>Skills have cooldowns and unlock as you progress through stages!</p>
            </section>

            <section>
              <p class="section-title">❤️ HP & DAMAGE</p>
              <p>Your HP is shown as hearts at the top of the screen.</p>
              <p>Monsters chase you — when they catch up, they deal melee damage.</p>
              <p>After taking damage, you get brief invulnerability (blinking effect).</p>
              <p>If HP reaches 0 → <strong>GAME OVER</strong>. Score is recorded.</p>
            </section>

            <section>
              <p class="section-title">🗺️ STAGES</p>
              <p>Each world has <strong>6 stages</strong>. Stage 6 is a <strong>BOSS FIGHT</strong>!</p>
              <p>Each stage has a theme-specific word difficulty.</p>
              <p>Clear all monsters in a stage to move forward.</p>
              <p>Some stages have a <strong>time limit</strong> — hurry!</p>
            </section>

            <section>
              <p class="section-title">💡 TIPS</p>
              <p>✅ Always attack the TARGET monster — don't waste time on others!</p>
              <p>✅ Build combos for massive damage multipliers.</p>
              <p>✅ Use skills (1-5) for quick kills and to break obstacles.</p>
              <p>✅ Kite monsters — don't let them surround you!</p>
            </section>
          </div>

          <div v-else class="htp-cn">
            <section>
              <p class="section-title">🎯 游戏目标</p>
              <p>在时间耗尽前击败当前关卡的所有怪物！</p>
            </section>

            <section>
              <p class="section-title">🎮 操作</p>
              <div class="cmd-list">
                <div><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span><span class="key-suffix"> / 方向键</span> — 移动角色</div>
                <div><span class="key">空格</span> — 攻击最近的怪物</div>
                <div><span class="key">1</span><span class="key">2</span><span class="key">3</span><span class="key">4</span><span class="key">5</span> — 选择并释放技能</div>
              </div>
            </section>

            <section>
              <p class="section-title">💥 攻击</p>
              <p>按 <span class="key">空格</span> 攻击最近的怪物。</p>
              <p>必须攻击 <strong>目标怪物</strong>（提示条中显示的单词）才造成伤害！</p>
              <p>打错怪物没有伤害。</p>
            </section>

            <section>
              <p class="section-title">🔊 提示系统</p>
              <p>屏幕上方提示条告诉你该攻击哪只怪物，有三种提示方式：</p>
              <div class="cmd-list">
                <div>🔊 <strong>发音</strong> — 听发音，找到对应的单词</div>
                <div>📝 <strong>中文</strong> — 看中文意思，找到对应的单词</div>
                <div>🎨 <strong>表情</strong> — 看表情符号，找到对应的单词</div>
              </div>
              <p>点击提示条可以重听发音！</p>
            </section>

            <section>
              <p class="section-title">⚡ 连击</p>
              <p>连续命中目标积累连击数！</p>
              <div class="cmd-list">
                <div>连击 5+ → <span class="highlight-blue">蓝色光环</span></div>
                <div>连击 10+ → <span class="highlight-purple">紫色光环</span> + 2 倍伤害</div>
                <div>连击 20+ → <span class="highlight-gold">金色光环</span> + 3 倍伤害</div>
              </div>
            </section>

            <section>
              <p class="section-title">🔧 技能</p>
              <p>按 <span class="key">1</span>-<span class="key">5</span> 选择技能，然后按 <span class="key">空格</span> 释放。</p>
              <div class="cmd-list">
                <div>1. <strong>重拳</strong> — 近战重击</div>
                <div>2. <strong>扫踢</strong> — 范围攻击，可摧毁障碍物</div>
                <div>3. <strong>冲拳</strong> — 向前冲刺贯穿</div>
                <div>4. <strong>旋风</strong> — 周身旋转攻击</div>
                <div>5. <strong>终极奥义</strong> — 大范围 AOE，伤害附近所有怪物！</div>
              </div>
              <p>技能有冷却时间，随关卡推进逐步解锁！</p>
            </section>

            <section>
              <p class="section-title">❤️ 血量与伤害</p>
              <p>屏幕顶部的心形显示你的血量。</p>
              <p>怪物会追着你跑——追上就造成近战伤害。</p>
              <p>受伤后有短暂无敌时间（角色闪烁效果）。</p>
              <p>血量归零 → <strong>游戏结束</strong>，记录当前分数。</p>
            </section>

            <section>
              <p class="section-title">🗺️ 关卡</p>
              <p>每个世界有 <strong>6 个关卡</strong>，第 6 关是 <strong>BOSS 战</strong>！</p>
              <p>每个关卡有特定主题和难度范围。</p>
              <p>击败所有怪物即可过关。</p>
              <p>部分关卡有 <strong>倒计时</strong>——抓紧时间！</p>
            </section>

            <section>
              <p class="section-title">💡 小贴士</p>
              <p>✅ 始终攻击目标怪物——别在其他怪物上浪费体力！</p>
              <p>✅ 积累连击可以获得高额伤害加成。</p>
              <p>✅ 善用技能（1-5 键）快速击杀和摧毁障碍物。</p>
              <p>✅ 边打边跑，别被怪物包围！</p>
            </section>
          </div>
        </template>
      </div>

      <div class="htp-footer">
        <button class="lang-toggle" @click="showChinese = !showChinese">
          {{ showChinese ? 'ENGLISH' : '中文说明' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

defineEmits<{ back: [] }>()
const mode = ref<'quest' | 'arena'>('quest')
const showChinese = ref(false)
</script>

<style scoped>
.how-to-play-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 950;
  pointer-events: auto;
}
.how-to-play-panel {
  background: #1a1a2e;
  border: 3px solid #ffd700;
  width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  position: relative;
}
.htp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 0;
}
.mode-tabs {
  display: flex;
  gap: 4px;
}
.mode-tab {
  padding: 6px 16px;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: #666;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.mode-tab.active {
  color: #ffd700;
  border-color: #ffd700;
  background: rgba(255,215,0,0.1);
}
.mode-tab:hover:not(.active) {
  color: #aaa;
  border-color: #555;
}
.htp-close {
  font-size: 20px;
  color: #888;
  cursor: pointer;
}
.htp-close:hover { color: #fff; }
.htp-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.htp-content section {
  margin-bottom: 18px;
}
.section-title {
  color: #ffd700;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 6px;
}
.htp-content p {
  color: #ccc;
  font-size: 12px;
  line-height: 1.8;
  font-family: -apple-system, "Noto Sans SC", sans-serif;
}
.htp-cn p,
.htp-cn .cmd-list {
  font-family: -apple-system, "Noto Sans SC", sans-serif;
}
.key {
  display: inline-block;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  padding: 1px 6px;
  margin: 0 1px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: #ffd700;
}
.key-suffix {
  font-family: -apple-system, "Noto Sans SC", sans-serif;
  font-size: 12px;
  color: #ccc;
  margin-left: 2px;
}
.cmd-list {
  margin-top: 4px;
}
.cmd-list div {
  color: #ccc;
  font-size: 12px;
  line-height: 2;
}
.cmd {
  display: inline-block;
  background: rgba(136,204,255,0.15);
  padding: 1px 8px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: #88ccff;
}
.highlight-blue { color: #4488ff; }
.highlight-purple { color: #aa44ff; }
.highlight-gold { color: #ffd700; }
.htp-footer {
  padding: 12px 20px;
  text-align: center;
  border-top: 1px solid rgba(255,255,255,0.1);
}
.lang-toggle {
  padding: 8px 24px;
  border: 2px solid #88ccff;
  background: transparent;
  color: #88ccff;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  cursor: pointer;
}
.lang-toggle:hover {
  background: rgba(136,204,255,0.15);
}
</style>
