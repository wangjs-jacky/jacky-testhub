/**
 * 查询表格行数脚本 - 可直接在Chrome控制台运行
 * 使用方法：复制整个脚本到控制台，回车执行
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
  
  // 检查行是否有内容
  function hasContent(row, stepDescIndex, expectedResultIndex) {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return false;
    if (cells.length <= Math.max(stepDescIndex, expectedResultIndex)) return false;
    
    // 检查步骤描述
    const stepDescCell = cells[stepDescIndex];
    const stepDescTextarea = stepDescCell.querySelector('textarea');
    const stepDescValue = stepDescTextarea ? (stepDescTextarea.value || cleanText(stepDescTextarea)) : cleanText(stepDescCell);
    
    // 检查预期结果
    const expectedResultCell = cells[expectedResultIndex];
    const expectedResultTextareas = expectedResultCell.querySelectorAll('textarea');
    let expectedResultValue = '';
    if (expectedResultTextareas.length > 0) {
      expectedResultValue = expectedResultTextareas[0].value || cleanText(expectedResultTextareas[0]);
    } else {
      expectedResultValue = cleanText(expectedResultCell);
    }
    
    // 如果步骤描述或预期结果有内容，则认为有内容
    return (stepDescValue && stepDescValue.trim().length > 0 && stepDescValue !== '输入步骤描述') ||
           (expectedResultValue && expectedResultValue.trim().length > 0 && expectedResultValue !== '输入预期结果');
  }
  
  // 主查询函数
  function checkTableRows() {
    console.log('🔍 开始查询表格信息...\n');
    
    const rows = findTableRows();
    const { stepDescIndex, expectedResultIndex } = findColumnIndices();
    
    console.log(`📊 表格基本信息:`);
    console.log(`  - 总行数: ${rows.length}`);
    console.log(`  - 列索引: 步骤描述=${stepDescIndex}, 预期结果=${expectedResultIndex}`);
    
    // 统计有内容的行
    let contentRows = 0;
    let emptyRows = 0;
    const rowDetails = [];
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) {
        emptyRows++;
        return;
      }
      
      const hasData = hasContent(row, stepDescIndex, expectedResultIndex);
      if (hasData) {
        contentRows++;
      } else {
        emptyRows++;
      }
      
      // 获取行的详细信息
      if (cells.length > Math.max(stepDescIndex, expectedResultIndex)) {
        const stepDescCell = cells[stepDescIndex];
        const stepDescTextarea = stepDescCell.querySelector('textarea');
        const stepDescValue = stepDescTextarea ? (stepDescTextarea.value || cleanText(stepDescTextarea)) : cleanText(stepDescCell);
        
        const expectedResultCell = cells[expectedResultIndex];
        const expectedResultTextareas = expectedResultCell.querySelectorAll('textarea');
        let expectedResultValue = '';
        if (expectedResultTextareas.length > 0) {
          expectedResultValue = expectedResultTextareas[0].value || cleanText(expectedResultTextareas[0]);
        } else {
          expectedResultValue = cleanText(expectedResultCell);
        }
        
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
    
    // 显示前10行和后10行的详细信息
    console.log(`\n📋 行详情 (前10行):`);
    rowDetails.slice(0, 10).forEach(detail => {
      const status = detail.hasContent ? '✅' : '⚪';
      console.log(`  ${status} 第${detail.rowIndex}行: 步骤="${detail.stepDesc}" | 预期="${detail.expectedResult}"`);
    });
    
    if (rowDetails.length > 10) {
      console.log(`\n📋 行详情 (后10行):`);
      rowDetails.slice(-10).forEach(detail => {
        const status = detail.hasContent ? '✅' : '⚪';
        console.log(`  ${status} 第${detail.rowIndex}行: 步骤="${detail.stepDesc}" | 预期="${detail.expectedResult}"`);
      });
    }
    
    // 返回结果对象
    const result = {
      totalRows: rows.length,
      contentRows: contentRows,
      emptyRows: emptyRows,
      stepDescIndex: stepDescIndex,
      expectedResultIndex: expectedResultIndex,
      rowDetails: rowDetails
    };
    
    // 挂载到window对象
    window.tableRowInfo = result;
    
    console.log(`\n💡 提示: 详细数据已保存到 window.tableRowInfo`);
    console.log(`   使用 window.tableRowInfo 查看完整信息`);
    
    return result;
  }
  
  // 执行查询
  const result = checkTableRows();
  
  // 挂载函数到window，方便重新查询
  window.checkTableRows = checkTableRows;
  
  console.log(`\n💡 提示: 使用 checkTableRows() 可以重新查询`);
  
  return result;
})();

