<!--
  ============================================================
  バーコードスキャナーダイアログ
  - OutSystems 実装に合わせた方式:
    ・decodeFromConstraints に video 要素の id 文字列を渡す
    ・停止時は reader.reset() + stream.getTracks().stop() + srcObject = null
  ============================================================
-->
<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { BrowserMultiFormatReader } from "@zxing/browser";

const emit = defineEmits<{ (e: "scanned", code: string): void }>();

const visible       = ref(false);
const videoEl       = ref<HTMLVideoElement | null>(null);
const scanning      = ref(false);
const statusMessage = ref("カメラを起動中...");

let activeControls: { stop: () => void } | null = null;
let activeTrack: MediaStreamTrack | null = null;

const torchOn        = ref(false);
const torchSupported = ref(false);

// ─── 公開 API ──────────────────────────────────────
const open = () => {
  visible.value       = true;
  scanning.value      = false;
  statusMessage.value = "カメラを起動中...";
  torchOn.value       = false;
  torchSupported.value = false;
  setTimeout(() => startScan(), 300);
};

// ─── スキャン開始 ─────────────────────────────────
const startScan = async () => {
  resetDecode();
  if (!videoEl.value) return;

  try {
    const reader = new BrowserMultiFormatReader();

    scanning.value      = true;
    statusMessage.value = "バーコードをカメラに向けてください";

    // カメラ起動後にトーチ対応チェック
    if (videoEl.value?.srcObject) {
      const stream = videoEl.value.srcObject as MediaStream;
      const track  = stream.getVideoTracks()[0];
      if (track) {
        activeTrack = track;
        const caps = track.getCapabilities?.() as any;
        torchSupported.value = !!caps?.torch;
      }
    }

    activeControls = await reader.decodeFromConstraints(
      {
        video: {
          facingMode: "environment",
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      videoEl.value,
      (result) => {
        if (result) {
          const code = result.getText();
          if (code) {
            resetDecode();
            scanning.value = false;
            emit("scanned", code);
            visible.value = false;
          }
        }
      }
    );

  } catch (e: any) {
    scanning.value = false;
    statusMessage.value = e?.name === "NotAllowedError"
      ? "カメラの使用が許可されていません"
      : `カメラ起動エラー: ${e?.message ?? String(e)}`;
  }
};

// ─── ライト（トーチ）トグル ────────────────────────
const toggleTorch = async () => {
  if (!activeTrack || !torchSupported.value) return;
  torchOn.value = !torchOn.value;
  try {
    await activeTrack.applyConstraints({
      advanced: [{ torch: torchOn.value } as any],
    });
  } catch {
    torchOn.value = !torchOn.value; // 失敗したら戻す
    torchSupported.value = false;
  }
};

// ─── OutSystems 方式のリセット ─────────────────────
// controls.stop() + ストリーム停止 + srcObject = null の3段階
const resetDecode = () => {
  activeControls?.stop();
  activeControls = null;
  activeTrack = null;
  torchOn.value = false;
  const video = videoEl.value;
  if (video) {
    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
};

const close = () => {
  resetDecode();
  scanning.value = false;
  visible.value  = false;
};

onUnmounted(() => resetDecode());
defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    title="バーコードスキャン"
    width="min(95vw, 500px)"
    :close-on-click-modal="false"
    @closed="close"
  >
    <div class="scanner-body">

      <!-- カメラプレビュー -->
      <div class="video-wrapper">
        <video ref="videoEl" autoplay playsinline muted class="preview" />
        <div v-if="scanning" class="scan-line" />
        <div v-if="!scanning" class="camera-loading">{{ statusMessage }}</div>
      </div>

      <p v-if="scanning" class="status">{{ statusMessage }}</p>

      <!-- ライトボタン（対応デバイスのみ表示） -->
      <el-button
        v-if="torchSupported"
        :type="torchOn ? 'warning' : 'default'"
        size="small"
        @click="toggleTorch"
      >
        ライト {{ torchOn ? "ON" : "OFF" }}
      </el-button>

    </div>

    <template #footer>
      <el-button @click="close">キャンセル</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.scanner-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.video-wrapper {
  position: relative;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 4 / 3;
  background: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}
.preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.camera-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 14px;
  text-align: center;
  padding: 8px;
}
.scan-line {
  position: absolute;
  left: 5%;
  width: 90%;
  height: 3px;
  background: rgba(255, 60, 60, 0.9);
  box-shadow: 0 0 10px rgba(255, 60, 60, 0.8);
  animation: scan 2s ease-in-out infinite;
}
@keyframes scan {
  0%   { top: 20%; }
  50%  { top: 75%; }
  100% { top: 20%; }
}
.status {
  font-size: 12px;
  color: #555;
  margin: 0;
  text-align: center;
}
</style>
