# 写作工具 V1.0

面向小说作者的轻量 Windows 桌面 App。

文件分为 output 和 process：output/V1.0/写作工具.exe 是正式应用，移动时保留整个 V1.0 文件夹；process 保存源码、依赖、构建脚本和测试，GitHub 保存这里的源码。

首页使用宫格作品卡片，加号新建作品，直接编辑书名并自动保存。卡片右上角菜单支持删除，删除前需确认。

写作页顶部显示书名。左上角房子返回首页，下方悬浮按钮展开章节卡片。段落开头左侧按钮设置章标题、节标题或正文；目录可跳转。Ctrl+Shift+P 打开当前段落类型菜单。

纯文字编辑，中文宋体、英文 Times New Roman，字号 16–36，连续上下滚动，淡黄色纸张纹理。各作品独立保存正文、章节和字号。

输入停止、切换作品和关闭窗口前自动保存。数据存于 Electron 用户数据目录的 library.json。旧 manuscript.json 自动迁移为未命名作品，原文件保留。

开发：npm ci 安装依赖，npm start 启动。构建：npm run build，输出到 ../output/V1.0。

验证：npm run check；node library-test.cjs；node_modules/electron/dist/electron.exe smoke.cjs。测试使用 .smoke-data，不修改用户稿件。

正式发布标签：V1.0。
