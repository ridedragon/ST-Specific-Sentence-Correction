import '@/global.css';
import { initPanel } from '@/panel';
<<<<<<< HEAD
import { abortOptimization, initialize, manualOptimize, optimizeText, replaceMessage } from '@/core';

// 将核心功能暴露到全局，以便其他脚本可以调用
// 使用一个唯一的命名空间来避免冲突
if (!(window as any).aiOptimizer) {
  (window as any).aiOptimizer = {};
}
Object.assign((window as any).aiOptimizer, {
  manualOptimize,
  optimizeText,
  replaceMessage,
  abortOptimization,
});

$(() => {
  // 初始化核心功能，注册事件监听
  initialize();
  // 初始化UI面板
=======

$(() => {
>>>>>>> f7ea114b0f46b0ec8c59ccc32ca8a5e1784139d9
  initPanel();
});
