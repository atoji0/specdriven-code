<#
.SYNOPSIS
    PDFファイルをページごとにPNG画像に変換するスクリプト
.DESCRIPTION
    Windows 10以降に組み込まれているWinRT API（Windows.Data.Pdf）を使用して
    PDFの各ページをPNG画像に変換します。追加ツールのインストール不要。
    変換後の画像はGitHub Copilotによる業務要件の画像解析に使用します。
.PARAMETER PdfPath
    変換するPDFファイルのパス
.PARAMETER OutputDir
    画像の出力先フォルダ（省略時はPDFと同じフォルダに作成）
.PARAMETER Dpi
    解像度（dpi）。省略時は300。さらに高精度が必要な場合は 400〜600 を指定。
.EXAMPLE
    .\Convert-PdfToImages.ps1 -PdfPath ".\入力資料\業務フロー.pdf"
.EXAMPLE
    .\Convert-PdfToImages.ps1 -PdfPath ".\業務フロー.pdf" -OutputDir ".\入力資料" -Dpi 400
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$PdfPath,

    [Parameter(Mandatory=$false)]
    [string]$OutputDir,

    [Parameter(Mandatory=$false)]
    [int]$Dpi = 300
)

$ErrorActionPreference = "Stop"

# ---- パス解決 ---------------------------------------------------------------
$fullPdfPath = (Resolve-Path $PdfPath).Path

if (-not $OutputDir) {
    $OutputDir = Split-Path $fullPdfPath -Parent
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$baseName = [System.IO.Path]::GetFileNameWithoutExtension($fullPdfPath)

Write-Host "PDF変換開始: $fullPdfPath" -ForegroundColor Cyan
Write-Host "出力先: $OutputDir" -ForegroundColor Cyan
Write-Host "解像度: $Dpi dpi" -ForegroundColor Cyan

# ---- WinRT アセンブリをロード ------------------------------------------------
try {
    [void][System.Reflection.Assembly]::LoadWithPartialName("System.Runtime.WindowsRuntime")
    $null = [Windows.Data.Pdf.PdfDocument,  Windows.Data.Pdf, ContentType=WindowsRuntime]
    $null = [Windows.Storage.StorageFile,   Windows.Storage,  ContentType=WindowsRuntime]
} catch {
    Write-Error "WinRT APIのロードに失敗しました。Windows 10以降が必要です。`n$($_.Exception.Message)"
    exit 1
}

# ---- WinRT 非同期ヘルパー（呼び出し側で戻り型を明示） -----------------------
# IAsyncOperation<T>: Await $op [T]
# IAsyncAction      : Await $op
function Await($asyncOp, $resultType = $null) {
    if ($null -ne $resultType) {
        $m = [System.WindowsRuntimeSystemExtensions].GetMethods() |
             Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod } |
             Select-Object -First 1
        $task = $m.MakeGenericMethod($resultType).Invoke($null, @($asyncOp))
        $task.Wait()
        return $task.Result
    } else {
        $m = [System.WindowsRuntimeSystemExtensions].GetMethods() |
             Where-Object { $_.Name -eq 'AsTask' -and -not $_.IsGenericMethod } |
             Select-Object -First 1
        $task = $m.Invoke($null, @($asyncOp))
        $task.Wait()
    }
}

$sfType  = [Windows.Storage.StorageFile,  Windows.Storage,  ContentType=WindowsRuntime]
$pdfType = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime]

# ---- PDFをロード -------------------------------------------------------------
try {
    $storageFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPdfPath)) $sfType
    $pdfDoc      = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($storageFile)) $pdfType
} catch {
    Write-Error "PDFの読み込みに失敗しました。`n$($_.Exception.Message)"
    exit 1
}

$pageCount = $pdfDoc.PageCount
Write-Host "ページ数: $pageCount"

# ---- ページごとにPNG出力 -----------------------------------------------------
$successCount = 0
for ($i = 0; $i -lt $pageCount; $i++) {
    $pageNum  = $i + 1
    $fileName = "${baseName}_page{0:D3}.png" -f $pageNum
    $outPath  = Join-Path $OutputDir $fileName

    try {
        $page  = $pdfDoc.GetPage([uint32]$i)
        $scale = $Dpi / 96.0
        $width  = [int]($page.Size.Width  * $scale)
        $height = [int]($page.Size.Height * $scale)

        $stream    = [System.IO.File]::OpenWrite($outPath)
        $rasStream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($stream)

        $options = [Windows.Data.Pdf.PdfPageRenderOptions]::new()
        $options.DestinationWidth  = [uint32]$width
        $options.DestinationHeight = [uint32]$height

        Await ($page.RenderToStreamAsync($rasStream, $options))               # IAsyncAction
        Await ($rasStream.FlushAsync()) ([System.Boolean]) | Out-Null         # IAsyncOperation<bool>

        $rasStream.Dispose()
        $stream.Close()
        $stream.Dispose()
        $page.Dispose()

        Write-Host ("  OK: {0} ({1}x{2}px)" -f $fileName, $width, $height) -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host ("  NG: page {0} - {1}" -f $pageNum, $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "完了: $successCount / $pageCount ページ変換" -ForegroundColor Cyan
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "  ${baseName}_page*.png をチャットに追加して '仕様書を作成して' と依頼してください。" -ForegroundColor Yellow