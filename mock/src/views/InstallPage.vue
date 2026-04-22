<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

// iOS 判定
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
// Android + Chrome 判定
const isAndroid = /android/i.test(navigator.userAgent);

// beforeinstallprompt イベント（Android Chrome のみ）
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isInstalled = ref(false);

const onBeforeInstallPrompt = (e: Event) => {
  e.preventDefault();
  deferredPrompt.value = e as BeforeInstallPromptEvent;
};

const onAppInstalled = () => {
  isInstalled.value = true;
  deferredPrompt.value = null;
};

onMounted(() => {
  // すでにスタンドアロンで動いている場合はインストール済み
  if (window.matchMedia("(display-mode: standalone)").matches) {
    isInstalled.value = true;
  }
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
});

onUnmounted(() => {
  window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.removeEventListener("appinstalled", onAppInstalled);
});

const install = async () => {
  if (!deferredPrompt.value) return;
  await deferredPrompt.value.prompt();
};
</script>

<template>
  <div class="install-page">
    <div class="install-card">
      <img src="/logo.png" alt="アプリアイコン" class="app-icon" />
      <h1 class="app-name">車両不具合管理</h1>
      <p class="app-desc">ホーム画面に追加するとアプリとして利用できます</p>

      <!-- インストール済み -->
      <template v-if="isInstalled">
        <el-result icon="success" title="インストール済みです" sub-title="ホーム画面のアイコンからアプリを起動してください" />
      </template>

      <!-- Android / Chrome: インストールボタン -->
      <template v-else-if="deferredPrompt">
        <el-button type="primary" size="large" @click="install">
          ホーム画面に追加
        </el-button>
      </template>

      <!-- iOS Safari: 手順を表示 -->
      <template v-else-if="isIos">
        <div class="steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>Safari の下部にある
              <strong>共有ボタン</strong>
              （<span class="share-icon">⬆</span>）をタップ
            </span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>メニューを下にスクロールして<strong>「ホーム画面に追加」</strong>をタップ</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>右上の<strong>「追加」</strong>をタップして完了</span>
          </div>
        </div>
        <p class="note">※ Safari 以外のブラウザでは追加できません</p>
      </template>

      <!-- Android: プロンプトがまだ表示されていない場合 -->
      <template v-else-if="isAndroid">
        <div class="steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>Chrome の右上<strong>「︙」</strong>メニューをタップ</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span><strong>「ホーム画面に追加」</strong>をタップ</span>
          </div>
        </div>
      </template>

      <!-- その他のブラウザ -->
      <template v-else>
        <p class="note">
          ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択してください
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.install-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f4f8;
  padding: 24px;
}
.install-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px 32px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}
.app-icon {
  width: 96px;
  height: 96px;
  border-radius: 20px;
  margin-bottom: 16px;
}
.app-name {
  font-size: 22px;
  font-weight: bold;
  margin: 0 0 8px;
}
.app-desc {
  color: #666;
  margin-bottom: 28px;
  font-size: 14px;
}
.steps {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}
.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 15px;
  line-height: 1.6;
}
.step-num {
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 2px;
}
.share-icon {
  display: inline-block;
  color: #409eff;
  font-size: 18px;
}
.note {
  color: #999;
  font-size: 13px;
  margin-top: 16px;
}
</style>
