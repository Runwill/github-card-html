# 运维命令速查

本页记录本地常用维护命令。涉及数据库恢复的命令会使用 `--drop`，执行前先确认当前数据库可以被覆盖。

## 备份数据库

```powershell
"C:\Program Files\MongoDB\Tools\100\bin\mongodump.exe" --host 127.0.0.1:27017 --out "C:\Users\Administrator\Desktop\mongoDB_backup" --gzip
```

## 恢复数据库

保留 `backend-project.users`，其余集合按备份恢复。

```powershell
"C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe" --host 127.0.0.1:27017 --gzip --drop --nsExclude "backend-project.users" "C:\Users\Administrator\Desktop\mongoDB_backup"
```

## 后端运行

在后端项目目录执行：

```powershell
npm run dev
```

## 导入程序页数据

先在前端项目临时生成 `base/program_panel.json`，再在后端项目导入到本地数据库。该 JSON 已加入 `.gitignore`，仅用于导入/恢复，不作为程序页运行时兜底；若后端或数据库不可用，程序页会直接显示加载错误。

```powershell
node .\scripts\extract-program-panel.js
```

```powershell
npm run import:program-panel
```

## 前端更新时间戳

用于刷新静态资源版本号：

```powershell
node .\scripts\bust-version.js
```
