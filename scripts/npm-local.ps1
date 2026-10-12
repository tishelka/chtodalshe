param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NpmArguments)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskNodePath = Join-Path $taskRoot '.tools\node_modules\node\bin\node.exe'
if (-not (Test-Path -LiteralPath $taskNodePath)) {
  throw 'Локальный Node.js не установлен. Выполните npm install --prefix .tools node@22 или используйте системный Node.js >= 22.13.'
}
$taskNpmCommand = Get-Command npm.cmd
$taskNpmCli = Join-Path (Split-Path -Parent $taskNpmCommand.Source) 'node_modules\npm\bin\npm-cli.js'
$taskPreviousPath = $env:Path
# PowerShell consumes the unquoted -- separator when invoking a script.
if ($NpmArguments.Count -gt 2 -and $NpmArguments[0] -eq 'run' -and $NpmArguments[2] -ne '--') {
  $NpmArguments = @($NpmArguments[0], $NpmArguments[1], '--') + $NpmArguments[2..($NpmArguments.Count - 1)]
}
try {
  $env:Path = (Split-Path -Parent $taskNodePath) + ';' + $env:Path
  & $taskNodePath $taskNpmCli @NpmArguments
  exit $LASTEXITCODE
} finally { $env:Path = $taskPreviousPath }
