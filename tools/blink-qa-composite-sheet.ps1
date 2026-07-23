param(
  [string]$MotionRoot = (Join-Path $PSScriptRoot "..\assets\pet-motion"),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\artifacts\blink-qa-composite"),
  [int]$PageSize = 8,
  [string[]]$Folders
)

$ErrorActionPreference = "Stop"
$magick = "C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"

if (-not (Test-Path -LiteralPath $magick)) {
  throw "ImageMagick was not found at $magick"
}
if ($PageSize -lt 1) {
  throw "PageSize must be positive"
}

if (-not $Folders -or $Folders.Count -eq 0) {
  $Folders = Get-ChildItem -LiteralPath $MotionRoot -Directory |
    Where-Object { $_.Name -ne "stages" } |
    Sort-Object Name |
    ForEach-Object Name
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$temporaryFiles = [System.Collections.Generic.List[string]]::new()
$rowFiles = [System.Collections.Generic.List[string]]::new()
$outputs = [System.Collections.Generic.List[string]]::new()

function Resolve-FirstExistingFile {
  param([string]$Directory, [string[]]$Candidates)
  foreach ($candidate in $Candidates) {
    $path = Join-Path $Directory $candidate
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }
  return $null
}

function New-FrameTile {
  param(
    [string]$Idle,
    [string]$Overlay,
    [string]$Caption
  )

  $output = Join-Path $env:TEMP ("pawpair-blink-frame-{0}.png" -f ([Guid]::NewGuid().ToString("N")))
  $arguments = [System.Collections.Generic.List[string]]::new()
  $arguments.Add($Idle)
  if ($Overlay) {
    $arguments.Add($Overlay)
    $arguments.Add("-composite")
  }
  foreach ($argument in @(
    "-thumbnail", "238x238",
    "-background", "#D8CFC3",
    "-gravity", "center",
    "-extent", "248x248",
    "-gravity", "south",
    "-splice", "0x30",
    "-font", "Arial",
    "-pointsize", "15",
    "-fill", "#27313B",
    "-annotate", "+0+7", $Caption,
    $output
  )) {
    $arguments.Add($argument)
  }

  & $magick @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "ImageMagick failed while rendering $Caption"
  }
  $temporaryFiles.Add($output)
  return $output
}

try {
  foreach ($folder in $Folders) {
    $directory = Join-Path $MotionRoot $folder
    $idle = Resolve-FirstExistingFile $directory @(
      "idle-luna-style-v1.png",
      "idle-v2.png",
      "idle-v1.png",
      "idle.png"
    )
    $half = Resolve-FirstExistingFile $directory @("blink-half-v2.png", "blink-half.png")
    $closed = Resolve-FirstExistingFile $directory @("blink-v2.png", "blink.png")

    if (-not $idle -or -not $half -or -not $closed) {
      Write-Warning "Skipping incomplete blink set: $folder"
      continue
    }

    $openTile = New-FrameTile -Idle $idle -Caption "OPEN"
    $halfTile = New-FrameTile -Idle $idle -Overlay $half -Caption "HALF"
    $closedTile = New-FrameTile -Idle $idle -Overlay $closed -Caption "CLOSED"
    $row = Join-Path $env:TEMP ("pawpair-blink-row-{0}.png" -f ([Guid]::NewGuid().ToString("N")))
    $label = ($folder -replace '^breed-', '' -replace '^pet-', '' -replace '-', ' ').ToUpperInvariant()

    & $magick montage $openTile $halfTile $closedTile `
      "-tile" "3x1" "-geometry" "+5+5" "-background" "#F6F0E7" $row
    if ($LASTEXITCODE -ne 0) {
      throw "ImageMagick failed while composing $folder"
    }
    & $magick $row `
      "-background" "#F6F0E7" "-gravity" "north" "-splice" "0x34" `
      "-font" "Arial" "-pointsize" "18" "-fill" "#27313B" `
      "-annotate" "+0+8" $label $row
    if ($LASTEXITCODE -ne 0) {
      throw "ImageMagick failed while labeling $folder"
    }
    $rowFiles.Add($row)
    $temporaryFiles.Add($row)
  }

  if ($rowFiles.Count -eq 0) {
    throw "No complete blink sets were found"
  }

  for ($pageStart = 0; $pageStart -lt $rowFiles.Count; $pageStart += $PageSize) {
    $pageNumber = [Math]::Floor($pageStart / $PageSize) + 1
    $pageEnd = [Math]::Min($pageStart + $PageSize - 1, $rowFiles.Count - 1)
    $pageRows = @($rowFiles[$pageStart..$pageEnd])
    $output = Join-Path $OutputDirectory ("blink-qa-page-{0:D2}.png" -f $pageNumber)
    & $magick montage @pageRows `
      "-tile" "1x" "-geometry" "+0+7" "-background" "#E8DFD3" $output
    if ($LASTEXITCODE -ne 0) {
      throw "ImageMagick failed while creating page $pageNumber"
    }
    $outputs.Add($output)
  }

  $outputs
}
finally {
  foreach ($file in $temporaryFiles) {
    Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
  }
}
