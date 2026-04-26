param(
  [int]$Port = 8080,
  [string]$Root = (Split-Path -Parent $MyInvocation.MyCommand.Path)
)

$ErrorActionPreference = 'Stop'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), $Port)
$listener.Start()
Write-Host "EVZA Gallery local server: http://127.0.0.1:$Port/"

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg' = 'image/svg+xml'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico' = 'image/x-icon'
  '.txt' = 'text/plain; charset=utf-8'
}

function Send-Response($stream, [int]$status, [string]$statusText, [byte[]]$body, [string]$contentType) {
  $headers = "HTTP/1.1 $status $statusText`r`nContent-Length: $($body.Length)`r`nContent-Type: $contentType`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $headBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $line = $reader.ReadLine()
    if (-not $line) { $client.Close(); continue }

    $parts = $line.Split(' ')
    $urlPath = [System.Uri]::UnescapeDataString(($parts[1] -split '\?')[0])
    if ($urlPath -eq '/') { $urlPath = '/index.html' }
    $relative = $urlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))
    $rootPath = [System.IO.Path]::GetFullPath($Root)

    do {
      $headerLine = $reader.ReadLine()
    } while ($null -ne $headerLine -and $headerLine.Length -gt 0)

    if (-not $fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 - Ficheiro não encontrado')
      Send-Response $stream 404 'Not Found' $body 'text/plain; charset=utf-8'
      $client.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $contentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    Send-Response $stream 200 'OK' $bytes $contentType
    $stream.Flush()
  } catch {
    try {
      $body = [System.Text.Encoding]::UTF8.GetBytes("500 - $($_.Exception.Message)")
      Send-Response $stream 500 'Server Error' $body 'text/plain; charset=utf-8'
    } catch {}
  } finally {
    $client.Close()
  }
}
