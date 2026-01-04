/**
 * 表格数据填充脚本 - 将JSON数据填充到表格中
 * 使用方法：
 * 1. 准备JSON数据（格式见下方示例）
 * 2. 在控制台运行此脚本
 * 3. 将JSON数据赋值给 data 变量
 * 4. 调用 fillTableData(data) 函数
 */

(function() {
  'use strict';
  
  // 清理文本内容
  function cleanText(element) {
    if (!element) return '';
    const text = element.innerText || element.textContent || '';
    return text.trim().replace(/\s+/g, ' ');
  }
  
  // 查找表格行
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
  
  // 填充步骤描述
  function fillStepDescription(cell, text) {
    if (!cell) return false;
    
    const value = text || '';
    
    // 优先查找textarea（使用精确的选择器）
    let textarea = cell.querySelector('textarea.ant-input.edit-cell-input');
    if (!textarea) {
      textarea = cell.querySelector('textarea');
    }
    
    if (textarea) {
      // 先聚焦
      textarea.focus();
      
      // 清空现有内容
      textarea.select();
      document.execCommand('delete', false);
      
      // 方法1: 使用原生setter设置值（React需要）
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(textarea, value);
      } catch (e) {
        textarea.value = value;
      }
      
      // 方法2: 触发React的合成事件
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      Object.defineProperty(inputEvent, 'target', { value: textarea, enumerable: true });
      textarea.dispatchEvent(inputEvent);
      
      // 方法3: 触发change事件
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      Object.defineProperty(changeEvent, 'target', { value: textarea, enumerable: true });
      textarea.dispatchEvent(changeEvent);
      
      // 方法4: 模拟键盘输入（最可靠）
      if (value) {
        // 先清空
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 然后逐个字符输入（模拟真实输入）
        for (let i = 0; i < value.length; i++) {
          const char = value[i];
          textarea.value += char;
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          Object.defineProperty(inputEvent, 'target', { value: textarea, enumerable: true });
          textarea.dispatchEvent(inputEvent);
        }
      }
      
      // 方法5: 使用React的内部API（如果可用）
      if (window.React && textarea._reactInternalFiber) {
        const fiber = textarea._reactInternalFiber;
        const props = fiber.memoizedProps || fiber.pendingProps;
        if (props && props.onChange) {
          const syntheticEvent = {
            target: textarea,
            currentTarget: textarea,
            type: 'change',
            nativeEvent: new Event('change', { bubbles: true })
          };
          props.onChange(syntheticEvent);
        }
      }
      
      // 最后触发blur事件
      textarea.dispatchEvent(new Event('blur', { bubbles: true }));
      textarea.blur();
      
      return true;
    }
    
    // 查找可编辑的div
    const editableDiv = cell.querySelector('div[contenteditable="true"]');
    if (editableDiv) {
      editableDiv.textContent = value;
      editableDiv.dispatchEvent(new Event('input', { bubbles: true }));
      editableDiv.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    
    return false;
  }
  
  // 填充预期结果
  function fillExpectedResult(cell, text) {
    if (!cell) return false;
    
    // 如果text是数组，合并为多行文本
    const resultText = Array.isArray(text) ? text.join('\n') : (text || '');
    
    // 查找所有textarea（使用精确的选择器）
    let textareas = cell.querySelectorAll('textarea.ant-input.edit-cell-input');
    if (textareas.length === 0) {
      textareas = cell.querySelectorAll('textarea');
    }
    
    if (textareas.length > 0) {
      // 优先填充到第一个textarea
      const firstTextarea = textareas[0];
      
      // 先聚焦
      firstTextarea.focus();
      
      // 清空现有内容
      firstTextarea.select();
      document.execCommand('delete', false);
      
      // 方法1: 使用原生setter设置值（React需要）
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(firstTextarea, resultText);
      } catch (e) {
        firstTextarea.value = resultText;
      }
      
      // 方法2: 触发React的合成事件
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      Object.defineProperty(inputEvent, 'target', { value: firstTextarea, enumerable: true });
      firstTextarea.dispatchEvent(inputEvent);
      
      // 方法3: 触发change事件
      const changeEvent = new Event('change', { bubbles: true, cancelable: true });
      Object.defineProperty(changeEvent, 'target', { value: firstTextarea, enumerable: true });
      firstTextarea.dispatchEvent(changeEvent);
      
      // 方法4: 模拟键盘输入（最可靠）
      if (resultText) {
        // 先清空
        firstTextarea.value = '';
        firstTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 然后逐个字符输入
        for (let i = 0; i < resultText.length; i++) {
          const char = resultText[i];
          firstTextarea.value += char;
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          Object.defineProperty(inputEvent, 'target', { value: firstTextarea, enumerable: true });
          firstTextarea.dispatchEvent(inputEvent);
        }
      }
      
      // 方法5: 使用React的内部API（如果可用）
      if (window.React && firstTextarea._reactInternalFiber) {
        const fiber = firstTextarea._reactInternalFiber;
        const props = fiber.memoizedProps || fiber.pendingProps;
        if (props && props.onChange) {
          const syntheticEvent = {
            target: firstTextarea,
            currentTarget: firstTextarea,
            type: 'change',
            nativeEvent: new Event('change', { bubbles: true })
          };
          props.onChange(syntheticEvent);
        }
      }
      
      // 最后触发blur事件
      firstTextarea.dispatchEvent(new Event('blur', { bubbles: true }));
      firstTextarea.blur();
      
      // 如果有多个结果行，需要添加到多个textarea
      const lines = resultText.split('\n').filter(line => line.trim().length > 0);
      if (lines.length > 1 && textareas.length < lines.length) {
        // 需要添加更多textarea
        lines.forEach((line, index) => {
          if (index === 0) {
            // 第一个已经填充了
            return;
          }
          
          if (index < textareas.length) {
            // 填充到现有的textarea
            const textarea = textareas[index];
            textarea.focus();
            textarea.value = line;
            try {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
              nativeInputValueSetter.call(textarea, line);
            } catch (e) {}
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.blur();
          } else {
            // 需要点击"添加"按钮
            const addButton = cell.querySelector('.add-sub-step-btn, .anticon-plus');
            if (addButton) {
              addButton.click();
              // 等待新textarea创建后填充
              setTimeout(() => {
                const newTextareas = cell.querySelectorAll('textarea');
                if (newTextareas[index]) {
                  const newTextarea = newTextareas[index];
                  newTextarea.focus();
                  newTextarea.value = line;
                  try {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                    nativeInputValueSetter.call(newTextarea, line);
                  } catch (e) {}
                  newTextarea.dispatchEvent(new Event('input', { bubbles: true }));
                  newTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                  newTextarea.blur();
                }
              }, 200);
            }
          }
        });
      }
      
      return true;
    }
    
    // 如果没有textarea，尝试填充到可编辑div
    const editableDiv = cell.querySelector('div[contenteditable="true"]');
    if (editableDiv) {
      editableDiv.textContent = resultText;
      editableDiv.dispatchEvent(new Event('input', { bubbles: true }));
      editableDiv.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    
    return false;
  }
  
  // 主填充函数
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
    
    // 遍历数据，填充到对应的行
    data.forEach((item, dataIndex) => {
      const rowIndex = dataIndex; // 假设数据顺序对应表格行顺序
      
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
      
      // 填充步骤描述
      const stepDescCell = cells[stepDescIndex];
      const stepDesc = item.步骤描述 || '';
      if (fillStepDescription(stepDescCell, stepDesc)) {
        console.log(`✅ 第${dataIndex + 1}行: 步骤描述已填充`);
      } else {
        console.warn(`⚠️ 第${dataIndex + 1}行: 步骤描述填充失败`);
        errors.push(`数据项 ${dataIndex + 1}: 步骤描述填充失败`);
      }
      
      // 填充预期结果
      const expectedResultCell = cells[expectedResultIndex];
      const expectedResult = item.预期结果 || '';
      if (fillExpectedResult(expectedResultCell, expectedResult)) {
        console.log(`✅ 第${dataIndex + 1}行: 预期结果已填充`);
        filledCount++;
      } else {
        console.warn(`⚠️ 第${dataIndex + 1}行: 预期结果填充失败`);
        errors.push(`数据项 ${dataIndex + 1}: 预期结果填充失败`);
      }
      
      // 添加延迟，避免操作过快
      if (dataIndex < data.length - 1) {
        // 可以添加小延迟，但为了速度，这里不延迟
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
  
  // 挂载到window对象
  window.fillTableData = fillTableData;
  
  // 示例数据（用户需要替换为自己的数据）
  const exampleData = [
    {
      "步骤序号": 1,
      "步骤描述": "等待\"10000ms\"",
      "预期结果": ""
    },
    {
      "步骤序号": 2,
      "步骤描述": "点击[SKU区域]下的[套餐卡片2]",
      "预期结果": "**APP** [底部bar]展示\"低至\",\"CNY 3.00\",\"每人\"\n**H5** [底部bar]展示\"低至\",\"CNY 3.00\",\"每人\"\n**PC** [产品标题模块] 展示 \"低至\",\"CNY 3.00\",\"每人\""
    }
  ];
  
  console.log('📋 表格填充脚本已加载');
  console.log('\n使用方法:');
  console.log('1. 准备JSON数据（格式如下）');
  console.log('2. 将数据赋值给变量: const data = [你的JSON数据];');
  console.log('3. 调用函数: fillTableData(data);');
  console.log('\n示例:');
  console.log('const data = ' + JSON.stringify(exampleData, null, 2) + ';');
  console.log('fillTableData(data);');
  
  // 如果用户直接提供了数据，可以快速填充
  window.quickFill = function(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      return fillTableData(data);
    } catch (err) {
      console.error('❌ JSON解析失败:', err);
      return null;
    }
  };
  
  console.log('\n💡 快速填充（如果数据是字符串）:');
  console.log('quickFill(\'[你的JSON字符串]\');');
  
})();

