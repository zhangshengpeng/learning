# Gitee Pages 部署脚本
# 用法: .\deploy-gitee.ps1

$ErrorActionPreference = "Stop"

Write-Host "1. 构建项目..." -ForegroundColor Cyan
npm run build

Write-Host "2. 准备部署文件..." -ForegroundColor Cyan
$distDir = "docs/.vitepress/dist"
$deployDir = ".deploy-gitee"

if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}

Write-Host "3. 创建部署分支..." -ForegroundColor Cyan
Copy-Item -Recurse $distDir $deployDir

Push-Location $deployDir

git init -b master
git add -A
git commit -m "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

Write-Host "4. 推送到 Gitee..." -ForegroundColor Cyan
$remoteUrl = "https://gitee.com/你的Gitee用户名/learning.git"
git remote add origin $remoteUrl
git push -f origin master

Pop-Location

Write-Host "`n部署完成！" -ForegroundColor Green
Write-Host "下一步: 在 Gitee 仓库 -> 服务 -> Gitee Pages 中手动点击 '更新' 按钮" -ForegroundColor Yellow
Write-Host "访问地址: https://你的Gitee用户名.gitee.io/learning/" -ForegroundColor Yellow