# Playwright vs 浏览器控制台 JavaScript 的区别

## Playwright 如何实现 hover 和点击

Playwright 使用**浏览器自动化协议**（如 Chrome DevTools Protocol、WebDriver Protocol）来直接控制浏览器，这是关键区别：

### 1. **真正的鼠标控制**
- Playwright 可以**真正移动浏览器的鼠标指针**
- 使用 `Input.dispatchMouseEvent` 等底层 API
- 可以触发 CSS 的 `:hover` 伪类（因为鼠标指针真的在元素上）

### 2. **浏览器自动化协议**
```javascript
// Playwright 内部大致是这样工作的：
await page.hover('tr:last-child'); 
// 实际执行：
// 1. 计算元素位置
// 2. 通过 CDP 移动鼠标指针到该位置
// 3. 触发真实的鼠标事件
// 4. CSS :hover 自动生效
```

### 3. **事件序列**
Playwright 的 hover 操作包括：
- `mousemove` - 鼠标移动到元素
- `mouseover` - 鼠标进入元素
- `mouseenter` - 鼠标进入元素（不冒泡）
- 等待 hover 效果生效

## 浏览器控制台 JavaScript 的限制

### 1. **无法真正移动鼠标指针**
- JavaScript 只能触发 DOM 事件，不能控制浏览器的鼠标指针
- CSS 的 `:hover` 是浏览器级别的状态，不是 DOM 事件
- 因此无法通过 JavaScript 事件触发 CSS `:hover`

### 2. **只能模拟事件**
```javascript
// 这只能触发 JavaScript 事件监听器，不能触发 CSS :hover
element.dispatchEvent(new MouseEvent('mouseenter'));
```

## 解决方案

由于无法真正触发 CSS `:hover`，我们采用以下策略：

### 1. **直接操作 CSS 样式**
```javascript
// 强制显示按钮
deleteButton.style.display = 'inline-block';
deleteButton.style.visibility = 'visible';
deleteButton.style.opacity = '1';
```

### 2. **添加 CSS 类**
```javascript
// 如果框架使用类控制 hover，添加相应的类
row.classList.add('ant-table-row-hover');
```

### 3. **注入 CSS 规则**
```javascript
// 使用 !important 覆盖原有样式
const style = document.createElement('style');
style.textContent = `
  .ant-table-row .anticon-delete {
    display: inline-block !important;
  }
`;
document.head.appendChild(style);
```

### 4. **即使不可见也点击**
```javascript
// DOM 元素存在就可以点击，即使视觉上不可见
deleteButton.click();
```

## 总结

- **Playwright**: 使用浏览器自动化协议，可以真正控制鼠标，触发 CSS `:hover`
- **浏览器控制台 JS**: 只能触发 DOM 事件，无法触发 CSS `:hover`，需要直接操作样式

我们的脚本结合了多种方法，尽可能模拟 Playwright 的行为，但最终还是要依赖直接操作 CSS 样式来显示按钮。


