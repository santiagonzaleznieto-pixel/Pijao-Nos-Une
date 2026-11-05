<#
Pijao nos une · Respaldo propio (Fase 1, bloque 1.2 · documento maestro 8.10)

El plan gratuito de Supabase NO trae respaldos. Este script, en el computador del Administrador:
  1. Hace pg_dump de la base (con la imagen gratuita postgres:17 de Docker).
  2. Descarga los archivos del almacenamiento (fotos y documentos).
  3. Cifra todo con AES-256 (cifrado incluido en Windows, sin programas de pago).
  4. Guarda el resultado en la carpeta de respaldos y borra los de más de 30 días.
NUNCA suba estos respaldos a GitHub: el repositorio es público.

Uso:
  powershell -ExecutionPolicy Bypass -File tools\respaldo.ps1 -Configurar     (una vez: guarda las credenciales cifradas para su usuario de Windows)
  powershell -ExecutionPolicy Bypass -File tools\respaldo.ps1                  (respaldo; programarlo cada noche en el Programador de tareas)
  powershell -ExecutionPolicy Bypass -File tools\respaldo.ps1 -Descifrar <archivo.cifrado>   (para restaurar)
#>
param(
  [switch]$Configurar,
  [string]$Descifrar,
  [string]$Destino = "$env:USERPROFILE\Documents\PijaoRespaldos"
)
$ErrorActionPreference = "Stop"
$archivoCred = Join-Path $env:APPDATA "PijaoNosUne\respaldo.cred"

function Proteger([string]$t) { ConvertTo-SecureString $t -AsPlainText -Force | ConvertFrom-SecureString }
function Revelar([string]$t) {
  $s = ConvertTo-SecureString $t
  [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}

function Cifrar-Archivo([string]$entrada, [string]$salida, [string]$clave) {
  $sal = New-Object byte[] 16; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($sal)
  $kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes($clave, $sal, 200000)
  $aes = [Security.Cryptography.Aes]::Create(); $aes.KeySize = 256; $aes.Key = $kdf.GetBytes(32); $aes.GenerateIV()
  $out = [IO.File]::Create($salida)
  try {
    $out.Write([Text.Encoding]::ASCII.GetBytes("PIJAO1"), 0, 6); $out.Write($sal, 0, 16); $out.Write($aes.IV, 0, 16)
    $cs = New-Object Security.Cryptography.CryptoStream($out, $aes.CreateEncryptor(), "Write")
    $in = [IO.File]::OpenRead($entrada); $in.CopyTo($cs); $in.Close(); $cs.FlushFinalBlock(); $cs.Close()
  } finally { $out.Dispose() }
}

function Descifrar-Archivo([string]$entrada, [string]$salida, [string]$clave) {
  $in = [IO.File]::OpenRead($entrada)
  try {
    $cab = New-Object byte[] 6; [void]$in.Read($cab, 0, 6)
    if ([Text.Encoding]::ASCII.GetString($cab) -ne "PIJAO1") { throw "El archivo no es un respaldo de Pijao" }
    $sal = New-Object byte[] 16; [void]$in.Read($sal, 0, 16); $iv = New-Object byte[] 16; [void]$in.Read($iv, 0, 16)
    $kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes($clave, $sal, 200000)
    $aes = [Security.Cryptography.Aes]::Create(); $aes.KeySize = 256; $aes.Key = $kdf.GetBytes(32); $aes.IV = $iv
    $cs = New-Object Security.Cryptography.CryptoStream($in, $aes.CreateDecryptor(), "Read")
    $out = [IO.File]::Create($salida); $cs.CopyTo($out); $out.Close(); $cs.Close()
  } finally { $in.Dispose() }
}

if ($Configurar) {
  New-Item -ItemType Directory -Force (Split-Path $archivoCred) | Out-Null
  Write-Host "Datos del panel de Supabase (Project Settings). Se guardan cifrados SOLO para su usuario de Windows."
  $url = Read-Host "Cadena de conexión de la base (Session pooler, empieza por postgresql://)"
  $api = Read-Host "URL del proyecto (https://xxxx.supabase.co)"
  $srv = Read-Host "Clave service_role (nunca la comparta ni la ponga en la app)"
  $cla = Read-Host "Frase para cifrar los respaldos (guárdela también en papel, fuera de línea)"
  @{ db = (Proteger $url); api = (Proteger $api); srv = (Proteger $srv); clave = (Proteger $cla) } |
    ConvertTo-Json | Set-Content -Encoding utf8 $archivoCred
  Write-Host "Listo. Programe 'tools\respaldo.ps1' cada noche en el Programador de tareas de Windows."
  exit 0
}

if (-not (Test-Path $archivoCred)) { throw "Primero ejecute: tools\respaldo.ps1 -Configurar" }
$cred = Get-Content -Raw $archivoCred | ConvertFrom-Json
$clave = Revelar $cred.clave

if ($Descifrar) {
  $salida = $Descifrar -replace "\.cifrado$", ""
  Descifrar-Archivo $Descifrar $salida $clave
  Write-Host "Descifrado en: $salida"
  exit 0
}

$fecha = Get-Date -Format "yyyy-MM-dd_HHmm"
$tmp = Join-Path $env:TEMP "pijao_respaldo_$fecha"
New-Item -ItemType Directory -Force $tmp, $Destino | Out-Null

# 1) Base de datos
Write-Host "Respaldando la base..."
$db = Revelar $cred.db
docker run --rm -e "PGCONN=$db" -v "${tmp}:/salida" postgres:17 sh -c 'pg_dump "$PGCONN" -Fc --no-owner -f /salida/base.dump'
if ($LASTEXITCODE -ne 0) { throw "pg_dump falló" }

# 2) Archivos del almacenamiento
Write-Host "Descargando archivos..."
$api = Revelar $cred.api; $srv = Revelar $cred.srv
$h = @{ apikey = $srv; Authorization = "Bearer $srv" }
function Listar([string]$bucket, [string]$prefijo) {
  $offset = 0
  do {
    $cuerpo = @{ prefix = $prefijo; limit = 1000; offset = $offset } | ConvertTo-Json
    $items = Invoke-RestMethod -Method Post -Uri "$api/storage/v1/object/list/$bucket" -Headers $h -ContentType "application/json" -Body $cuerpo
    foreach ($i in $items) {
      $ruta = if ($prefijo) { "$prefijo/$($i.name)" } else { $i.name }
      if ($null -eq $i.id) { Listar $bucket $ruta } else { $ruta }
    }
    $offset += 1000
  } while ($items.Count -eq 1000)
}
foreach ($bucket in @("fotos", "documentos")) {
  foreach ($ruta in (Listar $bucket "")) {
    $local = Join-Path $tmp "archivos\$bucket\$($ruta -replace '/', '\')"
    New-Item -ItemType Directory -Force (Split-Path $local) | Out-Null
    Invoke-WebRequest -Uri "$api/storage/v1/object/$bucket/$ruta" -Headers $h -OutFile $local -UseBasicParsing
  }
}

# 3) Empaquetar y cifrar
$zip = Join-Path $env:TEMP "pijao_$fecha.zip"
Compress-Archive -Path "$tmp\*" -DestinationPath $zip -Force
$final = Join-Path $Destino "pijao_$fecha.zip.cifrado"
Cifrar-Archivo $zip $final $clave
Remove-Item -Recurse -Force $tmp, $zip

# 4) Retención: 30 días en el disco del Administrador (la copia semanal a USB se hace a mano)
Get-ChildItem $Destino -Filter "pijao_*.cifrado" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Force
Write-Host "Respaldo listo: $final"
