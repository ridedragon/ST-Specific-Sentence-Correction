<template>
<<<<<<< HEAD
  <div class="ai-optimizer-settings">
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>{{ t`AI 文本优化助手` }}</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <!-- 生成设置 -->
        <b>{{ t`生成设置` }}</b>
        <div class="block">
          <label>{{ t`Temperature` }} ({{ settings.temperature }})</label>
          <CustomSlider v-model="settings.temperature" :min="0" :max="2" :step="0.01" />
        </div>
        <div class="block">
          <label>{{ t`Max Tokens` }}</label>
          <input v-model.number="settings.max_tokens" class="text_pole" type="number" />
        </div>
        <div class="block">
          <label>{{ t`Top P` }} ({{ settings.top_p }})</label>
          <CustomSlider v-model="settings.top_p" :min="0" :max="1" :step="0.01" />
        </div>
        <div class="block">
          <label>{{ t`Top K` }}</label>
          <input v-model.number="settings.top_k" class="text_pole" type="number" />
        </div>

        <hr class="sysHR" />

        <!-- API 设置 -->
        <b>{{ t`API 设置` }}</b>
        <div class="block">
          <label>{{ t`API 提供商` }}</label>
          <select v-model="settings.apiProvider" class="text_pole">
            <option value="openai">OpenAI</option>
            <option value="openai_test">OpenAI (测试)</option>
            <option value="google">Google</option>
            <option value="sillytavern_backend">SillyTavern (后端)</option>
            <option value="sillytavern_preset">SillyTavern (预设)</option>
          </select>
        </div>
        <div class="block">
          <label>{{ t`API URL` }}</label>
          <input
            v-model="settings.apiUrl"
            class="text_pole"
            type="text"
            :placeholder="t`例如: https://api.openai.com/v1`"
          />
        </div>
        <div class="block">
          <label>{{ t`API 密钥` }}</label>
          <input v-model="settings.apiKey" class="text_pole" type="password" />
        </div>
        <div class="button-group">
          <button class="menu_button" @click="handleTestConnection">{{ t`测试连接` }}</button>
          <button class="menu_button" @click="fetchModels">{{ t`获取模型` }}</button>
          <span v-if="connectionStatus === 'success'" style="color: green">{{ t`连接成功！` }}</span>
          <span v-if="connectionStatus === 'error'" style="color: red">{{ t`连接失败。` }}</span>
        </div>
        <div class="block">
          <label>{{ t`模型名称` }}</label>
          <select v-model="settings.modelName" class="text_pole">
            <option v-if="settings.modelName && !modelList.includes(settings.modelName)" :value="settings.modelName">
              {{ settings.modelName }} (自定义)
            </option>
            <option v-for="model in modelList" :key="model" :value="model">
              {{ model }}
            </option>
          </select>
          <label class="checkbox_label">
            <input v-model="settings.autoFetchModels" type="checkbox" />
            {{ t`每次加载时自动获取` }}
          </label>
        </div>

        <hr class="sysHR" />

        <!-- 禁用词设置 -->
        <b>{{ t`禁用词与优化` }}</b>
        <div class="block">
          <label>{{ t`禁用词列表 (用英文逗号 , 分隔)` }}</label>
          <textarea v-model="settings.disabledWords" class="text_pole" rows="3"></textarea>
        </div>

        <hr class="sysHR" />

        <!-- 句式模板 -->
        <details open>
          <summary><b>{{ t`句式模板规则` }}</b></summary>
          <div class="block">
            <div v-for="(pattern, index) in settings.sentencePatterns" :key="pattern.id" class="pattern-rule">
              <label class="checkbox_label">
                <input v-model="pattern.enabled" type="checkbox" />
              </label>
              <select v-model="pattern.type" class="text_pole pattern-type">
                <option value="contains">{{ t`包含` }}</option>
                <option value="startsWith">{{ t`以...开头` }}</option>
                <option value="endsWith">{{ t`以...结尾` }}</option>
                <option value="patternAB">{{ t`A...B模式` }}</option>
              </select>
              <input v-model="pattern.valueA" class="text_pole pattern-value" :placeholder="t`关键词A`" />
              <input
                v-if="pattern.type === 'patternAB'"
                v-model="pattern.valueB"
                class="text_pole pattern-value"
                :placeholder="t`关键词B`"
              />
              <button class="menu_button" @click="removePattern(index)">{{ t`删除` }}</button>
            </div>
            <div class="button-group">
              <button class="menu_button" @click="addPattern">{{ t`添加新规则` }}</button>
            </div>
          </div>
        </details>

        <div class="block">
          <label>{{ t`正则表达式过滤器 (每行一个)` }}</label>
          <textarea v-model="settings.regexFilters" class="text_pole" rows="5"></textarea>
        </div>
        <div class="block">
          <label>{{ t`最后一条角色消息 (自动刷新)` }}</label>
          <textarea v-model="lastCharMessageContent" class="text_pole" rows="4" readonly></textarea>
        </div>
        <div class="button-group">
          <button class="menu_button" @click="handleFullAutoOptimize">{{ t`一键全自动优化` }}</button>
          <label class="checkbox_label">
            <input v-model="settings.autoOptimize" type="checkbox" />
            {{ t`自动优化` }}
          </label>
          <label class="checkbox_label">
            <input v-model="settings.disableNotifications" type="checkbox" />
            {{ t`关闭大部分通知` }}
          </label>
        </div>
        <div class="button-group">
          <button class="menu_button" @click="handleExtractSentences">{{ t`提取待修改句子` }}</button>
        </div>
        <div class="block">
          <label>{{ t`待优化内容` }}</label>
          <textarea v-model="optimizedContent" class="text_pole" rows="4"></textarea>
        </div>
        <div class="button-group">
          <button class="menu_button" @click="handleOptimize">{{ t`优化` }}</button>
          <button class="menu_button" @click="handleStopOptimize">{{ t`停止优化` }}</button>
        </div>
        <div class="block">
          <label>{{ t`优化后内容` }}</label>
          <textarea v-model="optimizedResult" class="text_pole" rows="4"></textarea>
        </div>
        <div class="button-group">
          <button class="menu_button" @click="handleReplaceMessage">{{ t`替换` }}</button>
        </div>
        <div class="block">
          <label>{{ t`修改后的消息内容 (测试)` }}</label>
          <textarea v-model="modifiedMessage" class="text_pole" rows="6"></textarea>
        </div>

        <hr class="sysHR" />

        <!-- 提示词编写器 -->
        <b>{{ t`提示词编写器` }}</b>
        <div class="block">
          <label>{{ t`选择编辑的提示词:` }}</label>
          <select v-model="activePrompt" class="text_pole">
            <option value="main">{{ t`主系统提示词 (通用)` }}</option>
            <option value="system">{{ t`拦截任务详细指令` }}</option>
            <option value="final_system">{{ t`最终注入指令` }}</option>
          </select>
          <textarea v-model="settings.promptSettings[activePrompt]" class="text_pole" rows="6"></textarea>
        </div>
=======
  <div class="example-extension-settings">
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>{{ t`插件示例` }}</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <div class="example-extension_block flex-container">
          <input class="menu_button" type="submit" :value="t`示例按钮`" @click="handle_button_click" />
        </div>

        <div class="example-extension_block flex-container">
          <input v-model="settings.button_selected" type="checkbox" />
          <label for="example_setting">{{ t`示例开关` }}</label>
        </div>

        <hr class="sysHR" />
>>>>>>> 57d75fd7d020da454d680ee27f6f8ee7a59f9e5a
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
<<<<<<< HEAD
// Cache-busting comment
import CustomSlider from '@/components/CustomSlider.vue';
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import {
  fetchModelsFromApi,
  testApiConnection,
  manualOptimize,
  optimizeText,
  replaceMessage,
  getLastCharMessage,
  checkMessageForDisabledWords,
  abortOptimization,
} from '@/core';
import { v4 as uuidv4 } from 'uuid';

const { settings } = storeToRefs(useSettingsStore());
const modelList = ref<string[]>([]);
const connectionStatus = ref<'unknown' | 'success' | 'error'>('unknown');
const activePrompt = ref<'main' | 'system' | 'final_system'>('main');
const optimizedContent = ref('');
const optimizedResult = ref('');
const modifiedMessage = ref('');
const lastCharMessageContent = ref('');
let messagePollingInterval: number | undefined;
let lastProcessedMessage = ref('');

// 监听最后一条角色消息的变化，以触发自动优化
watch(lastCharMessageContent, (newMessage, oldMessage) => {
  if (!settings.value.autoOptimize || !newMessage || newMessage === lastProcessedMessage.value) {
    return;
  }

  // 使用新的核心函数来检查禁用词（先清理后检查）
  if (checkMessageForDisabledWords(newMessage)) {
    console.log('[AI Optimizer] Detected disabled word in new message, triggering auto-optimization.');
    lastProcessedMessage.value = newMessage; // 标记为已处理
    handleFullAutoOptimize();
  }
});

const addPattern = () => {
  if (!Array.isArray(settings.value.sentencePatterns)) {
    settings.value.sentencePatterns = [];
  }
  settings.value.sentencePatterns.push({
    id: uuidv4(),
    type: 'contains',
    valueA: '',
    valueB: '',
    enabled: true,
  });
};

const removePattern = (index: number) => {
  settings.value.sentencePatterns.splice(index, 1);
};

const handleReplaceMessage = () => {
  if (!optimizedContent.value || !optimizedResult.value) {
    (toastr as any).warning('“待优化内容”和“优化后内容”都不能为空。');
    return;
  }
  replaceMessage(optimizedContent.value, optimizedResult.value, (newContent: string) => {
    modifiedMessage.value = newContent;
  });
};

const handleExtractSentences = () => {
  manualOptimize((content: string) => {
    optimizedContent.value = content;
    if (content) {
      (toastr as any).success('已提取待优化内容。');
    } else {
      (toastr as any).info('在最后一条角色消息中未找到包含禁用词的句子。');
    }
  });
};

const handleStopOptimize = () => {
  abortOptimization();
};

const handleOptimize = async () => {
  if (!optimizedContent.value) {
    (toastr as any).warning('待优化内容不能为空。');
    return;
  }
  (toastr as any).info('正在发送给AI进行优化...');
  try {
    const result = await optimizeText(
      optimizedContent.value,
      settings.value.promptSettings[activePrompt.value],
      lastCharMessageContent.value,
    );
    if (result !== null) {
      optimizedResult.value = result;
      (toastr as any).success('优化完成。');
    }
    // If result is null, it means the operation was aborted, and a toast is already shown in core.ts
  } catch (error) {
    console.error(error);
    (toastr as any).error('优化失败，请查看控制台日志。');
  }
};

const fetchModels = async () => {
  (toastr as any).info('正在获取模型列表...');
  try {
    const models = await fetchModelsFromApi();
    if (models.length > 0) {
      modelList.value = models;
      (toastr as any).success(`成功获取 ${models.length} 个模型。`);
    } else {
      // The error is already shown by toastr in core.ts, so no need for another warning here.
      (toastr as any).warning('未能获取到模型列表，请检查设置或控制台日志。');
    }
  } catch (error) {
    console.error(error);
    (toastr as any).error('获取模型时发生未知错误。');
  }
};

const handleManualOptimize = () => {
  manualOptimize((content: string) => {
    optimizedContent.value = content;
    if (!content) {
      // 在 core.ts 的 manualOptimize 中已经有提示，这里不再重复
      // (toastr as any).info('在最后一条角色消息中未找到包含禁用词的句子。');
    }
  });
};

/**
 * 新增：一键全自动优化流程
 */
const handleFullAutoOptimize = async () => {
  try {
    (toastr as any).info('自动化优化流程已启动...');

    // 步骤 1: 提取待优化内容
    const sourceContent: string = await new Promise(resolve => {
      manualOptimize((content: string) => {
        resolve(content);
      });
    });

    // 如果没有内容，则直接中止
    if (!sourceContent) {
      console.log('[Auto Optimizer] 未找到可优化的内容，流程中止。');
      (toastr as any).info('在最后一条角色消息中未找到包含禁用词的句子。');
      return;
    }
    optimizedContent.value = sourceContent; // 更新UI上的待优化文本框
    (toastr as any).success('句子提取成功，正在发送给AI优化...');

    // 步骤 2: 发送给AI进行优化
    const optimizedResultText = await optimizeText(
      sourceContent,
      settings.value.promptSettings[activePrompt.value],
      lastCharMessageContent.value,
    );

    // 如果用户取消了优化，则中止整个流程
    if (optimizedResultText === null) {
      console.log('[Auto Optimizer] 优化被用户取消，流程中止。');
      return;
    }

    if (!optimizedResultText) {
      throw new Error('AI 未能返回优化后的文本。');
    }
    optimizedResult.value = optimizedResultText; // 更新UI上的优化后文本框
    (toastr as any).success('AI优化完成，正在执行替换...');

    // 步骤 3: 执行替换
    await new Promise<void>(resolve => {
      replaceMessage(sourceContent, optimizedResultText, (newContent: string) => {
        modifiedMessage.value = newContent; // 更新UI上的测试文本框
        resolve();
      });
    });
    (toastr as any).success('替换完成！流程结束。', '成功', { timeOut: 5000 });
  } catch (error: any) {
    // AbortError should be caught in callAI, so we only handle other errors here.
    console.error('[Auto Optimizer] 流程执行出错:', error);
    (toastr as any).error(error.message, '自动化流程失败', { timeOut: 10000 });
  }
};

const handleTestConnection = async () => {
  connectionStatus.value = 'unknown';
  (toastr as any).info('正在测试连接...');
  try {
    const success = await testApiConnection();
    connectionStatus.value = success ? 'success' : 'error';
    if (success) {
      (toastr as any).success('API 连接成功！');
    } else {
      (toastr as any).error('API 连接失败，请检查设置和控制台日志。');
    }
  } catch (error) {
    connectionStatus.value = 'error';
    (toastr as any).error('API 连接测试时发生错误。');
    console.error(error);
  }
};

onMounted(() => {
  if (settings.value.autoFetchModels) {
    fetchModels();
  }

  // 立即获取一次，然后设置定时器
  lastCharMessageContent.value = getLastCharMessage();
  console.log('[AI Optimizer] Initial lastCharMessage:', lastCharMessageContent.value);

  messagePollingInterval = window.setInterval(() => {
    const newMessage = getLastCharMessage();
    if (newMessage !== lastCharMessageContent.value) {
      lastCharMessageContent.value = newMessage;
      console.log('[AI Optimizer] lastCharMessage updated.');
    }
  }, 3000);
});

onUnmounted(() => {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
});
</script>

<style scoped>
.block {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 10px 0;
}
.flex-container {
  display: flex;
  gap: 10px;
  align-items: center;
}
.flex-container > select {
  flex-grow: 1;
}
.button-group {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  margin: 10px 0;
}
.menu_button {
  white-space: nowrap;
}
.pattern-rule {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.pattern-type {
  flex-basis: 120px;
  flex-shrink: 0;
}
.pattern-value {
  flex-grow: 1;
}
</style>
=======
import { useSettingsStore } from '@/store/settings';
import { storeToRefs } from 'pinia';

const { settings } = storeToRefs(useSettingsStore());

const handle_button_click = () => {
  toastr.success('你好呀!');
};
</script>

<style scoped></style>
>>>>>>> 57d75fd7d020da454d680ee27f6f8ee7a59f9e5a
