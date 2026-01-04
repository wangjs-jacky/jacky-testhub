/**
 * 浏览器插件弹窗脚本
 */

let extractedData = null;

// DOM元素
const statusEl = document.getElementById('status');
const extractBtn = document.getElementById('extract-btn');
const actionButtons = document.getElementById('action-buttons');
const clearBtn = document.getElementById('clear-btn');
const dataPreview = document.getElementById('data-preview');
const previewContent = document.getElementById('preview-content');
const copyJsonBtn = document.getElementById('copy-json-btn');
const copyCsvBtn = document.getElementById('copy-csv-btn');
const downloadJsonBtn = document.getElementById('download-json-btn');
const downloadCsvBtn = document.getElementById('download-csv-btn');

// 更新状态显示
function updateStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

// 显示/隐藏元素
function showElement(el) {
  el.classList.remove('hidden');
}

function hideElement(el) {
  el.classList.add('hidden');
}

// 导出为JSON
function exportToJSON(data) {
  return JSON.stringify(data, null, 2);
}

// 导出为CSV
function exportToCSV(data) {
  if (data.length === 0) return '';
  const headers = ['步骤序号', '步骤描述', '预期结果'];
  const rows = data.map(item => {
    const results = Array.isArray(item.预期结果) ? item.预期结果.join(' | ') : item.预期结果;
    return [
      item.步骤序号,
      `"${String(item.步骤描述).replace(/"/g, '""')}"`,
      `"${String(results).replace(/"/g, '""')}"`
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

// 复制到剪贴板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
}

// 下载文件
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 提取表格数据
async function extractTable() {
  updateStatus('正在提取数据...', 'info');
  extractBtn.disabled = true;
  extractBtn.innerHTML = '<span class="loading"></span> 提取中...';
  
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 向content script发送消息
    chrome.tabs.sendMessage(tab.id, { action: 'extractTable' }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatus('错误: ' + chrome.runtime.lastError.message, 'error');
        extractBtn.disabled = false;
        extractBtn.innerHTML = '<span>🚀 提取表格数据</span>';
        return;
      }
      
      if (response && response.success) {
        extractedData = response.data;
        
        if (extractedData.length === 0) {
          updateStatus('未找到表格数据', 'error');
          extractBtn.disabled = false;
          extractBtn.innerHTML = '<span>🚀 提取表格数据</span>';
          return;
        }
        
        updateStatus(`成功提取 ${extractedData.length} 条数据`, 'success');
        showElement(actionButtons);
        showElement(clearBtn);
        showElement(dataPreview);
        
        // 显示数据预览（前3条）
        const preview = extractedData.slice(0, 3).map(item => 
          `步骤${item.步骤序号}: ${item.步骤描述.substring(0, 30)}...`
        ).join('\n');
        previewContent.textContent = preview + (extractedData.length > 3 ? `\n... 还有 ${extractedData.length - 3} 条数据` : '');
      } else {
        updateStatus('提取失败: ' + (response?.error || '未知错误'), 'error');
      }
      
      extractBtn.disabled = false;
      extractBtn.innerHTML = '<span>🚀 提取表格数据</span>';
    });
  } catch (error) {
    updateStatus('错误: ' + error.message, 'error');
    extractBtn.disabled = false;
    extractBtn.innerHTML = '<span>🚀 提取表格数据</span>';
  }
}

// 事件监听
extractBtn.addEventListener('click', extractTable);

clearBtn.addEventListener('click', () => {
  extractedData = null;
  hideElement(actionButtons);
  hideElement(clearBtn);
  hideElement(dataPreview);
  updateStatus('点击下方按钮开始提取表格数据', 'info');
});

copyJsonBtn.addEventListener('click', async () => {
  if (!extractedData) return;
  const json = exportToJSON(extractedData);
  const success = await copyToClipboard(json);
  if (success) {
    updateStatus('JSON已复制到剪贴板', 'success');
    setTimeout(() => updateStatus(`成功提取 ${extractedData.length} 条数据`, 'success'), 2000);
  } else {
    updateStatus('复制失败，请重试', 'error');
  }
});

copyCsvBtn.addEventListener('click', async () => {
  if (!extractedData) return;
  const csv = exportToCSV(extractedData);
  const success = await copyToClipboard(csv);
  if (success) {
    updateStatus('CSV已复制到剪贴板', 'success');
    setTimeout(() => updateStatus(`成功提取 ${extractedData.length} 条数据`, 'success'), 2000);
  } else {
    updateStatus('复制失败，请重试', 'error');
  }
});

downloadJsonBtn.addEventListener('click', () => {
  if (!extractedData) return;
  const json = exportToJSON(extractedData);
  downloadFile(json, `表格数据_${Date.now()}.json`, 'application/json');
  updateStatus('JSON文件下载中...', 'success');
  setTimeout(() => updateStatus(`成功提取 ${extractedData.length} 条数据`, 'success'), 2000);
});

downloadCsvBtn.addEventListener('click', () => {
  if (!extractedData) return;
  const csv = exportToCSV(extractedData);
  downloadFile(csv, `表格数据_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  updateStatus('CSV文件下载中...', 'success');
  setTimeout(() => updateStatus(`成功提取 ${extractedData.length} 条数据`, 'success'), 2000);
});

// 页面加载时检查当前页面是否有表格
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: 'getTableInfo' }, (response) => {
    if (response && response.success && response.hasTable) {
      updateStatus(`检测到表格，共 ${response.rowCount} 行`, 'info');
    }
  });
});

