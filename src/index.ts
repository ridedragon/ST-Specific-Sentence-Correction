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
>>>>>>> 9d1ac249d9ef1f62f5e9e55814c49e1cec1acb60
  initPanel();
});
