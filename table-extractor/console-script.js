/**
 * 控制台脚本版本 - 可直接在Chrome控制台运行
 * 使用方法：复制整个脚本到控制台，回车执行
 * 
 * 修复版本：根据实际DOM结构优化提取逻辑
 */

(function() {
  'use strict';
  
  // ==================== 提取器功能 ====================
  
  function cleanText(element) {
    if (!element) return '';
    const text = element.innerText || element.textContent || '';
    return text.trim().replace(/\s+/g, ' ');
  }
  
  // 提取步骤描述（优先从textarea中提取）
  function extractStepDescription(cell) {
    if (!cell) return '';
    
    // 优先查找textarea元素（通常包含真正的步骤描述）
    const textarea = cell.querySelector('textarea');
    if (textarea) {
      // 优先使用 value 属性，如果没有则使用 innerText
      let text = textarea.value;
      if (!text || text.trim().length === 0) {
        text = cleanText(textarea);
      }
      if (text && text.trim().length > 0 && text !== '输入步骤描述') {
        return text.trim();
      }
    }
    
    // 如果没有textarea，查找其他可能包含内容的元素
    // 尝试查找所有可能包含文本的元素
    const allTextElements = cell.querySelectorAll('div, span, p');
    for (const el of allTextElements) {
      // 跳过按钮和图标元素
      if (el.classList.contains('anticon') || 
          el.classList.contains('add-sub-step-btn') || 
          el.classList.contains('delete-step-btn') ||
          el.querySelector('.anticon')) {
        continue;
      }
      
      const text = cleanText(el);
      if (text && text.trim().length > 0 && text !== '输入步骤描述') {
        // 过滤掉按钮文本
        if (!isButtonText(text) && text.trim().length > 2) {
          return text.trim();
        }
      }
    }
    
    // 最后尝试提取整个单元格的文本（排除按钮）
    const fullText = cleanText(cell);
    if (fullText && fullText.trim().length > 0 && fullText !== '输入步骤描述') {
      // 移除按钮文本
      const cleaned = removeButtonText(fullText);
      if (cleaned && cleaned.trim().length > 2) {
        return cleaned.trim();
      }
    }
    
    return '';
  }
  
  // 移除按钮文本（新增函数）
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
  
  // 提取预期结果（从textarea或.ant-space-item中提取）
  function extractExpectedResults(cell) {
    if (!cell) return [];
    
    const results = [];
    
    // 查找所有textarea元素（每个预期结果可能是一个textarea）
    const textareas = cell.querySelectorAll('textarea');
    if (textareas.length > 0) {
      textareas.forEach(textarea => {
        const text = textarea.value || cleanText(textarea);
        if (text && text.trim().length > 0 && text !== '输入预期结果') {
          // 过滤掉按钮文本
          if (!isButtonText(text)) {
            results.push(text.trim());
          }
        }
      });
    }
    
    // 如果没有textarea，查找.ant-space-item（Ant Design的间距组件）
    if (results.length === 0) {
      const spaceItems = cell.querySelectorAll('.ant-space-item');
      spaceItems.forEach(item => {
        const text = cleanText(item);
        if (text && text.trim().length > 0 && text !== '输入预期结果') {
          if (!isButtonText(text)) {
            results.push(text.trim());
          }
        }
      });
    }
    
    // 如果还是没有，尝试查找包含预期结果的div
    if (results.length === 0) {
      const resultDivs = cell.querySelectorAll('div[class*="result"], div[class*="expected"]');
      resultDivs.forEach(div => {
        const text = cleanText(div);
        if (text && text.trim().length > 0 && text !== '输入预期结果') {
          if (!isButtonText(text)) {
            results.push(text.trim());
          }
        }
      });
    }
    
    return results;
  }
  
  // 判断是否为按钮文本
  function isButtonText(text) {
    if (!text) return false;
    const buttonPatterns = [
      'success',
      'error',
      '查看生成代码',
      '查看错误信息',
      '复制快照地址',
      /^success\s*$/i,
      /^error\s*$/i
    ];
    
    // 如果文本只包含按钮文本，则认为是按钮文本
    const trimmed = text.trim();
    for (const pattern of buttonPatterns) {
      if (typeof pattern === 'string') {
        // 如果文本只包含按钮文本（可能加上空格），则认为是按钮文本
        if (trimmed === pattern || trimmed.startsWith(pattern + ' ') || trimmed.endsWith(' ' + pattern)) {
          return true;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(trimmed)) return true;
      }
    }
    return false;
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
  
  // 通过表头识别列索引
  function findColumnIndices() {
    // 查找表头
    let headerRow = document.querySelector('table thead tr, .ant-table-thead tr');
    if (!headerRow) {
      // 尝试查找第一个tr作为表头
      const firstRow = document.querySelector('table tbody tr:first-child, .ant-table-tbody tr:first-child');
      if (firstRow) {
        const firstCellText = cleanText(firstRow.querySelector('td:first-child, th:first-child'));
        if (firstCellText && (firstCellText.includes('步骤') || firstCellText.includes('描述'))) {
          // 第一个tr是表头，跳过
        }
      }
    }
    
    if (!headerRow) {
      return { stepDescIndex: 0, expectedResultIndex: 1 };
    }
    
    const headers = headerRow.querySelectorAll('th, td');
    let stepDescIndex = -1;
    let expectedResultIndex = -1;
    
    headers.forEach((header, index) => {
      const text = cleanText(header).toLowerCase();
      if (text.includes('步骤描述') || (text.includes('步骤') && text.includes('描述'))) {
        stepDescIndex = index;
      } else if (text.includes('预期结果') || (text.includes('预期') && text.includes('结果'))) {
        expectedResultIndex = index;
      }
    });
    
    // 如果没找到，使用默认值
    if (stepDescIndex === -1) stepDescIndex = 0;
    if (expectedResultIndex === -1) expectedResultIndex = 1;
    
    return { stepDescIndex, expectedResultIndex };
  }
  
  function isValidDataRow(stepDescription) {
    if (!stepDescription) return false;
    
    // 过滤掉占位符和标题
    const invalidPatterns = ['输入步骤描述', '步骤描述', '预期结果', '输入预期结果'];
    if (invalidPatterns.some(pattern => stepDescription.includes(pattern))) {
      return false;
    }
    
    // 过滤掉纯数字（可能是序号列）
    if (/^\d+$/.test(stepDescription.trim())) {
      return false;
    }
    
    // 放宽长度限制：只要不是空字符串就保留
    if (stepDescription.trim().length === 0) {
      return false;
    }
    
    return true;
  }
  
  function extractTableData() {
    const data = [];
    const rows = findTableRows();
    if (rows.length === 0) {
      console.warn('未找到表格行，请检查页面是否包含表格');
      return data;
    }
    
    // 获取列索引
    const { stepDescIndex, expectedResultIndex } = findColumnIndices();
    console.log(`列索引: 步骤描述=${stepDescIndex}, 预期结果=${expectedResultIndex}`);
    console.log(`找到 ${rows.length} 行`);
    
    let validRowIndex = 0;
    const skippedRows = [];
    const debugInfo = [];
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      
      // 跳过表头行（如果第一行是表头）
      if (cells.length === 0) {
        skippedRows.push({ row: rowIndex + 1, reason: '没有td元素' });
        return;
      }
      
      // 确保有足够的列
      if (cells.length <= Math.max(stepDescIndex, expectedResultIndex)) {
        skippedRows.push({ row: rowIndex + 1, reason: `列数不足: ${cells.length}, 需要至少${Math.max(stepDescIndex, expectedResultIndex) + 1}列` });
        return;
      }
      
      // 提取步骤描述 - 尝试多种方法
      let stepDescription = extractStepDescription(cells[stepDescIndex]);
      const rawText = cleanText(cells[stepDescIndex]);
      
      // 如果第一次提取失败，尝试更宽松的提取
      if (!stepDescription || stepDescription.trim().length === 0) {
        // 尝试直接获取textarea的value
        const textarea = cells[stepDescIndex].querySelector('textarea');
        if (textarea && textarea.value) {
          stepDescription = textarea.value.trim();
        } else {
          // 尝试获取所有文本，移除按钮文本
          stepDescription = removeButtonText(rawText);
        }
      }
      
      // 如果还是为空，尝试从整个单元格提取（排除按钮）
      if (!stepDescription || stepDescription.trim().length === 0) {
        // 获取单元格内所有文本节点
        const walker = document.createTreeWalker(
          cells[stepDescIndex],
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (text && !isButtonText(text)) {
            textNodes.push(text);
          }
        }
        if (textNodes.length > 0) {
          stepDescription = textNodes.join(' ').trim();
        }
      }
      
      // 如果步骤描述仍然为空，尝试从原始文本提取
      if (!stepDescription || stepDescription.trim().length === 0) {
        // 如果原始文本不为空，使用原始文本（移除按钮文本）
        if (rawText && rawText.trim().length > 0) {
          stepDescription = removeButtonText(rawText);
        }
      }
      
      // 如果还是为空，设为空字符串（不跳过，保留这一行）
      if (!stepDescription || stepDescription.trim().length === 0) {
        stepDescription = '';
      }
      
      // 过滤掉明显的标题行（只过滤真正的表头）
      if (stepDescription.includes('步骤描述') && stepDescription.length < 15 && 
          (stepDescription.includes('预期结果') || stepDescription === '步骤描述')) {
        skippedRows.push({ 
          row: rowIndex + 1, 
          reason: '是表头行',
          raw: rawText,
          extracted: stepDescription
        });
        return;
      }
      
      // 提取预期结果
      const expectedResults = extractExpectedResults(cells[expectedResultIndex]);
      
      // 记录调试信息
      debugInfo.push({
        row: rowIndex + 1,
        stepDesc: stepDescription.substring(0, 50),
        expectedCount: expectedResults.length
      });
      
      // 即使预期结果为空，也保留这一行（因为第一个步骤的预期结果就是空的）
      data.push({
        步骤序号: validRowIndex + 1,
        步骤描述: stepDescription.trim(),
        预期结果: expectedResults.length === 0 ? '' : (expectedResults.length === 1 ? expectedResults[0] : expectedResults)
      });
      
      validRowIndex++;
    });
    
    // 打印调试信息
    console.log(`\n✅ 成功提取 ${validRowIndex} 行数据`);
    console.log(`📋 目标: 提取13个步骤`);
    
    if (skippedRows.length > 0) {
      console.log(`\n⚠️ 跳过了 ${skippedRows.length} 行:`);
      skippedRows.slice(0, 20).forEach(skipped => {
        const info = `第${skipped.row}行: ${skipped.reason}`;
        const raw = skipped.raw ? ` | 原始: "${skipped.raw.substring(0, 50)}"` : '';
        const extracted = skipped.extracted ? ` | 提取: "${skipped.extracted.substring(0, 50)}"` : '';
        console.log(`  ${info}${raw}${extracted}`);
      });
      if (skippedRows.length > 20) {
        console.log(`  ... 还有 ${skippedRows.length - 20} 行被跳过`);
      }
    }
    
    // 打印所有提取的结果
    console.log('\n📊 所有提取的步骤:');
    data.forEach((item, idx) => {
      const desc = item.步骤描述.length > 40 ? item.步骤描述.substring(0, 40) + '...' : item.步骤描述;
      const result = Array.isArray(item.预期结果) 
        ? `[${item.预期结果.length}个结果]` 
        : (item.预期结果 ? '有结果' : '无结果');
      console.log(`  ${idx + 1}. 步骤${item.步骤序号}: ${desc} (${result})`);
    });
    
    // 如果提取的行数少于13，给出提示
    if (validRowIndex < 13) {
      console.log(`\n⚠️ 警告: 只提取了 ${validRowIndex} 行，但应该有 13 行`);
      console.log('💡 提示: 请检查被跳过的行，可能需要调整提取逻辑');
    } else if (validRowIndex > 13) {
      console.log(`\n⚠️ 警告: 提取了 ${validRowIndex} 行，但预期只有 13 行`);
    } else {
      console.log(`\n✅ 完美: 成功提取了全部 ${validRowIndex} 个步骤！`);
    }
    
    return data;
  }
  
  // ==================== 导出器功能 ====================
  
  function exportToJSON(data) {
    return JSON.stringify(data, null, 2);
  }
  
  function exportToCSV(data) {
    if (data.length === 0) return '';
    const headers = ['步骤序号', '步骤描述', '预期结果'];
    const rows = data.map(item => {
      let results = '';
      if (Array.isArray(item.预期结果)) {
        results = item.预期结果.join(' | ');
      } else {
        results = item.预期结果 || '';
      }
      return [
        item.步骤序号,
        `"${String(item.步骤描述).replace(/"/g, '""')}"`,
        `"${String(results).replace(/"/g, '""')}"`
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }
  
  function exportToMarkdown(data) {
    if (data.length === 0) return '';
    const allKeys = new Set();
    data.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);
    
    function escapeMarkdown(text) {
      if (text === null || text === undefined) return '';
      const str = Array.isArray(text) ? text.join(' | ') : String(text);
      return str.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
    }
    
    const rows = data.map(item => {
      return headers.map(header => escapeMarkdown(item[header]));
    });
    
    return [
      '| ' + headers.join(' | ') + ' |',
      '| ' + headers.map(() => '---').join(' | ') + ' |',
      ...rows.map(row => '| ' + row.join(' | ') + ' |')
    ].join('\n');
  }
  
  async function copyToClipboard(text) {
    try {
      // 优先使用现代 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // Clipboard API 失败，使用降级方案
      console.warn('Clipboard API 失败，使用降级方案:', err.message);
    }
    
    // 降级方案：使用 execCommand（需要用户交互）
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('复制失败:', err);
      return false;
    }
  }
  
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // ==================== 主执行逻辑 ====================
  
  console.log('🚀 开始提取表格数据...');
  const extractedData = extractTableData();
  
  if (extractedData.length === 0) {
    console.warn('⚠️ 未找到表格数据，请检查页面是否包含表格');
    console.log('💡 调试提示: 请检查表格选择器是否正确');
    return;
  }
  
  console.log(`✅ 成功提取 ${extractedData.length} 条数据`);
  console.log('📊 提取的数据:', extractedData);
  
  // 生成导出数据
  const jsonData = exportToJSON(extractedData);
  const csvData = exportToCSV(extractedData);
  const markdownData = exportToMarkdown(extractedData);
  
  // 创建导出器对象
  const exporter = {
    data: extractedData,
    json: jsonData,
    csv: csvData,
    markdown: markdownData,
    
    copyJSON: async () => {
      const success = await copyToClipboard(jsonData);
      console.log(success ? '✅ JSON已复制到剪贴板' : '❌ 复制失败');
      return success;
    },
    
    copyCSV: async () => {
      const success = await copyToClipboard(csvData);
      console.log(success ? '✅ CSV已复制到剪贴板' : '❌ 复制失败');
      return success;
    },
    
    copyMarkdown: async () => {
      const success = await copyToClipboard(markdownData);
      console.log(success ? '✅ Markdown已复制到剪贴板' : '❌ 复制失败');
      return success;
    },
    
    downloadJSON: (filename) => {
      downloadFile(jsonData, filename || `表格数据_${Date.now()}.json`, 'application/json');
      console.log('✅ JSON文件下载中...');
    },
    
    downloadCSV: (filename) => {
      downloadFile(csvData, filename || `表格数据_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
      console.log('✅ CSV文件下载中...');
    },
    
    downloadMarkdown: (filename) => {
      downloadFile(markdownData, filename || `表格数据_${Date.now()}.md`, 'text/markdown');
      console.log('✅ Markdown文件下载中...');
    }
  };
  
  // 挂载到window对象
  window.tableExtractor = exporter;
  
  console.log('\n📋 使用说明:');
  console.log('  - window.tableExtractor.data              // 查看提取的数据');
  console.log('  - window.tableExtractor.json             // 查看JSON字符串');
  console.log('  - window.tableExtractor.csv              // 查看CSV字符串');
  console.log('  - window.tableExtractor.markdown         // 查看Markdown字符串');
  console.log('  - await window.tableExtractor.copyJSON()      // 复制JSON到剪贴板');
  console.log('  - await window.tableExtractor.copyCSV()       // 复制CSV到剪贴板');
  console.log('  - await window.tableExtractor.copyMarkdown()  // 复制Markdown到剪贴板');
  console.log('  - window.tableExtractor.downloadJSON()        // 下载JSON文件');
  console.log('  - window.tableExtractor.downloadCSV()         // 下载CSV文件');
  console.log('  - window.tableExtractor.downloadMarkdown()     // 下载Markdown文件');
  
  console.log('\n💡 提示: 使用 window.tableExtractor.copyJSON() 复制数据到剪贴板');
  console.log('   或者直接复制上面的 JSON 数据');
  
  return extractedData;
})();
