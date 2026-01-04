/**
 * 表格工具集 - 全局挂载版本
 * 整合了检查行数、添加行、提取数据、填充数据等功能
 * 使用方法：在控制台执行此脚本，所有函数将挂载到 window.tableUtils
 */

(function() {
  'use strict';

  // ==================== 工具函数 ====================
  
  function cleanText(element) {
    if (!element) return '';
    const text = element.innerText || element.textContent || '';
    return text.trim().replace(/\s+/g, ' ');
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
    
    if (stepDescIndex === -1) stepDescIndex = 0;
    if (expectedResultIndex === -1) expectedResultIndex = 1;
    
    return { stepDescIndex, expectedResultIndex };
  }

  // ==================== 1. 检查表格行数 ====================
  
  function checkTableRows() {
    console.log('🔍 开始查询表格信息...\n');
    
    const rows = findTableRows();
    const { stepDescIndex, expectedResultIndex } = findColumnIndices();
    
    console.log(`📊 表格基本信息:`);
    console.log(`  - 总行数: ${rows.length}`);
    console.log(`  - 列索引: 步骤描述=${stepDescIndex}, 预期结果=${expectedResultIndex}`);
    
    let contentRows = 0;
    let emptyRows = 0;
    const rowDetails = [];
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) {
        emptyRows++;
        return;
      }
      
      const stepDescCell = cells[stepDescIndex];
      const stepDescTextarea = stepDescCell?.querySelector('textarea');
      const stepDescValue = stepDescTextarea ? (stepDescTextarea.value || cleanText(stepDescTextarea)) : cleanText(stepDescCell);
      
      const expectedResultCell = cells[expectedResultIndex];
      const expectedResultTextareas = expectedResultCell?.querySelectorAll('textarea');
      let expectedResultValue = '';
      if (expectedResultTextareas && expectedResultTextareas.length > 0) {
        expectedResultValue = expectedResultTextareas[0].value || cleanText(expectedResultTextareas[0]);
      } else {
        expectedResultValue = cleanText(expectedResultCell);
      }
      
      const hasData = (stepDescValue && stepDescValue.trim().length > 0 && stepDescValue !== '输入步骤描述') ||
                     (expectedResultValue && expectedResultValue.trim().length > 0 && expectedResultValue !== '输入预期结果');
      
      if (hasData) {
        contentRows++;
      } else {
        emptyRows++;
      }
      
      if (cells.length > Math.max(stepDescIndex, expectedResultIndex)) {
        rowDetails.push({
          rowIndex: index + 1,
          hasContent: hasData,
          stepDesc: stepDescValue ? stepDescValue.substring(0, 30) : '(空)',
          expectedResult: expectedResultValue ? expectedResultValue.substring(0, 30) : '(空)'
        });
      }
    });
    
    console.log(`\n📈 内容统计:`);
    console.log(`  - 有内容的行: ${contentRows}`);
    console.log(`  - 空行: ${emptyRows}`);
    
    const result = {
      totalRows: rows.length,
      contentRows: contentRows,
      emptyRows: emptyRows,
      stepDescIndex: stepDescIndex,
      expectedResultIndex: expectedResultIndex,
      rowDetails: rowDetails
    };
    
    window.tableRowInfo = result;
    console.log(`\n💡 提示: 详细数据已保存到 window.tableRowInfo`);
    
    return result;
  }

  // ==================== 2. 添加表格行 ====================
  
  function findAddStepButton() {
    const buttons = document.querySelectorAll('button, a, span[role="button"]');
    for (const btn of buttons) {
      const text = cleanText(btn).toLowerCase();
      if (text.includes('添加步骤') || (text.includes('添加') && text.includes('步骤'))) {
        return btn;
      }
    }
    
    const footerButtons = document.querySelectorAll('footer button, .footer button, [class*="footer"] button');
    for (const btn of footerButtons) {
      const text = cleanText(btn).toLowerCase();
      if (text.includes('添加') || text.includes('add')) {
        return btn;
      }
    }
    
    return null;
  }

  function getCurrentRowCount() {
    return findTableRows().length;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function waitForRowCountChange(currentCount, maxWait = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      await wait(200);
      const newCount = getCurrentRowCount();
      if (newCount > currentCount) {
        return newCount;
      }
    }
    return getCurrentRowCount();
  }

  async function addTableRows(targetCount, options = {}) {
    const {
      initialWait = 500,
      clickInterval = 1000,
      maxWaitForResponse = 5000,
      retryTimes = 3
    } = options;
    
    console.log(`🚀 开始添加表格行...`);
    console.log(`📊 目标行数: ${targetCount}`);
    
    const addButton = findAddStepButton();
    if (!addButton) {
      console.error('❌ 未找到"添加步骤"按钮');
      return {
        success: false,
        error: '未找到添加按钮',
        currentCount: getCurrentRowCount(),
        targetCount: targetCount
      };
    }
    
    console.log(`✅ 找到添加按钮`);
    
    let currentCount = getCurrentRowCount();
    console.log(`📈 当前行数: ${currentCount}`);
    
    if (currentCount >= targetCount) {
      console.log(`✅ 当前行数(${currentCount})已满足目标(${targetCount})`);
      return {
        success: true,
        currentCount: currentCount,
        targetCount: targetCount,
        added: 0
      };
    }
    
    const needAdd = targetCount - currentCount;
    console.log(`📝 需要添加 ${needAdd} 行`);
    
    await wait(initialWait);
    
    let addedCount = 0;
    let failedClicks = 0;
    const errors = [];
    
    while (currentCount < targetCount && failedClicks < retryTimes) {
      const countBeforeClick = currentCount;
      
      console.log(`🖱️  点击添加按钮 (当前: ${currentCount}/${targetCount})...`);
      
      try {
        addButton.click();
        addedCount++;
        
        const newCount = await waitForRowCountChange(countBeforeClick, maxWaitForResponse);
        
        if (newCount > countBeforeClick) {
          currentCount = newCount;
          console.log(`✅ 添加成功！当前行数: ${currentCount}`);
          failedClicks = 0;
        } else {
          failedClicks++;
          console.warn(`⚠️ 点击后行数未变化，失败次数: ${failedClicks}/${retryTimes}`);
          
          if (failedClicks >= retryTimes) {
            errors.push(`连续 ${retryTimes} 次点击后行数未变化`);
            break;
          }
        }
        
        if (currentCount < targetCount) {
          await wait(clickInterval);
        }
      } catch (error) {
        failedClicks++;
        errors.push(`点击失败: ${error.message}`);
        console.error(`❌ 点击失败:`, error);
        
        if (failedClicks >= retryTimes) {
          break;
        }
        
        await wait(clickInterval);
      }
    }
    
    const finalCount = getCurrentRowCount();
    const success = finalCount >= targetCount;
    
    console.log(`\n📊 添加完成:`);
    console.log(`  - 目标行数: ${targetCount}`);
    console.log(`  - 最终行数: ${finalCount}`);
    console.log(`  - 成功添加: ${finalCount - (currentCount - addedCount)} 行`);
    
    return {
      success: success,
      currentCount: finalCount,
      targetCount: targetCount,
      added: finalCount - (currentCount - addedCount),
      clicks: addedCount,
      errors: errors
    };
  }

  // ==================== 3. 提取表格数据 ====================
  
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

  function isButtonText(text) {
    if (!text) return false;
    const buttonPatterns = [
      'success', 'error', '查看生成代码', '查看错误信息', '复制快照地址',
      /^success\s*$/i, /^error\s*$/i
    ];
    
    const trimmed = text.trim();
    for (const pattern of buttonPatterns) {
      if (typeof pattern === 'string') {
        if (trimmed === pattern || trimmed.startsWith(pattern + ' ') || trimmed.endsWith(' ' + pattern)) {
          return true;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(trimmed)) return true;
      }
    }
    return false;
  }

  function extractStepDescription(cell) {
    if (!cell) return '';
    
    const textarea = cell.querySelector('textarea');
    if (textarea) {
      let text = textarea.value;
      if (!text || text.trim().length === 0) {
        text = cleanText(textarea);
      }
      if (text && text.trim().length > 0 && text !== '输入步骤描述') {
        return text.trim();
      }
    }
    
    const fullText = cleanText(cell);
    if (fullText && fullText.trim().length > 0 && fullText !== '输入步骤描述') {
      const cleaned = removeButtonText(fullText);
      if (cleaned && cleaned.trim().length > 2) {
        return cleaned.trim();
      }
    }
    
    return '';
  }

  function extractExpectedResults(cell) {
    if (!cell) return [];
    
    const results = [];
    const textareas = cell.querySelectorAll('textarea');
    
    if (textareas.length > 0) {
      textareas.forEach(textarea => {
        const text = textarea.value || cleanText(textarea);
        if (text && text.trim().length > 0 && text !== '输入预期结果') {
          if (!isButtonText(text)) {
            results.push(text.trim());
          }
        }
      });
    }
    
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
    
    return results;
  }

  function extractTableData() {
    const data = [];
    const rows = findTableRows();
    
    if (rows.length === 0) {
      console.warn('未找到表格行');
      return data;
    }
    
    const { stepDescIndex, expectedResultIndex } = findColumnIndices();
    console.log(`列索引: 步骤描述=${stepDescIndex}, 预期结果=${expectedResultIndex}`);
    console.log(`找到 ${rows.length} 行`);
    
    let validRowIndex = 0;
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      
      if (cells.length === 0) {
        return;
      }
      
      if (cells.length <= Math.max(stepDescIndex, expectedResultIndex)) {
        return;
      }
      
      let stepDescription = extractStepDescription(cells[stepDescIndex]);
      
      if (!stepDescription || stepDescription.trim().length === 0) {
        const textarea = cells[stepDescIndex].querySelector('textarea');
        if (textarea && textarea.value) {
          stepDescription = textarea.value.trim();
        } else {
          stepDescription = removeButtonText(cleanText(cells[stepDescIndex]));
        }
      }
      
      if (!stepDescription || stepDescription.trim().length === 0) {
        stepDescription = '';
      }
      
      if (stepDescription.includes('步骤描述') && stepDescription.length < 15) {
        return;
      }
      
      const expectedResults = extractExpectedResults(cells[expectedResultIndex]);
      
      data.push({
        步骤序号: validRowIndex + 1,
        步骤描述: stepDescription.trim(),
        预期结果: expectedResults.length === 0 ? '' : (expectedResults.length === 1 ? expectedResults[0] : expectedResults)
      });
      
      validRowIndex++;
    });
    
    console.log(`\n✅ 成功提取 ${validRowIndex} 行数据`);
    
    return data;
  }

  // ==================== 4. 填充表格数据 ====================
  
  function fillStepDescription(cell, text) {
    if (!cell) return false;
    
    const value = text || '';
    let textarea = cell.querySelector('textarea.ant-input.edit-cell-input');
    if (!textarea) {
      textarea = cell.querySelector('textarea');
    }
    
    if (textarea) {
      textarea.focus();
      textarea.select();
      document.execCommand('delete', false);
      
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(textarea, value);
      } catch (e) {
        textarea.value = value;
      }
      
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      Object.defineProperty(inputEvent, 'target', { value: textarea, enumerable: true });
      textarea.dispatchEvent(inputEvent);
      
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      Object.defineProperty(changeEvent, 'target', { value: textarea, enumerable: true });
      textarea.dispatchEvent(changeEvent);
      
      if (value) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        for (let i = 0; i < value.length; i++) {
          const char = value[i];
          textarea.value += char;
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          Object.defineProperty(inputEvent, 'target', { value: textarea, enumerable: true });
          textarea.dispatchEvent(inputEvent);
        }
      }
      
      textarea.dispatchEvent(new Event('blur', { bubbles: true }));
      textarea.blur();
      
      return true;
    }
    
    return false;
  }

  function fillExpectedResult(cell, text) {
    if (!cell) return false;
    
    const resultText = Array.isArray(text) ? text.join('\n') : (text || '');
    
    let textareas = cell.querySelectorAll('textarea.ant-input.edit-cell-input');
    if (textareas.length === 0) {
      textareas = cell.querySelectorAll('textarea');
    }
    
    if (textareas.length > 0) {
      const firstTextarea = textareas[0];
      
      firstTextarea.focus();
      firstTextarea.select();
      document.execCommand('delete', false);
      
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(firstTextarea, resultText);
      } catch (e) {
        firstTextarea.value = resultText;
      }
      
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      Object.defineProperty(inputEvent, 'target', { value: firstTextarea, enumerable: true });
      firstTextarea.dispatchEvent(inputEvent);
      
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      Object.defineProperty(changeEvent, 'target', { value: firstTextarea, enumerable: true });
      firstTextarea.dispatchEvent(changeEvent);
      
      if (resultText) {
        firstTextarea.value = '';
        firstTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        for (let i = 0; i < resultText.length; i++) {
          const char = resultText[i];
          firstTextarea.value += char;
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          Object.defineProperty(inputEvent, 'target', { value: firstTextarea, enumerable: true });
          firstTextarea.dispatchEvent(inputEvent);
        }
      }
      
      firstTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
      firstTextarea.blur();
      
      return true;
    }
    
    return false;
  }

  function fillTableData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      console.error('❌ 数据格式错误：需要数组格式的数据');
      return;
    }
    
    console.log(`🚀 开始填充 ${data.length} 条数据到表格...`);
    
    const rows = findTableRows();
    if (rows.length === 0) {
      console.error('❌ 未找到表格行');
      return;
    }
    
    const { stepDescIndex, expectedResultIndex } = findColumnIndices();
    console.log(`列索引: 步骤描述=${stepDescIndex}, 预期结果=${expectedResultIndex}`);
    console.log(`找到 ${rows.length} 行`);
    
    let filledCount = 0;
    const errors = [];
    
    data.forEach((item, dataIndex) => {
      const rowIndex = dataIndex;
      
      if (rowIndex >= rows.length) {
        errors.push(`数据项 ${dataIndex + 1}: 表格行数不足（只有${rows.length}行）`);
        return;
      }
      
      const row = rows[rowIndex];
      const cells = row.querySelectorAll('td');
      
      if (cells.length <= Math.max(stepDescIndex, expectedResultIndex)) {
        errors.push(`数据项 ${dataIndex + 1}: 列数不足`);
        return;
      }
      
      const stepDescCell = cells[stepDescIndex];
      const stepDesc = item.步骤描述 || '';
      if (fillStepDescription(stepDescCell, stepDesc)) {
        console.log(`✅ 第${dataIndex + 1}行: 步骤描述已填充`);
      } else {
        console.warn(`⚠️ 第${dataIndex + 1}行: 步骤描述填充失败`);
        errors.push(`数据项 ${dataIndex + 1}: 步骤描述填充失败`);
      }
      
      const expectedResultCell = cells[expectedResultIndex];
      const expectedResult = item.预期结果 || '';
      if (fillExpectedResult(expectedResultCell, expectedResult)) {
        console.log(`✅ 第${dataIndex + 1}行: 预期结果已填充`);
        filledCount++;
      } else {
        console.warn(`⚠️ 第${dataIndex + 1}行: 预期结果填充失败`);
        errors.push(`数据项 ${dataIndex + 1}: 预期结果填充失败`);
      }
    });
    
    console.log(`\n✅ 填充完成！成功填充 ${filledCount} 条数据`);
    if (errors.length > 0) {
      console.warn(`\n⚠️ 有 ${errors.length} 个错误:`);
      errors.forEach(err => console.warn(`  - ${err}`));
    }
    
    return {
      success: errors.length === 0,
      filled: filledCount,
      total: data.length,
      errors: errors
    };
  }

  // ==================== 导出功能 ====================
  
  function exportToJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  // ==================== 全局挂载 ====================
  
  window.tableUtils = {
    // 检查表格行数
    checkTableRows,
    getCurrentRowCount,
    
    // 添加表格行
    addTableRows,
    findAddStepButton,
    
    // 提取表格数据
    extractTableData,
    
    // 填充表格数据
    fillTableData,
    
    // 导出
    exportToJSON,
    
    // 工具函数
    cleanText,
    findTableRows,
    findColumnIndices
  };

  console.log('✅ 表格工具集已加载到 window.tableUtils');
  console.log('\n📋 可用函数:');
  console.log('  - tableUtils.checkTableRows()        // 检查表格行数');
  console.log('  - tableUtils.getCurrentRowCount()    // 获取当前行数');
  console.log('  - tableUtils.addTableRows(13)         // 添加行直到达到13行');
  console.log('  - tableUtils.extractTableData()      // 提取表格数据');
  console.log('  - tableUtils.fillTableData(data)     // 填充表格数据');
  console.log('  - tableUtils.exportToJSON(data)      // 导出为JSON');
  
  return window.tableUtils;
})();
