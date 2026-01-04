# 表格内容提取工具

一个用于快速提取测试用例表格中"步骤描述"和"预期结果"数据的JavaScript工具集，支持多种使用方式和导出格式。

## 功能特性

- ✅ 自动识别和提取表格数据
- ✅ 支持Ant Design表格结构
- ✅ 处理预期结果中的多个条目
- ✅ 支持JSON、CSV、Markdown三种导出格式
- ✅ 提供浏览器控制台脚本、书签工具、浏览器插件三种使用方式
- ✅ 自动清理文本内容（去除HTML标签、多余空白）

## 文件结构

```
table-extractor/
├── extractor.js          # 核心提取逻辑模块
├── exporter.js            # 数据导出功能模块
├── bookmarklet.js         # 书签工具版本
├── content-script.js      # 浏览器插件内容脚本
├── popup.html            # 插件弹窗界面
├── popup.js              # 插件弹窗逻辑
├── manifest.json         # 浏览器插件配置文件
└── README.md            # 使用说明文档
```

## 使用方法

### 方式一：浏览器控制台脚本

1. 打开测试用例页面
2. 按 `F12` 打开开发者工具，切换到"控制台"标签
3. 复制 `table-extractor-console.js` 文件中的全部内容
4. 粘贴到控制台并回车执行
5. 数据会自动复制到剪贴板，也可以通过 `window.tableExtractor` 对象操作

**示例：**
```javascript
// 查看提取的数据
window.tableExtractor.data

// 复制JSON到剪贴板
window.tableExtractor.copyJSON()

// 下载CSV文件
window.tableExtractor.downloadCSV()
```

### 方式二：书签工具（Bookmarklet）

1. 打开 `bookmarklet.js` 文件
2. 将代码压缩为一行（去除注释和换行）
3. 在浏览器中创建新书签
4. 将压缩后的代码粘贴到书签的URL字段，格式为：`javascript:(function(){...})();`
5. 在测试用例页面点击该书签即可提取数据

**注意：** 书签工具版本包含完整的UI界面，点击后会弹出对话框供选择导出方式。

### 方式三：浏览器插件

#### 安装步骤

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启"开发者模式"（右上角开关）
3. 点击"加载已解压的扩展程序"
4. 选择 `table-extractor` 文件夹
5. 插件安装完成

#### 使用方法

1. 打开测试用例页面
2. 点击浏览器工具栏中的插件图标
3. 在弹窗中点击"提取表格数据"按钮
4. 选择导出方式（复制或下载）

## API 文档

### Extractor 模块

#### `extractTableData(options)`

提取表格数据的主函数。

**参数：**
- `options` (Object, 可选)
  - `skipEmpty` (Boolean): 是否跳过空行，默认 `true`
  - `includeRowNumber` (Boolean): 是否包含行号，默认 `true`

**返回：**
- `Array<Object>`: 提取的数据数组，每个对象包含：
  - `步骤序号` (Number): 步骤序号
  - `步骤描述` (String): 步骤描述文本
  - `预期结果` (String|Array): 预期结果，单个为字符串，多个为数组

**示例：**
```javascript
const data = TableExtractor.extractTableData();
console.log(data);
```

#### `cleanText(element)`

清理文本内容，去除HTML标签和多余空白。

**参数：**
- `element` (HTMLElement): DOM元素

**返回：**
- `String`: 清理后的文本

#### `extractExpectedResults(cell)`

提取预期结果（可能包含多个条目）。

**参数：**
- `cell` (HTMLElement): 表格单元格元素

**返回：**
- `Array<String>`: 预期结果数组

### Exporter 模块

#### `Exporter` 类

导出管理器类，提供统一的导出接口。

**构造函数：**
```javascript
const exporter = new Exporter(data);
```

**方法：**

- `toJSON(options)`: 导出为JSON字符串
- `toCSV(options)`: 导出为CSV字符串
- `toMarkdown()`: 导出为Markdown表格字符串
- `downloadJSON(filename)`: 下载JSON文件
- `downloadCSV(filename)`: 下载CSV文件
- `downloadMarkdown(filename)`: 下载Markdown文件
- `copyJSON()`: 复制JSON到剪贴板
- `copyCSV()`: 复制CSV到剪贴板
- `copyMarkdown()`: 复制Markdown到剪贴板

**示例：**
```javascript
const data = TableExtractor.extractTableData();
const exporter = new TableExporter.Exporter(data);

// 导出为JSON
const json = exporter.toJSON();

// 下载CSV文件
exporter.downloadCSV('测试用例数据');

// 复制到剪贴板
await exporter.copyJSON();
```

## 数据格式

### JSON格式

```json
[
  {
    "步骤序号": 1,
    "步骤描述": "等待'10000ms'",
    "预期结果": "输入预期结果"
  },
  {
    "步骤序号": 2,
    "步骤描述": "点击[SKU区域]下的[套餐卡片2]",
    "预期结果": [
      "**APP** [底部bar]展示\"低至\",\"CNY 3.00\",\"每人\"",
      "**H5** [底部bar]展示\"低至\",\"CNY 3.00\",\"每人\"",
      "**PC** [产品标题模块]展示\"低至\",\"CNY 3.00\",\"每人\""
    ]
  }
]
```

### CSV格式

```csv
步骤序号,步骤描述,预期结果
1,"等待'10000ms'","输入预期结果"
2,"点击[SKU区域]下的[套餐卡片2]","**APP** [底部bar]展示""低至"",""CNY 3.00"",""每人"" | **H5** [底部bar]展示""低至"",""CNY 3.00"",""每人"" | **PC** [产品标题模块]展示""低至"",""CNY 3.00"",""每人"""
```

### Markdown格式

```markdown
| 步骤序号 | 步骤描述 | 预期结果 |
| --- | --- | --- |
| 1 | 等待'10000ms' | 输入预期结果 |
| 2 | 点击[SKU区域]下的[套餐卡片2] | **APP** [底部bar]展示"低至","CNY 3.00","每人" \| **H5** [底部bar]展示"低至","CNY 3.00","每人" |
```

## 兼容性

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 85+
- ✅ Safari 14+

## 注意事项

1. **动态内容**：如果表格内容是动态加载的，请确保在内容加载完成后再执行提取脚本
2. **表格结构**：工具会自动识别标准HTML表格和Ant Design表格，如果使用其他框架的表格，可能需要调整选择器
3. **权限要求**：浏览器插件需要"activeTab"和"clipboardWrite"权限
4. **数据格式**：预期结果如果是多个条目，在CSV中会用 `|` 分隔

## 开发计划

- [x] 核心提取脚本
- [x] 导出模块（JSON/CSV/Markdown）
- [x] 书签工具版本
- [x] 浏览器插件基础结构
- [ ] 添加图标资源
- [ ] 支持更多表格框架
- [ ] 添加数据过滤功能
- [ ] 支持批量提取多个表格

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

