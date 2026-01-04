# 表格工具集 Chrome 插件 (Plasmo 版本)

基于 Plasmo 框架开发的 Chrome 插件，提供表格操作工具集。

## 功能特性

1. **检查表格行数** - 快速查看表格总行数、有内容的行数、空行数
2. **添加表格行** - 自动点击"添加步骤"按钮，直到达到目标行数
3. **提取表格数据** - 从表格中提取步骤描述和预期结果，支持编辑
4. **填充表格数据** - 将编辑后的数据填充回表格

## 项目结构

```
.
├── sidepanel.tsx          # 插件侧边栏 UI (React) - 提供更大的操作空间
├── background.ts           # 背景脚本 - 配置侧边栏行为和快捷键
├── popup.css               # 侧边栏样式
├── contents/
│   └── inject.ts          # Content Script (注入到页面)
├── table-utils.js         # 全局工具脚本 (可在控制台直接使用)
├── package.json
├── tsconfig.json
└── README-PLASMO.md
```

## 界面模式

本插件使用**侧边栏模式 (Side Panel)**，在浏览器侧边打开，提供更大的操作空间，适合编辑大量数据。

### 打开侧边栏的方式

1. **点击扩展图标** - 点击浏览器工具栏中的扩展图标
2. **快捷键** - 使用 `Ctrl+U` (Windows/Linux) 或 `Command+U` (macOS) 快速打开/关闭侧边栏

## 安装和开发

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

这会启动开发服务器，并在 `build/chrome-mv3-dev` 目录生成开发版本的插件。

### 3. 加载插件到 Chrome

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启"开发者模式"（右上角开关）
3. 点击"加载已解压的扩展程序"
4. 选择 `build/chrome-mv3-dev` 目录

### 4. 构建生产版本

```bash
npm run build
```

生产版本会生成在 `build/chrome-mv3-prod` 目录。

### 5. 打包插件

```bash
npm run package
```

会生成 `.zip` 文件，可以上传到 Chrome Web Store。

## 使用方法

### 打开侧边栏

- **方式一**：点击浏览器工具栏中的扩展图标
- **方式二**：使用快捷键 `Ctrl+U` (Windows/Linux) 或 `Command+U` (macOS)

> 💡 **提示**：可以在 `chrome://extensions/shortcuts` 中自定义快捷键

### 侧边栏功能

1. **检查行数** - 点击"🔍 检查行数"按钮，查看当前表格的行数统计
2. **添加行** - 点击"➕ 添加行"按钮，输入目标行数，自动添加行
3. **提取数据** - 点击"📥 提取数据"按钮，提取表格数据并显示在文本框中
4. **填充数据** - 编辑文本框中的数据后，点击"📤 填充数据"按钮，将数据填充回表格

### 控制台脚本使用

你也可以直接在控制台使用 `table-utils.js`：

```javascript
// 在控制台执行 table-utils.js 后，可以使用：

// 检查表格行数
tableUtils.checkTableRows()

// 获取当前行数
tableUtils.getCurrentRowCount()

// 添加行直到达到13行
await tableUtils.addTableRows(13)

// 提取表格数据
const data = tableUtils.extractTableData()

// 填充表格数据
tableUtils.fillTableData(data)

// 导出为 JSON
const json = tableUtils.exportToJSON(data)
```

## 数据格式

提取的数据格式为 JSON 数组：

```json
[
  {
    "步骤序号": 1,
    "步骤描述": "等待\"10000ms\"",
    "预期结果": ""
  },
  {
    "步骤序号": 2,
    "步骤描述": "点击[SKU区域]下的[套餐卡片2]",
    "预期结果": "**APP** [底部bar]展示\"低至\",\"CNY 3.00\",\"每人\""
  }
]
```

## 技术栈

- **Plasmo** - 现代浏览器扩展框架
- **React** - UI 框架
- **TypeScript** - 类型安全
- **Chrome Extension Manifest V3** - 最新扩展规范

## 注意事项

1. 插件需要在包含表格的页面上使用
2. 支持标准 HTML 表格和 Ant Design 表格
3. 填充数据时，确保表格有足够的行数
4. 如果页面使用 React，填充时会触发相应的事件以确保状态更新

## 侧边栏功能

本插件使用 Chrome 侧边栏（Side Panel）功能，提供更大的操作空间和更好的编辑体验。

### 打开侧边栏

- **点击扩展图标**：点击浏览器工具栏中的扩展图标
- **快捷键**：使用 `Ctrl+U` (Windows/Linux) 或 `Command+U` (macOS)

### 功能特点

- **持久化显示**：侧边栏会保持打开状态，不会自动关闭
- **更大空间**：适合编辑大量表格数据
- **快速访问**：支持快捷键快速打开/关闭

> 💡 可以在 `chrome://extensions/shortcuts` 中自定义快捷键

详细说明请参考 [侧边栏说明.md](./侧边栏说明.md)

## 开发计划

- [x] 基础功能实现
- [x] Plasmo 框架集成
- [x] UI 界面优化
- [x] 侧边栏功能支持
- [x] 快捷键支持
- [ ] 添加图标资源
- [ ] 支持更多表格框架
- [ ] 添加数据验证
- [ ] 支持批量操作
