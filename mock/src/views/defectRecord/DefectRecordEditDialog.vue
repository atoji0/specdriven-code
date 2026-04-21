<!--
  ============================================================
  不具合記録編集ダイアログ（入力（基本）+ Konva手書きキャンバス）
  ファイル名: defectRecord/DefectRecordEditDialog.vue
  対応するUI仕様書: 車両不具合管理_UI仕様書_不具合記録管理.md
  ============================================================

  画面構成:
    - 車両コード入力（バーコードスキャン対応）
    - 不具合内容テキストエリア
    - カメラプレビュー → 撮影後に Konva ステージに切り替え
    - Konva 手書き（色・太さ選択、Undo、クリア）
    - 保存 / 保存して次を撮影 / 削除

  実業務への置き換えポイント:
    defectRecordApi → REST API 呼び出しに置き換える
    BarcodeDetector API → 対応ブラウザ依存（iOS Safari 非対応のため手入力フォールバック）
  ============================================================
-->
<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { confirmMessageBox, handleBusinessError } from "mzfw";
import type { DefectRecord } from "@/types/defectRecord";
import { defectRecordApi } from "@/api/defectRecordApi";
import Konva from "konva";
import BarcodeScannerDialog from "./BarcodeScannerDialog.vue";

// ─── emits ──────────────────────────────────────
const emit = defineEmits<{ (e: "saved"): void }>();

// ─── モード ───────────────────────────────────────
type Mode = "new" | "edit";
const visible = ref(false);
const mode = ref<Mode>("new");

// ─── バーコードスキャナー ────────────────────────────
const barcodeScanner = ref<InstanceType<typeof BarcodeScannerDialog> | null>(null);

const openBarcodeScanner = () => {
  barcodeScanner.value?.open();
};

const onBarcodeScanned = async (code: string) => {
  vehicleCode.value = code;
  await resolveVehicle();
};

// ─── フォームデータ ──────────────────────────────
const emptyForm = (): DefectRecord => ({
  vehicleId: 0,
  defectDescription: undefined,
  annotatedImage: "",
  thumbnailImage: "",
  recordedAt: new Date(),
  version: 0,
});
const form = ref<DefectRecord>(emptyForm());
const errors = ref<Record<string, string | undefined>>({});

// ─── 車両解決 ────────────────────────────────────
const vehicleCode = ref("");
const vehicleTypeName = ref("");

const resolveVehicle = async () => {
  vehicleTypeName.value = "";
  form.value.vehicleId = 0;
  errors.value.vehicleCode = undefined;
  errors.value.vehicleId = undefined;
  if (!vehicleCode.value) return;
  const result = await defectRecordApi.resolveVehicle(vehicleCode.value);
  if (result) {
    form.value.vehicleId = result.id;
    vehicleTypeName.value = result.vehicleTypeName;
    // 車両確定後にカメラ起動（新規モードのみ）
    if (mode.value === "new" && !hasPhoto.value) {
      await nextTick();
      initKonvaStage();
      await startCamera();
    }
  } else {
    errors.value.vehicleCode = "該当する車両が見つかりません";
  }
};

// ─── カメラ ─────────────────────────────────────
const videoEl = ref<HTMLVideoElement | null>(null);
const hasPhoto = ref(false);
const flashEnabled = ref(false);
let stream: MediaStream | null = null;
let imageCapture: any = null;

// 高解像度キャプチャ用
const capturedImageSrc = ref("");
const capturedNativeWidth = ref(0);
const capturedNativeHeight = ref(0);

const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      // ImageCapture API（非対応ブラウザは無視）
      const track = stream.getVideoTracks()[0];
      if (track && "ImageCapture" in window) {
        imageCapture = new (window as any).ImageCapture(track);
      }
    }
  } catch (e) {
    ElMessage.warning("カメラの起動に失敗しました。カメラの使用を許可してください。");
  }
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
};

const toggleFlash = async () => {
  flashEnabled.value = !flashEnabled.value;
  if (imageCapture) {
    try {
      await imageCapture.setOptions({ fillLightMode: flashEnabled.value ? "flash" : "off" });
    } catch {
      // 非対応時は無視
    }
  }
};

// ─── Konva ──────────────────────────────────────
const stageContainer = ref<HTMLDivElement | null>(null);
let stage: Konva.Stage | null = null;
let imageLayer: Konva.Layer | null = null;
let drawLayer: Konva.Layer | null = null;
let isDrawing = false;
let currentLine: Konva.Line | null = null;

// 描画設定
const strokeColor = ref("#e53935");
const strokeWidth = ref(6);

const colorOptions = [
  { value: "#e53935", label: "赤" },
  { value: "#1e88e5", label: "青" },
  { value: "#fdd835", label: "黄" },
  { value: "#43a047", label: "緑" },
  { value: "#ffffff", label: "白", border: true },
  { value: "#000000", label: "黒" },
];
const widthOptions = [
  { value: 3,  size: 6  },
  { value: 6,  size: 10 },
  { value: 12, size: 16 },
];

// ストローク履歴（Undo用）
const strokes = ref<Konva.Line[]>([]);

const initKonva = (containerWidth: number, containerHeight: number) => {
  if (!stageContainer.value) return;
  stage = new Konva.Stage({
    container: stageContainer.value,
    width: containerWidth,
    height: containerHeight,
  });
  imageLayer = new Konva.Layer();
  drawLayer = new Konva.Layer();
  stage.add(imageLayer);
  stage.add(drawLayer);

  // 描画イベント
  stage.on("mousedown touchstart", () => {
    if (!hasPhoto.value) return;
    isDrawing = true;
    const pos = stage!.getPointerPosition()!;
    currentLine = new Konva.Line({
      stroke: strokeColor.value,
      strokeWidth: strokeWidth.value,
      lineCap: "round",
      lineJoin: "round",
      globalCompositeOperation: "source-over",
      points: [pos.x, pos.y],
    });
    drawLayer!.add(currentLine);
  });

  stage.on("mousemove touchmove", (e) => {
    if (!isDrawing || !currentLine) return;
    e.evt.preventDefault();
    const pos = stage!.getPointerPosition()!;
    const newPoints = currentLine.points().concat([pos.x, pos.y]);
    currentLine.points(newPoints);
    drawLayer!.batchDraw();
  });

  stage.on("mouseup touchend", () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentLine) {
      strokes.value.push(currentLine);
      currentLine = null;
    }
  });
};

const capturePhoto = () => {
  if (!videoEl.value || !stage) return;
  const video = videoEl.value;
  const stageW = stage.width();
  const stageH = stage.height();

  // ネイティブ解像度でキャプチャ
  const nativeW = video.videoWidth || stageW;
  const nativeH = video.videoHeight || stageH;
  const nativeCanvas = document.createElement("canvas");
  nativeCanvas.width = nativeW;
  nativeCanvas.height = nativeH;
  nativeCanvas.getContext("2d")!.drawImage(video, 0, 0, nativeW, nativeH);
  capturedImageSrc.value = nativeCanvas.toDataURL("image/jpeg", 0.92);
  capturedNativeWidth.value = nativeW;
  capturedNativeHeight.value = nativeH;

  // Konva表示用に縮小してセット
  const img = new window.Image();
  img.onload = () => {
    imageLayer!.destroyChildren();
    const konvaImg = new Konva.Image({ image: img, width: stageW, height: stageH });
    imageLayer!.add(konvaImg);
    imageLayer!.batchDraw();
    clearCanvas();
    hasPhoto.value = true;
  };
  img.src = capturedImageSrc.value;

  // カメラ停止
  stopCamera();
};

const undoStroke = () => {
  const last = strokes.value.pop();
  if (last) {
    last.destroy();
    drawLayer!.batchDraw();
  }
};

const clearCanvas = () => {
  strokes.value.forEach((l) => l.destroy());
  strokes.value = [];
  drawLayer!.batchDraw();
};

// ─── 画像合成 ────────────────────────────────────
const buildImages = async (): Promise<{ annotated: string; thumbnail: string }> => {
  if (!stage) throw new Error("canvas not initialized");

  const annotated = stage.toDataURL({ mimeType: "image/jpeg", quality: 0.85 });

  // サムネイル：200×150 に縮小
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = 200;
  thumbCanvas.height = 150;
  const thumbCtx = thumbCanvas.getContext("2d")!;
  const fullImg = new window.Image();
  await new Promise<void>((resolve) => {
    fullImg.onload = () => {
      thumbCtx.drawImage(fullImg, 0, 0, 200, 150);
      resolve();
    };
    fullImg.src = annotated;
  });
  const thumbnail = thumbCanvas.toDataURL("image/jpeg", 0.7);

  return { annotated, thumbnail };
};

const retakePhoto = async () => {
  capturedImageSrc.value = "";
  capturedNativeWidth.value = 0;
  capturedNativeHeight.value = 0;
  hasPhoto.value = false;
  clearCanvas();
  await nextTick();
  await startCamera();
};

// ─── ダイアログ open/close ────────────────────────
const open = async (id: number | null) => {
  mode.value = id === null ? "new" : "edit";
  errors.value = {};
  form.value = emptyForm();
  vehicleCode.value = "";
  vehicleTypeName.value = "";
  hasPhoto.value = false;
  strokes.value = [];
  capturedImageSrc.value = "";
  capturedNativeWidth.value = 0;
  capturedNativeHeight.value = 0;
  visible.value = true;

  if (id !== null) {
    const data = await defectRecordApi.get(id);
    form.value = { ...data };
    vehicleCode.value = data.vehicleCode ?? "";
    vehicleTypeName.value = data.vehicleTypeName ?? "";
    // 保存済み画像を Konva に展開
    await nextTick();
    await loadSavedImage(data.annotatedImage);
    hasPhoto.value = true;
  } else {
    // 新規モード：車両コード引き継ぎがあれば photoセクション表示後にカメラ起動
    // （引き継ぎなしの場合は resolveVehicle() でカメラ起動）
    if (form.value.vehicleId) {
      await nextTick();
      initKonvaStage();
      await startCamera();
    }
  }
};

const initKonvaStage = () => {
  if (!stageContainer.value) return;
  // offsetWidth が 0 のときは親要素から計算（ダイアログ幅 - padding 分）
  const w = stageContainer.value.offsetWidth || stageContainer.value.parentElement?.clientWidth || 480;
  const h = Math.round(w * 0.75);
  stageContainer.value.style.height = h + "px";
  if (stage) { stage.destroy(); stage = null; }
  strokes.value = [];
  hasPhoto.value = false;
  initKonva(w, h);
};

const loadSavedImage = async (src: string) => {
  initKonvaStage();
  if (!src || !stage) return;
  const img = new window.Image();
  await new Promise<void>((resolve) => {
    img.onload = () => {
      imageLayer!.destroyChildren();
      const konvaImg = new Konva.Image({
        image: img,
        width: stage!.width(),
        height: stage!.height(),
      });
      imageLayer!.add(konvaImg);
      imageLayer!.batchDraw();
      resolve();
    };
    img.src = src;
  });
};

const close = () => {
  stopCamera();
  if (stage) { stage.destroy(); stage = null; }
  visible.value = false;
};

// ─── 保存 ────────────────────────────────────────
const save = async (andNext = false) => {
  errors.value = {};

  // バリデーション
  if (!form.value.vehicleId) {
    errors.value.vehicleCode = "車両コードを確定してください";
    return;
  }
  if (!hasPhoto.value) {
    errors.value.annotatedImage = "写真を撮影してください";
    return;
  }

  try {
    const { annotated, thumbnail } = await buildImages();
    form.value.annotatedImage = annotated;
    form.value.thumbnailImage = thumbnail;

    if (mode.value === "new") {
      form.value.recordedAt = new Date();
      await defectRecordApi.create(form.value);
      ElMessage.success("登録しました");
    } else {
      await defectRecordApi.update(form.value.id!, form.value);
      ElMessage.success("更新しました");
    }

    emit("saved");

    if (andNext) {
      // 車両コード・車種名を引き継ぐ
      const savedVehicleCode = vehicleCode.value;
      const savedVehicleId = form.value.vehicleId;
      const savedVehicleTypeName = vehicleTypeName.value;
      close();
      await nextTick();
      await open(null);
      vehicleCode.value = savedVehicleCode;
      form.value.vehicleId = savedVehicleId;
      vehicleTypeName.value = savedVehicleTypeName;
      // vehicleId が設定されたので photoセクション表示後にカメラ起動
      await nextTick();
      initKonvaStage();
      await startCamera();
    } else {
      close();
    }
  } catch (e: any) {
    if (e?.name === "BusinessError") {
      handleBusinessError(e, errors.value);
    } else {
      throw e;
    }
  }
};

const remove = async () => {
  const ok = await confirmMessageBox("削除します。よろしいですか？");
  if (!ok) return;
  try {
    await defectRecordApi.remove(form.value.id!, form.value.version);
    ElMessage.success("削除しました");
    emit("saved");
    close();
  } catch (e: any) {
    if (e?.name === "BusinessError") {
      handleBusinessError(e, errors.value);
    } else {
      throw e;
    }
  }
};

// ─── ダイアログを閉じたとき ──────────────────────
watch(visible, (v) => {
  if (!v) {
    stopCamera();
  }
});

// ─── コンポーネント破棄時 ────────────────────────
onUnmounted(() => {
  stopCamera();
  if (stage) stage.destroy();
});

// ─── 外部公開 ─────────────────────────────────────
defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="mode === 'new' ? '不具合記録編集（新規）' : '不具合記録編集'"
    width="min(92vw, 560px)"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="close"
  >
    <el-form label-width="110px" class="defect-form">

      <!-- 不具合記録ID（更新時のみ表示） -->
      <el-form-item v-if="mode === 'edit'" label="不具合記録ID">
        <span>{{ form.id }}</span>
      </el-form-item>

      <!-- 車両コード -->
      <el-form-item label="車両コード" :error="errors.vehicleCode || errors.vehicleId">
        <div class="vehicle-code-row">
          <el-input
            v-model="vehicleCode"
            placeholder="半角数字10桁"
            maxlength="10"
            class="cell-required vehicle-code-input"
            :class="{ 'cell-error': errors.vehicleCode || errors.vehicleId }"
            @keyup.enter="resolveVehicle"
            @input="(v: string) => { if (v.length === 10) resolveVehicle(); }"
          />
          <el-button @click="openBarcodeScanner">
            <el-icon><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M1 5h2v14H1zm3 0h1v14H4zm4 0h2v14H8zm3 0h1v14h-1zm2 0h2v14h-2zm3 0h1v14h-1zm2 0h2v14h-2z"/></svg></el-icon>
            スキャン
          </el-button>
        </div>
      </el-form-item>

      <!-- 車種名（自動表示） -->
      <el-form-item label="車種名">
        <span>{{ vehicleTypeName || "（車両コード入力後に表示）" }}</span>
      </el-form-item>

      <!-- 不具合内容 -->
      <el-form-item label="不具合内容" :error="errors.defectDescription">
        <el-input
          v-model="form.defectDescription"
          maxlength="256"
          show-word-limit
          placeholder="不具合の内容を入力してください（任意）"
          :class="{ 'cell-error': errors.defectDescription }"
        />
      </el-form-item>

      <!-- 作成日時は非表示 -->
    </el-form>

    <!-- ▼ 写真・手書きエリア（車両コード確定後のみ表示） ─── -->
    <div v-if="form.vehicleId" class="photo-section">
      <div class="photo-title">■ 写真・手書き</div>

      <!-- カメラプレビュー（撮影前） -->
      <div v-if="!hasPhoto" class="camera-area">
        <video
          ref="videoEl"
          autoplay
          playsinline
          muted
          style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;"
        />
      </div>

      <!-- Konva ステージ（hasPhoto のときのみ表示） -->
      <div
        ref="stageContainer"
        class="stage-container"
        v-show="hasPhoto"
      />

      <!-- エラー表示（写真未撮影） -->
      <div v-if="errors.annotatedImage" class="el-form-item__error mt-1 ml-2">
        {{ errors.annotatedImage }}
      </div>

      <!-- 色・太さ選択（ペイント風）：撮影後のみ表示 -->
      <div v-show="hasPhoto" class="draw-controls">
        <!-- 色スウォッチ -->
        <div class="swatch-group">
          <button
            v-for="opt in colorOptions"
            :key="opt.value"
            class="swatch"
            :class="{ 'swatch--active': strokeColor === opt.value, 'swatch--border': opt.border }"
            :style="{ background: opt.value }"
            :title="opt.label"
            @click="strokeColor = opt.value"
          />
        </div>
        <!-- 太さアイコン -->
        <div class="width-group">
          <button
            v-for="opt in widthOptions"
            :key="opt.value"
            class="width-btn"
            :class="{ 'width-btn--active': strokeWidth === opt.value }"
            :title="opt.value + 'px'"
            @click="strokeWidth = opt.value"
          >
            <span
              class="width-dot"
              :style="{ width: opt.size + 'px', height: opt.size + 'px', background: strokeColor }"
            />
          </button>
        </div>
      </div>

      <!-- 撮影・フラッシュ・Undo・クリアボタン -->
      <div class="action-buttons">
        <el-button
          v-if="!hasPhoto"
          type="primary"
          @click="capturePhoto"
        >
          <el-icon><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4zm0 1.8a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM9 3l-1.83 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9z"/></svg></el-icon>
          撮影
        </el-button>
        <el-button
          v-if="!hasPhoto"
          :type="flashEnabled ? 'warning' : 'default'"
          @click="toggleFlash"
        >
          <el-icon><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/></svg></el-icon>
          フラッシュ {{ flashEnabled ? "ON" : "OFF" }}
        </el-button>
        <el-button
          v-if="hasPhoto"
          :disabled="strokes.length === 0"
          @click="undoStroke"
        >
          <el-icon><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62A6.99 6.99 0 0 1 12.5 10c3.04 0 5.62 1.96 6.54 4.69l1.93-.65C19.8 10.56 16.45 8 12.5 8z"/></svg></el-icon>
          Undo
        </el-button>
        <el-button
          v-if="hasPhoto"
          @click="clearCanvas"
        >
          <el-icon><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></el-icon>
          クリア
        </el-button>
        <el-button
          v-if="hasPhoto"
          @click="retakePhoto"
        >
          <el-icon><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 6v3l4-4-4-4v3a8 8 0 0 0-8 8 8 8 0 0 0 8 8 8 8 0 0 0 8-8h-2a6 6 0 0 1-6 6 6 6 0 0 1-6-6 6 6 0 0 1 6-6z"/></svg></el-icon>
          撮り直し
        </el-button>
      </div>
    </div>

    <!-- ▼ フッター ────────────────────────────────── -->
    <template #footer>
      <el-button
        v-if="form.vehicleId"
        type="primary"
        :disabled="!hasPhoto"
        @click="save(false)"
      >
        保存
      </el-button>
      <el-button
        v-if="form.vehicleId && mode === 'new'"
        type="primary"
        :disabled="!hasPhoto"
        @click="save(true)"
      >
        保存して次を撮影
      </el-button>
      <el-button
        v-if="mode === 'edit'"
        type="danger"
        @click="remove"
      >
        削除
      </el-button>
      <el-button @click="close">キャンセル</el-button>
    </template>
  </el-dialog>

  <!-- バーコードスキャナー -->
  <BarcodeScannerDialog ref="barcodeScanner" @scanned="onBarcodeScanned" />
</template>

<style scoped>
.defect-form {
  margin-bottom: 0;
}

.vehicle-code-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
}

.vehicle-code-input {
  flex: 1;
  min-width: 0;
}

.photo-section {
  margin-top: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
}

.photo-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.camera-area {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #222;
  border-radius: 6px;
  overflow: hidden;
}

.stage-container {
  width: 100%;
  background: #111;
  border-radius: 6px;
  overflow: hidden;
  touch-action: none;
}

.draw-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
  padding: 6px 8px;
  background: #f5f5f5;
  border-radius: 8px;
}

.swatch-group {
  display: flex;
  gap: 6px;
  align-items: center;
}

.swatch {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.1s, border-color 0.1s;
}
.swatch--border {
  border-color: #ccc !important;
}
.swatch--active {
  border-color: #333 !important;
  transform: scale(1.25);
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #333;
}

.width-group {
  display: flex;
  gap: 4px;
  align-items: center;
  border-left: 1px solid #ddd;
  padding-left: 12px;
}

.width-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid transparent;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.1s, background 0.1s;
}
.width-btn--active {
  border-color: #409eff;
  background: #ecf5ff;
}

.width-dot {
  border-radius: 50%;
  display: block;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
</style>
