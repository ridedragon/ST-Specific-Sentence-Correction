import '@/global.css';
import { initPanel } from '@/panel';
<<<<<<< HEAD
import { initialize, manualOptimize, optimizeText, replaceMessage } from '@/core';

// 将核心功能暴露到全局，以便其他脚本可以调用
// 使用一个唯一的命名空间来避免冲突
if (!(window as any).aiOptimizer) {
  (window as any).aiOptimizer = {};
}
Object.assign((window as any).aiOptimizer, {
  manualOptimize,
  optimizeText,
  replaceMessage,
});

$(() => {
  // 初始化核心功能，注册事件监听
  initialize();
  // 初始化UI面板
=======

$(() => {
>>>>>>> 65f9deffaa2f155930a99ad579f71756a2051565
  initPanel();
});
