$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($env:INTERNAL_TOKEN)) { throw '请先设置 INTERNAL_TOKEN。管理员通过用户服务登录。' }
mvn spring-boot:run
exit $LASTEXITCODE
