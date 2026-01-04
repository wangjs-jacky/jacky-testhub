/**
 * 浏览器插件内容脚本
 * 在页面中注入提取功能
 */

// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTable') {
    try {
      // 动态加载提取器（如果使用模块化版本）
      // 这里使用内联版本以确保兼容性
      const data = extractTableData();
      sendResponse({ success: true, data: data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true; // 保持消息通道开放以支持异步响应
  }
  
  if (request.action === 'getTableInfo') {
    try {
      const rows = findTableRows();
      sendResponse({ 
        success: true, 
        rowCount: rows.length,
        hasTable: rows.length > 0
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

// 提取器函数（内联版本，确保在content script中可用）
function cleanText(element) {
  if (!element) return '';
  const text = element.innerText || element.textContent || '';
  return text.trim().replace(/\s+/g, ' ');
}

function isValidExpectedResult(text) {
  if (!text) return false;
  const invalidPatterns = [
    '输入预期结果', '输入步骤描述', 'success', 'error',
    '查看生成代码', '查看错误信息', '复制快照地址',
    /^输入.*$/, /^success\s*$/i, /^error\s*$/i
  ];
  for (const pattern of invalidPatterns) {
    if (typeof pattern === 'string') {
      if (text.includes(pattern)) return false;
    } else if (pattern instanceof RegExp) {
      if (pattern.test(text)) return false;
    }
  }
  if (/^\d+$/.test(text.trim())) return false;
  return true;
}

function extractExpectedResults(cell) {
  if (!cell) return [];
  const results = [];
  const resultItems = cell.querySelectorAll('textarea, div[class*="result"], .ant-space-item, [class*="expected"]');
  if (resultItems.length > 0) {
    resultItems.forEach(item => {
      const text = cleanText(item);
      if (isValidExpectedResult(text)) {
        results.push(text);
      }
    });
  } else {
    const text = cleanText(cell);
    if (isValidExpectedResult(text)) {
      results.push(text);
    }
  }
  return results;
}

function findTableRows() {
  let rows = document.querySelectorAll('table tbody tr');
  if (rows.length === 0) {
    rows = document.querySelectorAll('.ant-table-tbody tr, .ant-table-row');
  }
  if (rows.length === 0) {
    rows = document.querySelectorAll('tr');
  }
  return rows;
}

function findColumnIndices() {
  let headerRow = document.querySelector('table thead tr, .ant-table-thead tr');
  if (!headerRow) {
    headerRow = document.querySelector('tr:first-child');
  }
  if (!headerRow) {
    return { stepDescIndex: 0, expectedResultIndex: 1 };
  }
  const headers = headerRow.querySelectorAll('th, td');
  let stepDescIndex = -1;
  let expectedResultIndex = -1;
  headers.forEach((header, index) => {
    const text = cleanText(header).toLowerCase();
    if (text.includes('步骤描述') || text.includes('步骤')) {
      stepDescIndex = index;
    } else if (text.includes('预期结果') || text.includes('预期')) {
      expectedResultIndex = index;
    }
  });
  if (stepDescIndex === -1) stepDescIndex = 0;
  if (expectedResultIndex === -1) expectedResultIndex = 1;
  return { stepDescIndex, expectedResultIndex };
}

function isButtonText(text) {
  if (!text) return false;
  const buttonPatterns = ['success', 'error', '查看生成代码', '查看错误信息', '复制快照地址', /^success\s*$/i, /^error\s*$/i];
  for (const pattern of buttonPatterns) {
    if (typeof pattern === 'string') {
      if (text.includes(pattern)) return true;
    } else if (pattern instanceof RegExp) {
      if (pattern.test(text.trim())) return true;
    }
  }
  return false;
}

function removeButtonText(text) {
  if (!text) return '';
  const buttonTexts = ['success', 'error', '查看生成代码', '查看错误信息', '复制快照地址'];
  let cleaned = text;
  for (const btnText of buttonTexts) {
    cleaned = cleaned.replace(new RegExp(`\\s*${btnText}\\s*`, 'gi'), ' ');
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function extractStepDescription(cell) {
  if (!cell) return '';
  const textarea = cell.querySelector('textarea');
  if (textarea) {
    const text = cleanText(textarea);
    if (text && text.trim().length > 0) return text;
  }
  const input = cell.querySelector('input[type="text"]');
  if (input) {
    const text = cleanText(input);
    if (text && text.trim().length > 0) return text;
  }
  const contentDivs = cell.querySelectorAll('div[class*="step"], div[class*="desc"], div[class*="content"]');
  for (const div of contentDivs) {
    const text = cleanText(div);
    if (text && !isButtonText(text) && text.trim().length > 3) return text;
  }
  const fullText = cleanText(cell);
  if (fullText) {
    const cleaned = removeButtonText(fullText);
    if (cleaned && cleaned.trim().length > 3) return cleaned;
  }
  return '';
}

function isValidDataRow(stepDescription) {
  if (!stepDescription) return false;
  const invalidPatterns = ['输入步骤描述', '步骤描述', '预期结果', '输入预期结果'];
  if (invalidPatterns.some(pattern => stepDescription.includes(pattern))) {
    return false;
  }
  if (/^\d+$/.test(stepDescription.trim())) {
    return false;
  }
  if (stepDescription.trim().length < 3) {
    return false;
  }
  if (isButtonText(stepDescription)) {
    return false;
  }
  return true;
}

function extractTableData() {
  const data = [];
  const rows = findTableRows();
  
  if (rows.length === 0) {
    return data;
  }
  
  const { stepDescIndex, expectedResultIndex } = findColumnIndices();
  let validRowIndex = 0;
  
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length <= Math.max(stepDescIndex, expectedResultIndex)) return;
    
    const stepDescription = extractStepDescription(cells[stepDescIndex]);
    if (!isValidDataRow(stepDescription)) return;
    
    const expectedResults = extractExpectedResults(cells[expectedResultIndex]);
    if (expectedResults.length === 0) return;
    
    data.push({
      步骤序号: validRowIndex + 1,
      步骤描述: stepDescription,
      预期结果: expectedResults.length === 1 ? expectedResults[0] : expectedResults
    });
    validRowIndex++;
  });
  
  return data;
}

// 在页面加载完成后，可以添加一个提取按钮（可选）
(function() {
  'use strict';
  
  // 检查是否已经注入
  if (window.tableExtractorInjected) {
    return;
  }
  window.tableExtractorInjected = true;
  
  // 可选：在页面上添加一个浮动按钮
  // 可以通过manifest.json中的配置来控制是否显示
  function createFloatingButton() {
    const button = document.createElement('button');
    button.textContent = '📋 提取表格';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      padding: 12px 20px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    button.onclick = () => {
      const data = extractTableData();
      if (data.length === 0) {
        alert('未找到表格数据');
        return;
      }
      
      // 发送消息到background script处理导出
      chrome.runtime.sendMessage({
        action: 'exportData',
        data: data
      }, (response) => {
        if (response && response.success) {
          alert(`成功提取 ${data.length} 条数据，请查看插件弹窗`);
        }
      });
    };
    
    document.body.appendChild(button);
  }
  
  // 根据配置决定是否显示浮动按钮
  // 这里默认不显示，可以通过storage API读取用户配置
  // createFloatingButton();
})();

