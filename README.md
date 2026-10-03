# 写作工具

Windows 桌面纯文字写作应用，基于 Electron。

开发运行：在 process 中执行 `npm install`，随后双击 `启动写作.cmd`，或运行 `npm start`。

构建：`npm run build`。生成的 Windows 应用位于 `../output/写作工具/写作工具.exe`，整个写作工具文件夹需要一起保留。

V1.0 发布构建：`npm run build -- V1.0`，对应 Git 标签 `V1.0`，应用位于 `../output/V1.0/写作.exe`。

输入停止 500 毫秒后自动保存，窗口失去焦点及关闭时也会保存。正文与字号存放在 Electron 用户数据目录的 `manuscript.json` 中，采用临时文件写入后替换。保存失败会显示提示并重试，关闭前保存失败时会保留窗口。

中文使用宋体，英文使用 Times New Roman。字号范围为 16–36，正文连续上下滚动，支持中文输入法，仅保存纯文字。
