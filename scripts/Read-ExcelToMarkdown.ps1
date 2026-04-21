<#
.SYNOPSIS
    Excelファイルを読み込み、Markdown形式に変換するスクリプト
.DESCRIPTION
    業務要件が記載されたExcelファイルを読み込み、AI（GitHub Copilot）が
    「AI作成ガイド_業務要件取込.md」に従って業務要件.mdを生成できる形式に変換します。
.PARAMETER ExcelPath
    読み込むExcelファイルのパス
.PARAMETER OutputPath
    出力するMarkdownファイルのパス（省略時は同じフォルダに_extracted.mdを作成）
.EXAMPLE
    .\Read-ExcelToMarkdown.ps1 -ExcelPath ".\工事管理\工事管理_業務要件.xlsx"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ExcelPath,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPath
)

# エラーハンドリング
$ErrorActionPreference = "Stop"

# 出力パスが指定されていない場合は自動生成
if (-not $OutputPath) {
    $dir = Split-Path $ExcelPath -Parent
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($ExcelPath)
    $OutputPath = Join-Path $dir "$baseName`_extracted.md"
}

Write-Host "📊 Excel読み込み開始: $ExcelPath" -ForegroundColor Cyan
Write-Host "📝 出力先: $OutputPath" -ForegroundColor Cyan

try {
    # Excel起動
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    
    # ファイルを開く
    $fullPath = (Resolve-Path $ExcelPath).Path
    $workbook = $excel.Workbooks.Open($fullPath)
    
    # Markdownコンテンツを生成
    $markdown = @"
# Excel抽出データ

> このファイルは ``Read-ExcelToMarkdown.ps1`` により自動生成されました。
> 元ファイル: ``$([System.IO.Path]::GetFileName($ExcelPath))``
> 抽出日時: $(Get-Date -Format "yyyy/MM/dd HH:mm:ss")

---

"@

    # 各シートを処理
    foreach ($sheet in $workbook.Worksheets) {
        $sheetName = $sheet.Name
        Write-Host "  📄 処理中: $sheetName" -ForegroundColor Yellow
        
        $markdown += "`n## $sheetName`n`n"
        
        $usedRange = $sheet.UsedRange
        if ($null -eq $usedRange -or $usedRange.Rows.Count -eq 0) {
            $markdown += "_（データなし）_`n"
            continue
        }
        
        $startRow = $usedRange.Row
        $rowCount = $usedRange.Rows.Count
        $endRow   = $startRow + $rowCount - 1
        $colCount = $usedRange.Columns.Count
        
        # ヘッダー行を取得
        $headers = @()
        for ($c = 1; $c -le $colCount; $c++) {
            $headerText = $sheet.Cells.Item($startRow, $c).Text
            if ([string]::IsNullOrWhiteSpace($headerText)) {
                $headerText = "列$c"
            }
            $headers += $headerText
        }
        
        # データが1行のみの場合（概要シートなど）
        if ($rowCount -le 1) {
            for ($c = 1; $c -le $colCount; $c++) {
                $value = $sheet.Cells.Item($startRow, $c).Text
                if (-not [string]::IsNullOrWhiteSpace($value)) {
                    $markdown += "- $value`n"
                }
            }
            continue
        }
        
        # 通常のテーブル形式
        # ヘッダー行
        $markdown += "| " + ($headers -join " | ") + " |`n"
        $markdown += "| " + (($headers | ForEach-Object { "---" }) -join " | ") + " |`n"
        
        # データ行（UsedRange の実際の開始行・終了行を使用）
        for ($r = ($startRow + 1); $r -le $endRow; $r++) {
            $row = @()
            $hasData = $false
            
            for ($c = 1; $c -le $colCount; $c++) {
                $cellValue = $sheet.Cells.Item($r, $c).Text
                if (-not [string]::IsNullOrWhiteSpace($cellValue)) {
                    $hasData = $true
                }
                # Markdownのパイプ文字をエスケープ
                $cellValue = $cellValue -replace '\|', '\|'
                $row += $cellValue
            }
            
            # 全セルが空の行はスキップ
            if ($hasData) {
                $markdown += "| " + ($row -join " | ") + " |`n"
            }
        }
        
        $markdown += "`n"
    }
    
    # ファイルに保存
    $markdown | Out-File -FilePath $OutputPath -Encoding UTF8
    
    Write-Host "✅ 完了: $OutputPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 シート数: $($workbook.Worksheets.Count)" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ エラーが発生しました: $_" -ForegroundColor Red
    throw
} finally {
    # Excel終了処理
    if ($workbook) {
        $workbook.Close($false)
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($workbook) | Out-Null
    }
    if ($excel) {
        $excel.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
