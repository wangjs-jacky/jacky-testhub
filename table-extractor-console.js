// 表格内容提取脚本 - 可直接在Chrome控制台运行
// 使用方法：复制整个脚本到控制台，回车执行

(function() {
  'use strict';
  
  // 清理文本内容，去除HTML标签和多余空白
  function cleanText(element) {
    if (!element) return '';
    const text = element.innerText || element.textContent || '';
    return text.trim().replace(/\s+/g, ' ');
  }
  
  // 提取预期结果（可能包含多个条目）
  function extractExpectedResults(cell) {
    if (!cell) return [];
    
    const results = [];
    
    // 查找所有预期结果条目（可能包含多个div或textarea）
    const resultItems = cell.querySelectorAll('textarea, div[class*="result"], .ant-space-item');
    
    if (resultItems.length > 0) {
      resultItems.forEach(item => {
        const text = cleanText(item);
        if (text && text !== '输入预期结果') {
          results.push(text);
        }
      });
    } else {
      // 如果没有找到子元素，直接提取整个单元格内容
      const text = cleanText(cell);
      if (text && text !== '输入预期结果') {
        results.push(text);
      }
    }
    
    return results;
  }
  
  // 主提取函数
  function extractTableData() {
    const data = [];
    
    // 尝试多种表格选择器策略
    let rows = document.querySelectorAll('table tbody tr');
    
    // 如果没找到，尝试Ant Design表格
    if (rows.length === 0) {
      rows = document.querySelectorAll('.ant-table-tbody tr, .ant-table-row');
    }
    
    // 如果还是没找到，尝试所有tr
    if (rows.length === 0) {
      rows = document.querySelectorAll('tr');
    }
    
    console.log(`找到 ${rows.length} 行数据`);
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      
      if (cells.length >= 2) {
        // 提取步骤描述（第一列）
        const stepDescription = cleanText(cells[0]);
        
        // 跳过空行或标题行
        if (!stepDescription || stepDescription === '输入步骤描述' || stepDescription.includes('步骤描述')) {
          return;
        }
        
        // 提取预期结果（第二列）
        const expectedResults = extractExpectedResults(cells[1]);
        
        data.push({
          步骤序号: index + 1,
          步骤描述: stepDescription,
          预期结果: expectedResults.length === 1 ? expectedResults[0] : expectedResults
        });
      }
    });
    
    return data;
  }
  
  // 导出为JSON字符串
  function exportToJSON(data) {
    return JSON.stringify(data, null, 2);
  }
  
  // 导出为CSV格式
  function exportToCSV(data) {
    const headers = ['步骤序号', '步骤描述', '预期结果'];
    const rows = data.map(item => {
      const results = Array.isArray(item.预期结果) 
        ? item.预期结果.join(' | ') 
        : item.预期结果;
      return [
        item.步骤序号,
        `"${item.步骤描述.replace(/"/g, '""')}"`,
        `"${results.replace(/"/g, '""')}"`
      ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  // 复制到剪贴板
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('✅ 数据已复制到剪贴板！');
      return true;
    } catch (err) {
      console.error('❌ 复制失败，请手动复制:', err);
      return false;
    }
  }
  
  // 执行提取
  console.log('🚀 开始提取表格数据...');
  const extractedData = extractTableData();
  
  if (extractedData.length === 0) {
    console.warn('⚠️ 未找到表格数据，请检查页面是否包含表格');
    return;
  }
  
  console.log(`✅ 成功提取 ${extractedData.length} 条数据`);
  console.log('📊 提取的数据:', extractedData);
  
  // 提供多种导出方式
  const jsonData = exportToJSON(extractedData);
  const csvData = exportToCSV(extractedData);
  
  // 将导出函数挂载到window对象，方便后续使用
  window.tableExtractor = {
    data: extractedData,
    json: jsonData,
    csv: csvData,
    copyJSON: () => copyToClipboard(jsonData),
    copyCSV: () => copyToClipboard(csvData),
    downloadJSON: () => {
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `表格数据_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    downloadCSV: () => {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `表格数据_${new Date().getTime()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  console.log('\n📋 使用说明:');
  console.log('  - window.tableExtractor.data        // 查看提取的数据');
  console.log('  - window.tableExtractor.copyJSON() // 复制JSON到剪贴板');
  console.log('  - window.tableExtractor.copyCSV()  // 复制CSV到剪贴板');
  console.log('  - window.tableExtractor.downloadJSON() // 下载JSON文件');
  console.log('  - window.tableExtractor.downloadCSV()  // 下载CSV文件');
  
  // 自动复制JSON到剪贴板
  copyToClipboard(jsonData);
  
  return extractedData;
})();

