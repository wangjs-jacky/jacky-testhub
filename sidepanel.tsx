import { useState, useEffect } from "react"
import "./popup.css"

function IndexSidepanel() {
  // 建立与 background 的连接，用于检测侧边栏状态和接收关闭消息
  useEffect(() => {
    // 获取当前窗口 ID
    chrome.windows.getCurrent((window) => {
      if (window?.id) {
        // 建立连接
        const port = chrome.runtime.connect({ name: "sidepanel" })
        // 通知 background 侧边栏已准备好
        port.postMessage({ type: "sidepanel-ready", windowId: window.id })
        
        // 监听来自 background 的关闭消息
        const messageListener = (message: any) => {
          if (message.type === "close-sidepanel") {
            // 尝试关闭侧边栏
            // 注意：Chrome 侧边栏可能不支持 window.close()，但我们可以尝试
            try {
              // 方法1: 尝试使用 window.close()
              window.close()
            } catch (e) {
              // 方法2: 如果 window.close() 不起作用，尝试通过禁用侧边栏来关闭
              // 这需要 background 脚本配合
              chrome.runtime.sendMessage({ type: "disable-sidepanel" }).catch(() => {})
            }
          }
        }
        
        port.onMessage.addListener(messageListener)
        
        // 也监听 runtime 消息（作为备用）
        const runtimeListener = (message: any, sender: any, sendResponse: any) => {
          if (message.type === "close-sidepanel") {
            try {
              window.close()
            } catch (e) {
              chrome.runtime.sendMessage({ type: "disable-sidepanel" }).catch(() => {})
            }
          }
        }
        chrome.runtime.onMessage.addListener(runtimeListener)
        
        return () => {
          port.onMessage.removeListener(messageListener)
          chrome.runtime.onMessage.removeListener(messageListener)
          port.disconnect()
        }
      }
    })
  }, [])
  const [extractedText, setExtractedText] = useState("")
  const [editableText, setEditableText] = useState("")
  const [status, setStatus] = useState("准备就绪")
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info")

  // 发送消息到 content script
  const sendMessage = async (action: string, data?: any) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) {
        setStatus("无法获取当前标签页")
        setStatusType("error")
        return null
      }

      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id!, { action, ...data }, (response) => {
          if (chrome.runtime.lastError) {
            setStatus(`错误: ${chrome.runtime.lastError.message}`)
            setStatusType("error")
            resolve(null)
            return
          }
          resolve(response)
        })
      })
    } catch (error: any) {
      setStatus(`错误: ${error.message}`)
      setStatusType("error")
      return null
    }
  }

  // 检查表格行数
  const handleCheckRows = async () => {
    setStatus("正在检查表格行数...")
    setStatusType("info")
    
    const response: any = await sendMessage("checkTableRows")
    if (response && response.success) {
      const { totalRows, contentRows, emptyRows } = response.data
      setStatus(`总行数: ${totalRows} | 有内容: ${contentRows} | 空行: ${emptyRows}`)
      setStatusType("success")
    }
  }

  // 添加表格行
  const handleAddRows = async () => {
    const targetCount = prompt("请输入目标行数:", "13")
    if (!targetCount) return

    const count = parseInt(targetCount)
    if (isNaN(count) || count < 1) {
      setStatus("请输入有效的行数")
      setStatusType("error")
      return
    }

    setStatus(`正在添加行到 ${count} 行...`)
    setStatusType("info")

    const response: any = await sendMessage("addTableRows", { targetCount: count })
    if (response && response.success) {
      setStatus(`添加完成！当前行数: ${response.data.currentCount}`)
      setStatusType("success")
    } else {
      setStatus(response?.error || "添加失败")
      setStatusType("error")
    }
  }

  // 提取表格数据
  const handleExtract = async () => {
    setStatus("正在提取表格数据...")
    setStatusType("info")

    const response: any = await sendMessage("extractTableData")
    if (response && response.success) {
      const jsonData = JSON.stringify(response.data, null, 2)
      setExtractedText(jsonData)
      setEditableText(jsonData)
      setStatus(`成功提取 ${response.data.length} 条数据`)
      setStatusType("success")
    } else {
      setStatus(response?.error || "提取失败")
      setStatusType("error")
    }
  }

  // 填充表格数据
  const handleFill = async () => {
    if (!editableText.trim()) {
      setStatus("请先提取数据或输入JSON数据")
      setStatusType("error")
      return
    }

    let data
    try {
      data = JSON.parse(editableText)
      if (!Array.isArray(data)) {
        throw new Error("数据必须是数组格式")
      }
    } catch (error: any) {
      setStatus(`JSON格式错误: ${error.message}`)
      setStatusType("error")
      return
    }

    setStatus("正在填充表格数据...")
    setStatusType("info")

    const response: any = await sendMessage("fillTableData", { data })
    if (response && response.success) {
      setStatus(`成功填充 ${response.data.filled} 条数据`)
      setStatusType("success")
    } else {
      setStatus(response?.error || "填充失败")
      setStatusType("error")
    }
  }

  return (
    <div className="popup-container" style={{ padding: "20px", minHeight: "100vh" }}>
      <div className="header">
        <h1>📋 表格工具集</h1>
        <p>快速操作测试用例表格</p>
      </div>

      <div className={`status status-${statusType}`}>
        {status}
      </div>

      <div className="button-group">
        <button className="btn btn-primary" onClick={handleCheckRows}>
          🔍 检查行数
        </button>
        <button className="btn btn-primary" onClick={handleAddRows}>
          ➕ 添加行
        </button>
        <button className="btn btn-success" onClick={handleExtract}>
          📥 提取数据
        </button>
        <button className="btn btn-warning" onClick={handleFill}>
          📤 填充数据
        </button>
      </div>

      {extractedText && (
        <div className="data-section">
          <div className="section-header">
            <span>提取的数据 (可编辑)</span>
            <button 
              className="btn-small"
              onClick={() => {
                setExtractedText("")
                setEditableText("")
              }}
            >
              清空
            </button>
          </div>
          <textarea
            className="data-textarea"
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            placeholder="提取的数据将显示在这里，可以编辑后点击填充按钮"
            style={{ minHeight: "400px" }}
          />
        </div>
      )}
    </div>
  )
}

export default IndexSidepanel
