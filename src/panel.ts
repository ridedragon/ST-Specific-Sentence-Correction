<<<<<<< HEAD
import { createPinia } from 'pinia';
import { App, createApp } from 'vue';
import Panel from '@/Panel.vue';
import { initialize } from '@/core';
=======
import Panel from '@/Panel.vue';
import { App } from 'vue';
>>>>>>> 867f4bf5b91908933514b6a4e4239265b892691c

const app = createApp(Panel);

const pinia = createPinia();
app.use(pinia);

declare module 'vue' {
  interface ComponentCustomProperties {
    t: typeof t;
  }
}
const i18n = {
  install: (app: App) => {
    app.config.globalProperties.t = t;
  },
};
app.use(i18n);

<<<<<<< HEAD
/**
 * 等待 SillyTavern 核心UI加载完毕，确保所有上下文和API都可用。
 * @returns A promise that resolves when the UI is ready.
 */
function waitForTavern() {
  console.log('[AI Optimizer] Waiting for main Tavern UI from within iframe...');
  return new Promise<void>((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // 等待20秒
    const interval = setInterval(() => {
      // 插件面板在iframe中运行，必须访问父窗口的文档来查找主UI元素。
      if (window.parent.document.getElementById('send_form')) {
        clearInterval(interval);
        console.log('[AI Optimizer] Main Tavern UI is ready!');
        resolve();
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error('[AI Optimizer] Timeout waiting for main Tavern UI.');
          reject(new Error('Timeout waiting for #send_form in parent document'));
        }
      }
    }, 200);
  });
}

export function initPanel() {
  const $app = $('<div id="ai_text_optimizer">').appendTo('#extensions_settings2');
  app.mount($app[0]);

  // 延迟初始化，等待SillyTavern完全加载
  waitForTavern()
    .then(() => {
      console.log('[AI Optimizer] Calling initialize()...');
      // 初始化核心逻辑，注册事件等
      initialize();
    })
    .catch(error => {
      console.error('[AI Optimizer] Initialization failed:', error);
    });
=======
export function initPanel() {
  const $app = $('<div id="tavern_extension_example">').appendTo('#extensions_settings2');
  app.mount($app[0]);
>>>>>>> 867f4bf5b91908933514b6a4e4239265b892691c
}
