/**
 * 自动添加表格行脚本 - 可直接在Chrome控制台运行
 * 使用方法：复制整个脚本到控制台，回车执行
 * 
 * 功能：自动点击"添加步骤"按钮，直到达到目标行数
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
  
  // 查找"添加步骤"按钮
  function findAddStepButton() {
    // 尝试多种可能的选择器
    const selectors = [
      'button:contains("添加步骤")',
      'button:contains("+ 添加步骤")',
      'button:contains("添加")',
      '.add-step-btn',
      '[class*="add-step"]',
      '[class*="addStep"]',
      'button[title*="添加"]',
      'button[title*="Add"]'
    ];
    
    // 先尝试通过文本内容查找
    const buttons = document.querySelectorAll('button, a, span[role="button"]');
    for (const btn of buttons) {
      const text = cleanText(btn).toLowerCase();
      if (text.includes('添加步骤') || text.includes('添加') && text.includes('步骤')) {
        return btn;
      }
    }
    
    // 尝试通过class查找
    const classSelectors = [
      '.ant-btn',
      'button.ant-btn',
      '[class*="add"]'
    ];
    
    for (const selector of classSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = cleanText(el).toLowerCase();
        if (text.includes('添加') || text.includes('add')) {
          return el;
        }
      }
    }
    
    // 查找页面底部的按钮（通常添加按钮在底部）
    const footerButtons = document.querySelectorAll('footer button, .footer button, [class*="footer"] button');
    for (const btn of footerButtons) {
      const text = cleanText(btn).toLowerCase();
      if (text.includes('添加') || text.includes('add')) {
        return btn;
      }
    }
    
    return null;
  }
  
  // 获取当前表格行数
  function getCurrentRowCount() {
    const rows = findTableRows();
    return rows.length;
  }
  
  // 等待函数
  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 等待行数变化（用于检测网络请求完成）
  async function waitForRowCountChange(currentCount, maxWait = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      await wait(200); // 每200ms检查一次
      const newCount = getCurrentRowCount();
      if (newCount > currentCount) {
        return newCount;
      }
    }
    // 超时后返回当前行数
    return getCurrentRowCount();
  }
  
  // 滚动到按钮位置（确保按钮可见）
  function scrollToButton(button) {
    if (button) {
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 等待滚动完成
      return new Promise(resolve => setTimeout(resolve, 300));
    }
    return Promise.resolve();
  }
  
  // 主函数：添加表格行
  async function addTableRows(targetCount, options = {}) {
    const {
      initialWait = 500,      // 初始等待时间（ms）
      clickInterval = 1000,    // 每次点击后的等待时间（ms）
      maxWaitForResponse = 5000, // 等待网络响应的最大时间（ms）
      retryTimes = 3           // 如果点击后行数没变化，重试次数
    } = options;
    
    console.log(`🚀 开始添加表格行...`);
    console.log(`📊 目标行数: ${targetCount}`);
    
    // 查找添加按钮
    const addButton = findAddStepButton();
    if (!addButton) {
      console.error('❌ 未找到"添加步骤"按钮');
      console.log('💡 提示: 请检查按钮是否存在，或手动指定按钮选择器');
      return {
        success: false,
        error: '未找到添加按钮',
        currentCount: getCurrentRowCount(),
        targetCount: targetCount
      };
    }
    
    console.log(`✅ 找到添加按钮:`, addButton);
    console.log(`   按钮文本: "${cleanText(addButton)}"`);
    
    // 获取当前行数
    let currentCount = getCurrentRowCount();
    console.log(`📈 当前行数: ${currentCount}`);
    
    if (currentCount >= targetCount) {
      console.log(`✅ 当前行数(${currentCount})已满足目标(${targetCount})，无需添加`);
      return {
        success: true,
        currentCount: currentCount,
        targetCount: targetCount,
        added: 0
      };
    }
    
    const needAdd = targetCount - currentCount;
    console.log(`📝 需要添加 ${needAdd} 行`);
    
    // 初始等待
    await wait(initialWait);
    
    let addedCount = 0;
    let failedClicks = 0;
    const errors = [];
    
    // 滚动到按钮位置
    await scrollToButton(addButton);
    
    // 循环点击直到达到目标行数
    while (currentCount < targetCount && failedClicks < retryTimes) {
      const countBeforeClick = currentCount;
      
      console.log(`\n🖱️  点击添加按钮 (当前: ${currentCount}/${targetCount})...`);
      
      try {
        // 点击按钮
        addButton.click();
        addedCount++;
        
        // 等待行数变化
        console.log(`⏳ 等待行数更新...`);
        const newCount = await waitForRowCountChange(countBeforeClick, maxWaitForResponse);
        
        if (newCount > countBeforeClick) {
          currentCount = newCount;
          console.log(`✅ 添加成功！当前行数: ${currentCount}`);
          failedClicks = 0; // 重置失败计数
        } else {
          failedClicks++;
          console.warn(`⚠️ 点击后行数未变化 (仍为 ${currentCount})，失败次数: ${failedClicks}/${retryTimes}`);
          
          if (failedClicks >= retryTimes) {
            errors.push(`连续 ${retryTimes} 次点击后行数未变化`);
            break;
          }
        }
        
        // 等待间隔（避免请求过快）
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
    
    // 最终检查
    const finalCount = getCurrentRowCount();
    const success = finalCount >= targetCount;
    
    console.log(`\n📊 添加完成:`);
    console.log(`  - 目标行数: ${targetCount}`);
    console.log(`  - 最终行数: ${finalCount}`);
    console.log(`  - 成功添加: ${finalCount - (currentCount - addedCount)} 行`);
    console.log(`  - 点击次数: ${addedCount}`);
    
    if (errors.length > 0) {
      console.warn(`\n⚠️ 错误信息:`);
      errors.forEach(err => console.warn(`  - ${err}`));
    }
    
    if (success) {
      console.log(`\n✅ 成功达到目标行数！`);
    } else {
      console.warn(`\n⚠️ 未达到目标行数，当前: ${finalCount}, 目标: ${targetCount}`);
    }
    
    return {
      success: success,
      currentCount: finalCount,
      targetCount: targetCount,
      added: finalCount - (currentCount - addedCount),
      clicks: addedCount,
      errors: errors
    };
  }
  
  // 挂载到window对象
  window.addTableRows = addTableRows;
  window.findAddStepButton = findAddStepButton;
  window.getCurrentRowCount = getCurrentRowCount;
  
  console.log('📋 表格行添加脚本已加载');
  console.log('\n使用方法:');
  console.log('  addTableRows(10)  // 添加行直到达到10行');
  console.log('  addTableRows(10, { clickInterval: 2000 })  // 自定义点击间隔');
  console.log('\n示例:');
  console.log('  // 添加行直到达到13行');
  console.log('  await addTableRows(13);');
  console.log('\n  // 自定义选项');
  console.log('  await addTableRows(13, {');
  console.log('    clickInterval: 1500,      // 每次点击后等待1.5秒');
  console.log('    maxWaitForResponse: 3000,  // 等待响应最多3秒');
  console.log('    retryTimes: 5             // 失败重试5次');
  console.log('  });');
  console.log('\n💡 提示:');
  console.log('  - 使用 getCurrentRowCount() 查看当前行数');
  console.log('  - 使用 findAddStepButton() 查找添加按钮');
  
  // 如果用户直接提供了目标行数，可以快速执行
  // 例如: addTableRows(13)
  
})();

