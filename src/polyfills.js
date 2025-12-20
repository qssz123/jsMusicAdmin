// src/polyfills.js
import { Buffer } from 'buffer'

// 全局设置 Buffer
window.global = window
window.Buffer = Buffer
window.process = {
    env: {},
    version: '',
    nextTick: (cb) => setTimeout(cb, 0)
}

// 确保 globalThis 存在
if (typeof globalThis === 'undefined') {
    window.globalThis = window
}
