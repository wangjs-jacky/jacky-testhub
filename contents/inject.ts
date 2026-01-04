/**
 * 注入表格工具集到页面
 * 这个脚本会在页面中注入 table-utils.js 的功能
 */

// 从 table-utils.js 中提取的核心函数
function cleanText(element: HTMLElement | null) {
  if (!element) return ''
  const text = element.innerText || element.textContent || ''
  return text.trim().replace(/\s+/g, ' ')
}

function findTableRows() {
  let rows = document.querySelectorAll('table tbody tr')
  if (rows.length === 0) {
    rows = document.querySelectorAll('.ant-table-tbody tr, .ant-table-row')
  }
  if (rows.length === 0) {
    rows = document.querySelectorAll('tr')
  }
  return Array.from(rows) as HTMLElement[]
}

function findColumnIndices() {
  let headerRow = document.querySelector('table thead tr, .ant-table-thead tr')
  if (!headerRow) {
    return { stepDescIndex: 0, expectedResultIndex: 1 }
  }
  
  const headers = headerRow.querySelectorAll('th, td')
  let stepDescIndex = -1
  let expectedResultIndex = -1
  
  headers.forEach((header, index) => {
    const text = cleanText(header as HTMLElement).toLowerCase()
    if (text.includes('步骤描述') || (text.includes('步骤') && text.includes('描述'))) {
      stepDescIndex = index
    } else if (text.includes('预期结果') || (text.includes('预期') && text.includes('结果'))) {
      expectedResultIndex = index
    }
  })
  
  if (stepDescIndex === -1) stepDescIndex = 0
  if (expectedResultIndex === -1) expectedResultIndex = 1
  
  return { stepDescIndex, expectedResultIndex }
}

function removeButtonText(text: string) {
  if (!text) return ''
  const buttonTexts = ['success', 'error', '查看生成代码', '查看错误信息', '复制快照地址']
  let cleaned = text
  for (const btnText of buttonTexts) {
    cleaned = cleaned.replace(new RegExp(`\\s*${btnText}\\s*`, 'gi'), ' ')
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

function isButtonText(text: string) {
  if (!text) return false
  const buttonPatterns = [
    'success', 'error', '查看生成代码', '查看错误信息', '复制快照地址',
    /^success\s*$/i, /^error\s*$/i
  ]
  
  const trimmed = text.trim()
  for (const pattern of buttonPatterns) {
    if (typeof pattern === 'string') {
      if (trimmed === pattern || trimmed.startsWith(pattern + ' ') || trimmed.endsWith(' ' + pattern)) {
        return true
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(trimmed)) return true
    }
  }
  return false
}

function extractStepDescription(cell: HTMLElement) {
  if (!cell) return ''
  
  const textarea = cell.querySelector('textarea') as HTMLTextAreaElement
  if (textarea) {
    let text = textarea.value
    if (!text || text.trim().length === 0) {
      text = cleanText(textarea)
    }
    if (text && text.trim().length > 0 && text !== '输入步骤描述') {
      return text.trim()
    }
  }
  
  const fullText = cleanText(cell)
  if (fullText && fullText.trim().length > 0 && fullText !== '输入步骤描述') {
    const cleaned = removeButtonText(fullText)
    if (cleaned && cleaned.trim().length > 2) {
      return cleaned.trim()
    }
  }
  
  return ''
}

function extractExpectedResults(cell: HTMLElement) {
  if (!cell) return []
  
  const results: string[] = []
  const textareas = cell.querySelectorAll('textarea')
  
  if (textareas.length > 0) {
    textareas.forEach(textarea => {
      const text = (textarea as HTMLTextAreaElement).value || cleanText(textarea as HTMLElement)
      if (text && text.trim().length > 0 && text !== '输入预期结果') {
        if (!isButtonText(text)) {
          results.push(text.trim())
        }
      }
    })
  }
  
  if (results.length === 0) {
    const spaceItems = cell.querySelectorAll('.ant-space-item')
    spaceItems.forEach(item => {
      const text = cleanText(item as HTMLElement)
      if (text && text.trim().length > 0 && text !== '输入预期结果') {
        if (!isButtonText(text)) {
          results.push(text.trim())
        }
      }
    })
  }
  
  return results
}

// 检查表格行数
function checkTableRows() {
  const rows = findTableRows()
  const { stepDescIndex, expectedResultIndex } = findColumnIndices()
  
  let contentRows = 0
  let emptyRows = 0
  const rowDetails: any[] = []
  
  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td')
    if (cells.length === 0) {
      emptyRows++
      return
    }
    
    const stepDescCell = cells[stepDescIndex] as HTMLElement
    const stepDescTextarea = stepDescCell?.querySelector('textarea') as HTMLTextAreaElement
    const stepDescValue = stepDescTextarea ? (stepDescTextarea.value || cleanText(stepDescTextarea)) : cleanText(stepDescCell)
    
    const expectedResultCell = cells[expectedResultIndex] as HTMLElement
    const expectedResultTextareas = expectedResultCell?.querySelectorAll('textarea')
    let expectedResultValue = ''
    if (expectedResultTextareas && expectedResultTextareas.length > 0) {
      expectedResultValue = (expectedResultTextareas[0] as HTMLTextAreaElement).value || cleanText(expectedResultTextareas[0] as HTMLElement)
    } else {
      expectedResultValue = cleanText(expectedResultCell)
    }
    
    const hasData = (stepDescValue && stepDescValue.trim().length > 0 && stepDescValue !== '输入步骤描述') ||
                   (expectedResultValue && expectedResultValue.trim().length > 0 && expectedResultValue !== '输入预期结果')
    
    if (hasData) {
      contentRows++
    } else {
      emptyRows++
    }
    
    if (cells.length > Math.max(stepDescIndex, expectedResultIndex)) {
      rowDetails.push({
        rowIndex: index + 1,
        hasContent: hasData,
        stepDesc: stepDescValue ? stepDescValue.substring(0, 30) : '(空)',
        expectedResult: expectedResultValue ? expectedResultValue.substring(0, 30) : '(空)'
      })
    }
  })
  
  return {
    totalRows: rows.length,
    contentRows,
    emptyRows,
    stepDescIndex,
    expectedResultIndex,
    rowDetails
  }
}

// 添加表格行
function findAddStepButton() {
  const buttons = document.querySelectorAll('button, a, span[role="button"]')
  for (const btn of buttons) {
    const text = cleanText(btn as HTMLElement).toLowerCase()
    if (text.includes('添加步骤') || (text.includes('添加') && text.includes('步骤'))) {
      return btn as HTMLElement
    }
  }
  
  const footerButtons = document.querySelectorAll('footer button, .footer button, [class*="footer"] button')
  for (const btn of footerButtons) {
    const text = cleanText(btn as HTMLElement).toLowerCase()
    if (text.includes('添加') || text.includes('add')) {
      return btn as HTMLElement
    }
  }
  
  return null
}

function getCurrentRowCount() {
  return findTableRows().length
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForRowCountChange(currentCount: number, maxWait = 5000) {
  const startTime = Date.now()
  while (Date.now() - startTime < maxWait) {
    await wait(200)
    const newCount = getCurrentRowCount()
    if (newCount > currentCount) {
      return newCount
    }
  }
  return getCurrentRowCount()
}

async function addTableRows(targetCount: number, options: any = {}) {
  const {
    initialWait = 500,
    clickInterval = 1000,
    maxWaitForResponse = 5000,
    retryTimes = 3
  } = options
  
  const addButton = findAddStepButton()
  if (!addButton) {
    return {
      success: false,
      error: '未找到添加按钮',
      currentCount: getCurrentRowCount(),
      targetCount: targetCount
    }
  }
  
  let currentCount = getCurrentRowCount()
  
  if (currentCount >= targetCount) {
    return {
      success: true,
      currentCount: currentCount,
      targetCount: targetCount,
      added: 0
    }
  }
  
  await wait(initialWait)
  
  let addedCount = 0
  let failedClicks = 0
  const errors: string[] = []
  
  while (currentCount < targetCount && failedClicks < retryTimes) {
    const countBeforeClick = currentCount
    
    try {
      ;(addButton as HTMLElement).click()
      addedCount++
      
      const newCount = await waitForRowCountChange(countBeforeClick, maxWaitForResponse)
      
      if (newCount > countBeforeClick) {
        currentCount = newCount
        failedClicks = 0
      } else {
        failedClicks++
        
        if (failedClicks >= retryTimes) {
          errors.push(`连续 ${retryTimes} 次点击后行数未变化`)
          break
        }
      }
      
      if (currentCount < targetCount) {
        await wait(clickInterval)
      }
    } catch (error: any) {
      failedClicks++
      errors.push(`点击失败: ${error.message}`)
      
      if (failedClicks >= retryTimes) {
        break
      }
      
      await wait(clickInterval)
    }
  }
  
  const finalCount = getCurrentRowCount()
  const success = finalCount >= targetCount
  
  return {
    success: success,
    currentCount: finalCount,
    targetCount: targetCount,
    added: finalCount - (currentCount - addedCount),
    clicks: addedCount,
    errors: errors
  }
}

// 提取表格数据
function extractTableData() {
  const data: any[] = []
  const rows = findTableRows()
  
  if (rows.length === 0) {
    return data
  }
  
  const { stepDescIndex, expectedResultIndex } = findColumnIndices()
  
  let validRowIndex = 0
  
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('td')
    
    if (cells.length === 0) {
      return
    }
    
    if (cells.length <= Math.max(stepDescIndex, expectedResultIndex)) {
      return
    }
    
    let stepDescription = extractStepDescription(cells[stepDescIndex] as HTMLElement)
    
    if (!stepDescription || stepDescription.trim().length === 0) {
      const textarea = cells[stepDescIndex].querySelector('textarea') as HTMLTextAreaElement
      if (textarea && textarea.value) {
        stepDescription = textarea.value.trim()
      } else {
        stepDescription = removeButtonText(cleanText(cells[stepDescIndex] as HTMLElement))
      }
    }
    
    if (!stepDescription || stepDescription.trim().length === 0) {
      stepDescription = ''
    }
    
    if (stepDescription.includes('步骤描述') && stepDescription.length < 15) {
      return
    }
    
    const expectedResults = extractExpectedResults(cells[expectedResultIndex] as HTMLElement)
    
    data.push({
      步骤序号: validRowIndex + 1,
      步骤描述: stepDescription.trim(),
      预期结果: expectedResults.length === 0 ? '' : (expectedResults.length === 1 ? expectedResults[0] : expectedResults)
    })
    
    validRowIndex++
  })
  
  return data
}

// 填充表格数据
function fillStepDescription(cell: HTMLElement, text: string) {
  if (!cell) return false
  
  const value = text || ''
  let textarea = cell.querySelector('textarea.ant-input.edit-cell-input') as HTMLTextAreaElement
  if (!textarea) {
    textarea = cell.querySelector('textarea') as HTMLTextAreaElement
  }
  
  if (textarea) {
    textarea.focus()
    textarea.select()
    document.execCommand('delete', false)
    
    try {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea, value)
      }
    } catch (e) {
      textarea.value = value
    }
    
    const inputEvent = new Event('input', { bubbles: true, cancelable: true })
    Object.defineProperty(inputEvent, 'target', { value: textarea, enumerable: true })
    textarea.dispatchEvent(inputEvent)
    
    const changeEvent = new Event('change', { bubbles: true, cancelable: true })
    Object.defineProperty(changeEvent, 'target', { value: textarea, enumerable: true })
    textarea.dispatchEvent(changeEvent)
    
    if (value) {
      textarea.value = ''
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      
      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        textarea.value += char
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        Object.defineProperty(inputEvent, 'target', { value: textarea, enumerable: true })
        textarea.dispatchEvent(inputEvent)
      }
    }
    
    textarea.dispatchEvent(new Event('blur', { bubbles: true }))
    textarea.blur()
    
    return true
  }
  
  return false
}

function fillExpectedResult(cell: HTMLElement, text: string | string[]) {
  if (!cell) return false
  
  const resultText = Array.isArray(text) ? text.join('\n') : (text || '')
  
  let textareas = cell.querySelectorAll('textarea.ant-input.edit-cell-input')
  if (textareas.length === 0) {
    textareas = cell.querySelectorAll('textarea')
  }
  
  if (textareas.length > 0) {
    const firstTextarea = textareas[0] as HTMLTextAreaElement
    
    firstTextarea.focus()
    firstTextarea.select()
    document.execCommand('delete', false)
    
    try {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(firstTextarea, resultText)
      }
    } catch (e) {
      firstTextarea.value = resultText
    }
    
    const inputEvent = new Event('input', { bubbles: true, cancelable: true })
    Object.defineProperty(inputEvent, 'target', { value: firstTextarea, enumerable: true })
    firstTextarea.dispatchEvent(inputEvent)
    
    const changeEvent = new Event('change', { bubbles: true, cancelable: true })
    Object.defineProperty(changeEvent, 'target', { value: firstTextarea, enumerable: true })
    firstTextarea.dispatchEvent(changeEvent)
    
    if (resultText) {
      firstTextarea.value = ''
      firstTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      
      for (let i = 0; i < resultText.length; i++) {
        const char = resultText[i]
        firstTextarea.value += char
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        Object.defineProperty(inputEvent, 'target', { value: firstTextarea, enumerable: true })
        firstTextarea.dispatchEvent(inputEvent)
      }
    }
    
    firstTextarea.dispatchEvent(new Event('blur', { bubbles: true }))
    firstTextarea.blur()
    
    return true
  }
  
  return false
}

function fillTableData(data: any[]) {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      success: false,
      error: '数据格式错误：需要数组格式的数据',
      filled: 0,
      total: 0,
      errors: []
    }
  }
  
  const rows = findTableRows()
  if (rows.length === 0) {
    return {
      success: false,
      error: '未找到表格行',
      filled: 0,
      total: data.length,
      errors: []
    }
  }
  
  const { stepDescIndex, expectedResultIndex } = findColumnIndices()
  
  let filledCount = 0
  const errors: string[] = []
  
  data.forEach((item, dataIndex) => {
    const rowIndex = dataIndex
    
    if (rowIndex >= rows.length) {
      errors.push(`数据项 ${dataIndex + 1}: 表格行数不足（只有${rows.length}行）`)
      return
    }
    
    const row = rows[rowIndex]
    const cells = row.querySelectorAll('td')
    
    if (cells.length <= Math.max(stepDescIndex, expectedResultIndex)) {
      errors.push(`数据项 ${dataIndex + 1}: 列数不足`)
      return
    }
    
    const stepDescCell = cells[stepDescIndex] as HTMLElement
    const stepDesc = item.步骤描述 || ''
    if (!fillStepDescription(stepDescCell, stepDesc)) {
      errors.push(`数据项 ${dataIndex + 1}: 步骤描述填充失败`)
    }
    
    const expectedResultCell = cells[expectedResultIndex] as HTMLElement
    const expectedResult = item.预期结果 || ''
    if (fillExpectedResult(expectedResultCell, expectedResult)) {
      filledCount++
    } else {
      errors.push(`数据项 ${dataIndex + 1}: 预期结果填充失败`)
    }
  })
  
  return {
    success: errors.length === 0,
    filled: filledCount,
    total: data.length,
    errors: errors
  }
}

// 挂载到 window 对象
;(window as any).tableUtils = {
  checkTableRows,
  getCurrentRowCount,
  addTableRows,
  findAddStepButton,
  extractTableData,
  fillTableData,
  cleanText,
  findTableRows,
  findColumnIndices
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkTableRows') {
    try {
      const result = checkTableRows()
      sendResponse({ success: true, data: result })
    } catch (error: any) {
      sendResponse({ success: false, error: error.message })
    }
    return true
  }
  
  if (request.action === 'addTableRows') {
    addTableRows(request.targetCount, request.options || {})
      .then(result => {
        sendResponse({ success: true, data: result })
      })
      .catch((error: any) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
  
  if (request.action === 'extractTableData') {
    try {
      const data = extractTableData()
      sendResponse({ success: true, data })
    } catch (error: any) {
      sendResponse({ success: false, error: error.message })
    }
    return true
  }
  
  if (request.action === 'fillTableData') {
    try {
      const result = fillTableData(request.data)
      sendResponse({ success: true, data: result })
    } catch (error: any) {
      sendResponse({ success: false, error: error.message })
    }
    return true
  }
  
  return false
})
