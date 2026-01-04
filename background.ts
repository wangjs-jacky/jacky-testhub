// 跟踪每个窗口的侧边栏连接状态
const sidePanelPorts = new Map<number, chrome.runtime.Port>()

// 配置侧边栏：点击扩展图标时打开侧边栏
chrome.runtime.onInstalled.addListener(() => {
  // 设置点击扩展图标时打开侧边栏
  chrome.sidePanel.setOptions({
    enabled: true
  })
})

// 监听侧边栏连接，用于检测侧边栏是否打开
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    // 侧边栏已打开，存储连接
    port.onMessage.addListener((msg) => {
      if (msg.type === "sidepanel-ready" && msg.windowId) {
        sidePanelPorts.set(msg.windowId, port)
      }
    })

    // 侧边栏关闭时，清除连接
    port.onDisconnect.addListener(() => {
      // 找到并清除对应的窗口状态
      for (const [windowId, p] of sidePanelPorts.entries()) {
        if (p === port) {
          sidePanelPorts.delete(windowId)
          break
        }
      }
    })
  }
})

// 监听来自侧边栏的禁用消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "disable-sidepanel") {
    // 临时禁用侧边栏来关闭它
    chrome.sidePanel.setOptions({ enabled: false })
    // 立即重新启用，以便下次可以打开
    setTimeout(() => {
      chrome.sidePanel.setOptions({ enabled: true })
      // 清除所有连接状态
      sidePanelPorts.clear()
    }, 100)
    sendResponse({ success: true })
  }
  return true
})

// 切换侧边栏状态
function toggleSidePanel(windowId: number) {
  const port = sidePanelPorts.get(windowId)
  
  if (port) {
    // 如果侧边栏已打开（有连接），尝试关闭它
    // 发送消息让侧边栏尝试关闭
    try {
      port.postMessage({ type: "close-sidepanel" })
      chrome.runtime.sendMessage({ type: "close-sidepanel" }).catch(() => {})
    } catch (error) {
      // 如果发送失败，清除状态
      sidePanelPorts.delete(windowId)
    }
    
    // 备用方案：临时禁用侧边栏来强制关闭它
    // 这会在侧边栏无法自己关闭时使用
    setTimeout(() => {
      // 如果连接仍然存在（说明侧边栏还没关闭），使用禁用方法
      if (sidePanelPorts.has(windowId)) {
        chrome.sidePanel.setOptions({ enabled: false })
        sidePanelPorts.delete(windowId)
        // 立即重新启用，以便下次可以打开
        setTimeout(() => {
          chrome.sidePanel.setOptions({ enabled: true })
        }, 50)
      }
    }, 200)
  } else {
    // 如果侧边栏未打开（没有连接），打开它
    chrome.sidePanel.setOptions({ enabled: true })
    chrome.sidePanel.open({ windowId })
  }
}

// 当点击扩展图标时，切换侧边栏
chrome.action.onClicked.addListener((tab) => {
  if (tab?.windowId) {
    toggleSidePanel(tab.windowId)
  }
})

// 处理快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidepanel") {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.windowId) {
        toggleSidePanel(tabs[0].windowId)
      }
    })
  }
})
