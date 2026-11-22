# =============================================================================
# Local Static Server for Days WinInstaller (Built-in PowerShell)
# =============================================================================
param(
    [int]$Port = 3456
)

$ErrorActionPreference = "SilentlyContinue"

$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistDir = Join-Path $AppDir "dist"
if (-not (Test-Path $DistDir)) {
    $DistDir = $AppDir
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://localhost:$Port/")
try {
    $Listener.Start()
} catch {
    # Server might already be active on this port
    exit 0
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $UrlPath = $Request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($UrlPath)) {
            $UrlPath = "index.html"
        }

        $TargetFile = Join-Path $DistDir $UrlPath

        # SPA Routing fallback
        if (-not (Test-Path $TargetFile -PathType Leaf)) {
            $TargetFile = Join-Path $DistDir "index.html"
        }

        if (Test-Path $TargetFile -PathType Leaf) {
            $Ext = [System.IO.Path]::GetExtension($TargetFile).ToLower()
            $ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { "application/octet-stream" }
            $Response.ContentType = $ContentType

            $Bytes = [System.IO.File]::ReadAllBytes($TargetFile)
            $Response.ContentLength64 = $Bytes.Length
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Response.StatusCode = 404
        }
        $Response.Close()
    } catch {
        # Continue loop on aborted client connections
    }
}
