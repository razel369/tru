param(
  [string]$MotionRoot = (Join-Path $PSScriptRoot "..\assets\pet-motion"),
  [string]$OutputPath = (Join-Path $PSScriptRoot "..\artifacts\blink-qa-contact-sheet.png"),
  [string[]]$Folders
)

$ErrorActionPreference = "Stop"
$magick = "C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"

if (-not (Test-Path -LiteralPath $magick)) {
  throw "ImageMagick was not found at $magick"
}

if (-not $Folders -or $Folders.Count -eq 0) {
  $Folders = Get-ChildItem -LiteralPath $MotionRoot -Directory |
    Where-Object { $_.Name -ne "stages" } |
    Sort-Object Name |
    ForEach-Object Name
}

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$tiles = [System.Collections.Generic.List[string]]::new()
$temporaryTiles = [System.Collections.Generic.List[string]]::new()

try {
  foreach ($folder in $Folders) {
    $directory = Join-Path $MotionRoot $folder
    $idleCandidates = @(
      "idle-luna-style-v1.png",
      "idle-v2.png",
      "idle-v1.png",
      "idle.png"
    )
    $halfCandidates = @("blink-half-v2.png", "blink-half.png")
    $closedCandidates = @("blink-v2.png", "blink.png")

    $idle = $idleCandidates |
      ForEach-Object { Join-Path $directory $_ } |
      Where-Object { Test-Path -LiteralPath $_ } |
      Select-Object -First 1
    $half = $halfCandidates |
      ForEach-Object { Join-Path $directory $_ } |
      Where-Object { Test-Path -LiteralPath $_ } |
      Select-Object -First 1
    $closed = $closedCandidates |
      ForEach-Object { Join-Path $directory $_ } |
      Where-Object { Test-Path -LiteralPath $_ } |
      Select-Object -First 1

    if (-not $idle -or -not $half -or -not $closed) {
      Write-Warning "Skipping incomplete blink set: $folder"
      continue
    }

    $label = $folder -replace '^breed-', '' -replace '^pet-', '' -replace '-', ' '
    $tilePath = Join-Path $env:TEMP ("pawpair-blink-qa-{0}.png" -f ([Guid]::NewGuid().ToString("N")))
    $arguments = @(
      "montage",
      $idle,
      $half,
      $closed,
      "-thumbnail", "220x220",
      "-tile", "3x1",
      "-geometry", "+7+7",
      "-background", "#F6F0E7",
      "-bordercolor", "#D8CFC3",
      "-border", "1",
      "-set", "label", $label,
      $tilePath
    )
    & $magick @arguments
    if ($LASTEXITCODE -ne 0) {
      throw "ImageMagick failed for $folder"
    }
    $tiles.Add($tilePath)
    $temporaryTiles.Add($tilePath)
  }

  if ($tiles.Count -eq 0) {
    throw "No complete blink sets were found"
  }

  & $magick montage @tiles "-tile" "1x" "-geometry" "+0+8" "-background" "#E8DFD3" $OutputPath
  if ($LASTEXITCODE -ne 0) {
    throw "ImageMagick failed to create the contact sheet"
  }

  Write-Output $OutputPath
}
finally {
  foreach ($tile in $temporaryTiles) {
    Remove-Item -LiteralPath $tile -Force -ErrorAction SilentlyContinue
  }
}
