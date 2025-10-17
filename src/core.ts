import { extension_settings, getContext } from '@sillytavern/scripts/extensions';
import { Settings, setting_field } from './type/settings';

// 类型安全的设置获取辅助函数
function getPluginSettings(): Settings {
  return ((extension_settings as any)[setting_field] as Settings) ?? {};
}

// 通知辅助函数
function showToast(type: 'success' | 'info' | 'warning' | 'error', message: string, title?: string, options?: any) {
  const settings = getPluginSettings();
  const allowedMessages = [
    '自动优化中。',
    '优化成功🎉。',
    '优化失败😭。',
    '在最后一条角色消息中未找到包含禁用词的句子。',
  ];

  if (settings.disableNotifications && !allowedMessages.includes(message)) {
    return;
  }

  (toastr as any)[type](message, title, options);
}

/**
 * 插件的核心初始化函数。
 * 在这里注册事件监听和设置UI。
 */
export function initialize() {
  // 防止重复初始化
  if ((window as any).isAiOptimizerInitialized) {
    console.log('[AI Optimizer] Already initialized. Skipping.');
    return;
  }
  console.log('[AI Optimizer] Core initialization started.');

  const context = getContext();
  if (!context) {
    console.error('[AI Optimizer] Failed to get context. Initialization aborted.');
    showToast('error', 'AI 文本优化助手: 获取上下文失败，插件无法启动。');
    return;
  }
  console.log('[AI Optimizer] Context obtained successfully.');

  if (!context.eventSource || typeof context.eventSource.on !== 'function') {
    console.error('[AI Optimizer] eventSource is not available on context. Initialization aborted.');
    showToast('error', 'AI 文本优化助手: 事件系统不可用，插件无法启动。');
    return;
  }
  console.log('[AI Optimizer] eventSource is available.');

  // 监听角色消息渲染完成事件，这个事件在消息完全显示后触发，更可靠
  context.eventSource.on(context.eventTypes.CHARACTER_MESSAGE_RENDERED, onGenerationEnded);
  console.log('[AI Optimizer] "CHARACTER_MESSAGE_RENDERED" event listener registered.');

  showToast('success', 'AI 文本优化助手已成功加载！');
  (window as any).isAiOptimizerInitialized = true;
}

/**
 * 当AI生成结束时触发的回调函数。
 * @param messageId 生成的消息的ID。
 */
async function onGenerationEnded(messageId: number) {
  const settings = getPluginSettings();

  // 检查插件是否已启用
  if (!settings.autoOptimize) {
    return;
  }

  console.log(`Generation ended for message ${messageId}. Checking for disabled words.`);

  // 获取最新消息
  const messages = (window as any).TavernHelper.getChatMessages(messageId);
  if (!messages || messages.length === 0) {
    return;
  }
  const latestMessage = messages[0];
  const messageText = latestMessage.message;

  // 步骤 1: 先对整个消息进行清理
  const cleanedMessage = cleanTextWithRegex(messageText);

  // 检查禁用词
  const disabledWords = (settings.disabledWords || '')
    .split(',')
    .map((w: string) => w.trim())
    .filter(Boolean);
  if (disabledWords.length === 0) {
    return;
  }

  // 步骤 2: 在清理后的文本中查找禁用词
  const hasDisabledWord = checkMessageForDisabledWords(messageText);

  if (hasDisabledWord) {
    console.log(`[AI Optimizer] Found disabled words in cleaned message.`);

    // 自动优化流程
    try {
      showToast('info', '检测到禁用词或句式，自动优化流程已启动...');
      // 注意：这里我们从清理后的消息中提取句子
      const sentences = extractSentencesWithRules(cleanedMessage, settings);
      if (sentences.length === 0) {
        showToast('info', '在消息中未找到包含禁用词的完整句子。');
        return;
      }

      // 此时句子已经是干净的，直接编号即可
      const sourceContent = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n');

      showToast('success', '句子提取成功，正在发送给AI优化...');
      const optimizedResultText = await getOptimizedText(sourceContent, latestMessage.message);
      if (optimizedResultText === null) {
        // Optimization was aborted or failed, message already shown.
        return;
      }
      if (!optimizedResultText) {
        throw new Error('AI 未能返回优化后的文本。');
      }

      showToast('success', 'AI优化完成，正在执行替换...');
      await replaceMessageInternal(latestMessage, sourceContent, optimizedResultText);
      showToast('success', '自动优化完成！', '成功', { timeOut: 5000 });
    } catch (error: any) {
      console.error('[Auto Optimizer] 流程执行出错:', error);
      showToast('error', error.message, '自动化流程失败', { timeOut: 10000 });
    }
  }
}

/**
 * 检查消息中是否包含禁用词或匹配句式模板（先清理后检查）。
 * @param messageText 要检查的消息文本。
 * @returns 如果找到则返回 true，否则返回 false。
 */
export function checkMessageForDisabledWords(messageText: string): boolean {
  const settings = getPluginSettings();
  const cleanedMessage = cleanTextWithRegex(messageText);

  // 检查禁用词
  const disabledWords = (settings.disabledWords || '')
    .split(',')
    .map((w: string) => w.trim())
    .filter(Boolean);
  if (
    disabledWords.some(word => {
      const escapedWord = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(escapedWord, 'i').test(cleanedMessage);
    })
  ) {
    return true;
  }

  // 检查句式模板
  const patterns = settings.sentencePatterns || [];
  if (
    patterns.some(pattern => {
      if (!pattern.enabled || !pattern.valueA) return false;
      try {
        const regex = buildRegexFromPattern(pattern);
        return regex.test(cleanedMessage);
      } catch (e) {
        console.error(`[AI Optimizer] Invalid pattern`, pattern, e);
        return false;
      }
    })
  ) {
    return true;
  }

  return false;
}

/**
 * 高亮指定消息中的禁用词。
 * @param messageId 要高亮的消息ID。
 * @param words 要高亮的单词数组。
 */
function highlightDisabledWords(messageId: number, words: string[]) {
  const messageElement = (window as any).TavernHelper.retrieveDisplayedMessage(messageId);
  if (!messageElement || messageElement.length === 0) {
    return;
  }

  let currentHtml = messageElement.html();

  // 为每个禁用词创建一个不区分大小写的全局正则表达式
  words.forEach(word => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi');
    currentHtml = currentHtml.replace(regex, '<span class="ai-optimizer-highlight">$1</span>');
  });

  messageElement.html(currentHtml);
}

/**
 * 显示优化弹窗，并处理优化和替换逻辑。
 * @param originalMessage 原始的AI消息对象。
 * @param foundWords 检测到的禁用词数组。
 * @param isManual 是否为手动触发。
 */
async function showOptimizationPopup(originalMessage: any, foundWords: string[], isManual: boolean) {
  const context = getContext();
  const settings = getPluginSettings();

  const sentencesToOptimize = isManual
    ? [originalMessage.message]
    : extractSentencesWithRules(originalMessage.message, settings);

  if (sentencesToOptimize.length === 0) {
    // (toastr as any).info('在消息中未找到包含禁用词的句子。');
    return;
  }

  const initialText = sentencesToOptimize.join('\n');

  const popupId = 'ai-optimizer-manual-popup';
  const popupTitle = '编辑优化内容';
  const popupContent = `
    <div id="${popupId}">
      <p>以下是提取出的待优化内容（可编辑）：</p>
      <textarea id="optimizer-input" class="text_pole" rows="8" style="width: 100%;">${initialText}</textarea>
    </div>
  `;

  console.log('[AI Optimizer] Showing optimization popup...');
  const result = await (context as any).callGenericPopup(popupContent, popupTitle, '', {
    wide: true,
    okButton: '发送给 AI',
    cancelButton: '取消',
  });

  if (result) {
    const textToSend = ($(`#${popupId} #optimizer-input`) as any).val();
    console.log('--- Sending to AI for Optimization ---');
    console.log('System Prompt:', getSystemPrompt());
    console.log('User Content:', textToSend);
    console.log('------------------------------------');

    showToast('info', '正在发送给 AI 进行优化...');
    const optimizedText = await getOptimizedText(textToSend);

    if (optimizedText) {
      await showReplacementPopup(originalMessage, sentencesToOptimize, optimizedText, isManual);
    } else {
      showToast('error', 'AI 未能返回优化后的文本。');
    }
  }
}

async function showReplacementPopup(
  originalMessage: any,
  originalSentences: string[],
  optimizedText: string,
  isManual: boolean,
) {
  const context = getContext();
  const popupId = 'ai-optimizer-replacement-popup';
  const popupTitle = '预览并替换';
  const popupContent = `
    <div id="${popupId}">
      <p>AI 返回的优化内容：</p>
      <textarea id="optimizer-output" class="text_pole" rows="8" readonly>${optimizedText}</textarea>
    </div>
  `;

  console.log('[AI Optimizer] Showing replacement popup...');
  const confirmReplace = await (context as any).callGenericPopup(popupContent, popupTitle, '', {
    wide: true,
    okButton: '替换',
    cancelButton: '取消',
  });

  if (confirmReplace) {
    let newFullMessage = originalMessage.message;

    if (isManual) {
      newFullMessage = optimizedText;
    } else {
      originalSentences.forEach((sentence, index) => {
        if (index === 0) {
          newFullMessage = newFullMessage.replace(sentence, optimizedText);
        } else {
          newFullMessage = newFullMessage.replace(sentence, '');
        }
      });
    }

    // 将 \n 替换为 <br> 以便在聊天中正确显示换行
    const formattedMessage = newFullMessage.trim().replace(/\r?\n/g, '<br>');

    await (window as any).TavernHelper.setChatMessages([
      {
        message_id: originalMessage.message_id,
        message: formattedMessage,
      },
    ]);
    showToast('success', '消息已成功替换！');
  }
}

let currentRequestController: AbortController | null = null;

export function abortOptimization() {
  if (currentRequestController) {
    currentRequestController.abort();
    currentRequestController = null;
    console.log('[AI Optimizer] API request aborted.');
    showToast('info', '优化请求已取消。');
  }
}

async function callOpenAICompatible(messages: any[], options: any): Promise<string | null> {
  const baseUrl = options.apiUrl.replace(/\/$/, '').replace(/\/v1$/, '');
  const apiUrl = `${baseUrl}/v1/chat/completions`;
  currentRequestController = new AbortController();
  const signal = currentRequestController.signal;
  const response = await fetch(apiUrl, {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.modelName,
      messages: messages,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      top_p: options.top_p,
      top_k: options.top_k,
      stream: false,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI-compatible API request failed: ${response.status} - ${errorText}`);
  }
  const responseData = await response.json();
  return responseData?.choices?.[0]?.message?.content ?? null;
}

async function callOpenAITest(messages: any[], options: any): Promise<string | null> {
  currentRequestController = new AbortController();
  const signal = currentRequestController.signal;
  const response = await fetch('/api/backends/chat-completions/generate', {
    method: 'POST',
    headers: getRequestHeaders(),
    signal,
    body: JSON.stringify({
      chat_completion_source: 'openai',
      model: options.modelName,
      messages: messages,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      top_p: options.top_p,
      top_k: options.top_k,
      reverse_proxy: options.apiUrl,
      proxy_password: options.apiKey,
      stream: false,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI (Test) API request failed: ${response.status} - ${errorText}`);
  }
  const responseData = await response.json();
  return responseData?.choices?.[0]?.message?.content ?? null;
}

// Note: Google adapter functions (convertToGoogleRequest, parseGoogleResponse) would need to be implemented.
// For now, we'll assume a simplified direct call.
async function callGoogleDirect(messages: any[], options: any): Promise<string | null> {
  const GOOGLE_API_BASE_URL = 'https://generativelanguage.googleapis.com';
  const apiVersion = options.modelName.includes('gemini-1.5') ? 'v1beta' : 'v1';
  const finalApiUrl = `${GOOGLE_API_BASE_URL}/${apiVersion}/models/${options.modelName}:generateContent?key=${options.apiKey}`;

  // Simplified request conversion
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  currentRequestController = new AbortController();
  const signal = currentRequestController.signal;
  const response = await fetch(finalApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.max_tokens,
        topP: options.top_p,
        topK: options.top_k,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API request failed: ${response.status} - ${errorText}`);
  }
  const responseData = await response.json();
  return responseData?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callSillyTavernBackend(messages: any[], options: any): Promise<string | null> {
  currentRequestController = new AbortController();
  const signal = currentRequestController.signal;
  const response = await fetch('/api/backends/chat-completions/generate', {
    method: 'POST',
    headers: getRequestHeaders(),
    signal,
    body: JSON.stringify({
      chat_completion_source: 'custom',
      custom_url: options.apiUrl,
      api_key: options.apiKey,
      model: options.modelName,
      messages: messages,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      top_p: options.top_p,
      top_k: options.top_k,
      stream: false,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SillyTavern Backend API request failed: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  return result?.choices?.[0]?.message?.content ?? null;
}

async function callSillyTavernPreset(messages: any[], options: any): Promise<string | null> {
  const context = getContext() as any;
  if (!context.ConnectionManagerRequestService) {
    throw new Error('ConnectionManagerRequestService is not available.');
  }
  // This requires finding the profile ID from settings, which is not implemented yet.
  // For now, we'll throw an error.
  throw new Error('SillyTavern Preset provider is not fully implemented yet.');
  // Example of how it could work:
  // const result = await context.ConnectionManagerRequestService.sendRequest(profileId, messages, options.maxTokens);
  // return result?.choices?.[0]?.message?.content ?? null;
}

async function callAI(messages: any[], options: any = {}): Promise<string | null> {
  const settings = getPluginSettings();
  const finalOptions = {
    ...settings,
    ...options,
  };

  if (finalOptions.apiProvider !== 'sillytavern_preset' && (!finalOptions.apiUrl || !finalOptions.modelName)) {
    showToast('error', 'API URL或模型未配置，无法调用AI。');
    return null;
  }

  try {
    switch (finalOptions.apiProvider) {
      case 'openai':
        return await callOpenAICompatible(messages, finalOptions);
      case 'openai_test':
        return await callOpenAITest(messages, finalOptions);
      case 'google':
        return await callGoogleDirect(messages, finalOptions);
      case 'sillytavern_backend':
        return await callSillyTavernBackend(messages, finalOptions);
      case 'sillytavern_preset':
        return await callSillyTavernPreset(messages, finalOptions);
      default:
        throw new Error(`Unsupported API provider: ${finalOptions.apiProvider}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // The abortOptimization function already shows an info toast.
      console.log('API call was aborted by the user.');
      return null;
    }
    console.error(`API call failed:`, error);
    showToast('error', `API调用失败: ${error.message}`);
    return null;
  }
}

function getSystemPrompt(): string {
  const settings = getPluginSettings();
  const disabledWords = (settings.disabledWords || '')
    .split(',')
    .map((w: string) => w.trim())
    .filter(Boolean);
  // Safeguard against missing promptSettings
  const { main, system, final_system } = settings.promptSettings || {};

  return [main, system, `必须避免使用这些词：[${disabledWords.join(', ')}]`, final_system].filter(Boolean).join('\n');
}

async function getOptimizedText(textToOptimize: string, lastCharMessageText?: string): Promise<string | null> {
  let processedPrompt = getSystemPrompt();
  let userContent = `待优化句子：\n${textToOptimize}`;

  // Unified logic for handling context, now used by both auto and manual optimization
  if (lastCharMessageText && processedPrompt.includes('{{charpuremessage}}')) {
    const contextText = cleanTextWithRegex(lastCharMessageText);
    processedPrompt = processedPrompt.replace(/\{\{charpuremessage\}\}/g, contextText);
    // Correctly count items by finding lines that start with a number and a dot. This handles multi-line items correctly.
    const itemCount = textToOptimize.split('\n').filter(line => /^\d+[.)]\s/.test(line)).length;
    userContent = `【绝对规则】:
1.  **【数量必须完全一致】**: 用户提供了 ${itemCount} 个待优化的项目，你的回复【必须】不多不少，正好是 ${itemCount} 个优化后的项目。
2.  **格式必须严格遵守**: 你的回复【只能】包含带编号的项目列表，每个项目占一行。
3.  **内容必须纯净**: 【严禁】在回复中包含任何除了编号和项目之外的额外内容，例如“好的”、“优化如下”、“解释”、“注释”或任何Markdown格式。
4.  **一一对应**: 每个优化后的项目都必须与原始的编号项一一对应。不要合并或拆分项目。

【待修改优化项目】 (共 ${itemCount} 项):
${textToOptimize}

请严格按照上述规则，对【待修改优化项目】中的每一项进行修改优化以去除禁用词和禁用句，并仅返回纯净的、编号数量完全一致的结果。`;
  }

  const messages = [
    { role: 'system', content: processedPrompt },
    { role: 'user', content: userContent },
  ];

  console.log('--- Sending to AI for Optimization ---');
  console.log('Prompt:', processedPrompt);
  console.log('User Content:', userContent);
  console.log('Original sentences to optimize:', textToOptimize);
  console.log('------------------------------------');

  const result = await callAI(messages);

  console.log('处理完成');

  return result;
}

function escapeRegex(string: string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function buildRegexFromPattern(pattern: Settings['sentencePatterns'][number]): RegExp {
  const { type, valueA, valueB } = pattern;
  const escapedA = escapeRegex(valueA);

  switch (type) {
    case 'contains':
      return new RegExp(escapedA, 'i');
    case 'startsWith':
      return new RegExp(`^${escapedA}`, 'i');
    case 'endsWith':
      return new RegExp(`${escapedA}$`, 'i');
    case 'patternAB': {
      const escapedB = valueB ? escapeRegex(valueB) : '';
      return new RegExp(`${escapedA}.*?${escapedB}`, 'i');
    }
    default:
      throw new Error(`Unknown pattern type: ${type}`);
  }
}

/**
 * 从文本中提取包含禁用词或匹配句式模板的句子。
 * 如果找到的句子少于10个字符，则会自动包含其前后句子。
 * @param text 全文。
 * @param settings 插件设置。
 */
function extractSentencesWithRules(text: string, settings: Settings): string[] {
  const plainText = text.replace(/<[^>]*>/g, '');
  // 1. Split by sentence-ending punctuation (including optional closing quotes), keeping the delimiters.
  const parts = plainText.split(/([.!?。！？]+(?:["”’】\]]?))/g);
  const sentences_temp: string[] = [];
  if (parts.length > 1) {
    for (let i = 0; i < parts.length; i += 2) {
      const sentencePart = parts[i] || '';
      const delimiter = parts[i + 1] || '';
      sentences_temp.push(sentencePart + delimiter);
    }
  } else if (plainText.trim().length > 0) {
    sentences_temp.push(plainText);
  }

  // 2. Filter out parts that don't contain any letters or numbers.
  const hasContentRegex = /[\p{L}\p{N}]/u;
  const sentences = sentences_temp.filter(s => hasContentRegex.test(s));

  // If, after filtering, we have nothing, but the original text was not empty,
  // it means the text might be a single block without standard punctuation.
  if (sentences.length === 0 && plainText.trim().length > 0) {
    return [plainText.trim()];
  }

  // 2. 准备匹配规则
  const disabledWords = (settings.disabledWords || '')
    .split(',')
    .map((w: string) => w.trim())
    .filter(Boolean);
  const disabledWordRegex = disabledWords.length > 0 ? new RegExp(disabledWords.map(escapeRegex).join('|'), 'i') : null;

  const patterns = (settings.sentencePatterns || []).filter(p => p.enabled && p.valueA);
  const patternRegexes = patterns
    .map(p => {
      try {
        return buildRegexFromPattern(p);
      } catch (e) {
        console.error(`[AI Optimizer] Invalid pattern`, p, e);
        return null;
      }
    })
    .filter((p): p is RegExp => p !== null);

  // 4. 查找所有匹配规则的句子索引
  const matchingIndices = new Set<number>();
  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim();
    if (disabledWordRegex && disabledWordRegex.test(trimmedSentence)) {
      matchingIndices.add(index);
    }
    for (const regex of patternRegexes) {
      if (regex.test(trimmedSentence)) {
        matchingIndices.add(index);
        break;
      }
    }
  });

  if (matchingIndices.size === 0) {
    return [];
  }

  // 5. 为短句子扩展上下文
  const finalIndices = new Set<number>();
  const expansionTriggered = new Set<number>(); // Track original short sentences
  matchingIndices.forEach(index => {
    finalIndices.add(index);
    // 仅在检查长度时移除引号和空格
    const lengthCheckSentence = (sentences[index] || '').trim().replace(/["'“‘”’]/g, '');
    if (lengthCheckSentence.length < 10) {
      expansionTriggered.add(index); // Mark this as a short sentence trigger
      if (index > 0) {
        finalIndices.add(index - 1);
      }
      if (index < sentences.length - 1) {
        finalIndices.add(index + 1);
      }
    }
  });

  // 6. 将连续的句子索引分组
  const sortedIndices = Array.from(finalIndices).sort((a, b) => a - b);
  if (sortedIndices.length === 0) {
    return [];
  }
  const groups: number[][] = [];
  let currentGroup: number[] = [sortedIndices[0]];
  for (let i = 1; i < sortedIndices.length; i++) {
    if (sortedIndices[i] === sortedIndices[i - 1] + 1) {
      currentGroup.push(sortedIndices[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sortedIndices[i]];
    }
  }
  groups.push(currentGroup);

  // 7. 合并并处理最终的句子，保留顺序
  const finalSentences: string[] = [];
  const processedIndices = new Set<number>();
  groups.forEach(group => {
    if (group.some(index => processedIndices.has(index))) {
      return;
    }
    // Join the original sentence parts and then trim the final block.
    const combinedSentence = group.map(index => sentences[index]).join('');
    let sentenceToClean = combinedSentence.trim();

    if (sentenceToClean) {
      // Always remove leading junk characters from concatenation.
      sentenceToClean = sentenceToClean.replace(/^[\s】\]*,]*/, '');

      // Check if this group was formed due to a short-sentence expansion.
      const shouldStripBrackets = group.some(index => expansionTriggered.has(index));

      if (shouldStripBrackets) {
        // Iteratively remove surrounding brackets.
        const bracketPairs = [
          { open: '【', close: '】' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '（', close: '）' },
          { open: '{', close: '}' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
          { open: '“', close: '”' },
          { open: '‘', close: '’' },
        ];

        let wasModified = true;
        while (wasModified && sentenceToClean.length > 1) {
          wasModified = false;
          for (const pair of bracketPairs) {
            if (sentenceToClean.startsWith(pair.open) && sentenceToClean.endsWith(pair.close)) {
              sentenceToClean = sentenceToClean
                .substring(pair.open.length, sentenceToClean.length - pair.close.length)
                .trim();
              wasModified = true;
              // Break and restart the loop to handle nested brackets.
              break;
            }
          }
        }
      }

      // Final cleanup of any newly exposed leading junk.
      const finalCleanedSentence = sentenceToClean.replace(/^[\s】\]*,]*/, '');

      if (finalCleanedSentence) {
        finalSentences.push(finalCleanedSentence);
        group.forEach(index => processedIndices.add(index));
      }
    }
  });

  return finalSentences;
}

// Helper to get request headers for SillyTavern API
const getRequestHeaders = () => {
  const context = getContext() as any;
  return {
    'X-CSRF-Token': context.token,
    'Content-Type': 'application/json',
  };
};

async function fetchOpenAICompatibleModels(apiUrl: string, apiKey: string): Promise<string[]> {
  if (!apiUrl || !apiKey) {
    throw new Error('OpenAI兼容模式需要API URL和API Key');
  }
  const baseUrl = apiUrl.replace(/\/$/, '').replace(/\/v1$/, '');
  const modelsUrl = `${baseUrl}/v1/models`;
  const response = await fetch(modelsUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  const data = await response.json();
  const models = data.data || data.models || [];
  return models
    .map((m: any) => m.id || m.model)
    .filter(Boolean)
    .sort();
}

async function fetchOpenAITestModels(apiUrl: string, apiKey: string): Promise<string[]> {
  const response = await fetch('/api/backends/chat-completions/status', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      reverse_proxy: apiUrl,
      proxy_password: apiKey,
      chat_completion_source: 'openai',
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  const rawData = await response.json();
  const models = Array.isArray(rawData) ? rawData : rawData.data || rawData.models || [];
  if (!Array.isArray(models)) {
    throw new Error('API未返回有效的模型列表数组');
  }
  return models
    .map((m: any) => (m.name ? m.name.replace('models/', '') : m.id || m.model || m))
    .filter(Boolean)
    .sort();
}

async function fetchGoogleDirectModels(apiKey: string): Promise<string[]> {
  if (!apiKey) {
    throw new Error('Google直连模式需要API Key');
  }
  const GOOGLE_API_BASE_URL = 'https://generativelanguage.googleapis.com';
  const fetchGoogleModels = async (version: string) => {
    const url = `${GOOGLE_API_BASE_URL}/${version}/models?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    if (!json.models || !Array.isArray(json.models)) return [];
    return json.models
      .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model: any) => model.name.replace('models/', ''));
  };
  const [v1Models, v1betaModels] = await Promise.all([fetchGoogleModels('v1'), fetchGoogleModels('v1beta')]);
  return [...new Set([...v1Models, ...v1betaModels])].sort();
}

async function fetchSillyTavernBackendModels(apiUrl: string, apiKey: string): Promise<string[]> {
  if (!apiUrl) {
    throw new Error('SillyTavern后端模式需要API URL');
  }
  const response = await fetch('/api/backends/chat-completions/status', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({
      chat_completion_source: 'custom',
      custom_url: apiUrl,
      api_key: apiKey,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  const result = await response.json();
  const models = result.data || [];
  if (result.error || !Array.isArray(models)) {
    const errorMessage = result.error?.message || 'API未返回有效的模型列表数组';
    throw new Error(errorMessage);
  }
  return models
    .map((model: any) => model.id || model.model)
    .filter(Boolean)
    .sort();
}

async function fetchSillyTavernPresetModels(): Promise<string[]> {
  const context = getContext() as any;
  if (!context) throw new Error('无法获取SillyTavern上下文');
  const defaultModels = ['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet', 'claude-3-haiku', 'gemini-pro'];
  const currentModel = context.chat_completion_source;
  const models = currentModel ? [currentModel] : [];
  return [...new Set([...models, ...defaultModels])].sort();
}

export async function fetchModelsFromApi(): Promise<string[]> {
  const settings = getPluginSettings();
  try {
    switch (settings.apiProvider) {
      case 'openai':
        return await fetchOpenAICompatibleModels(settings.apiUrl, settings.apiKey);
      case 'openai_test':
        return await fetchOpenAITestModels(settings.apiUrl, settings.apiKey);
      case 'google':
        return await fetchGoogleDirectModels(settings.apiKey);
      case 'sillytavern_backend':
        return await fetchSillyTavernBackendModels(settings.apiUrl, settings.apiKey);
      case 'sillytavern_preset':
        return await fetchSillyTavernPresetModels();
      default:
        throw new Error(`未支持的API提供商: ${settings.apiProvider}`);
    }
  } catch (error: any) {
    console.error('获取模型列表失败:', error);
    showToast('error', `获取模型列表失败: ${error.message}`, '任务失败');
    return [];
  }
}

export async function testApiConnection(): Promise<boolean> {
  const models = await fetchModelsFromApi();
  return models.length > 0;
}

/**
 * 手动触发，提取最后一条角色消息中包含禁用词的句子。
 * @param callback 一个回调函数，用于接收提取出的内容。
 */
export function manualOptimize(callback: (content: string) => void) {
  console.log('[AI Optimizer] Manual optimize triggered.');

  const context = getContext();
  const chat = context.chat;
  const settings = getPluginSettings();

  if (!chat || chat.length === 0) {
    showToast('error', '聊天记录为空，无法优化。');
    console.error('[AI Optimizer] Chat is empty.');
    callback('');
    return;
  }

  // 从后往前遍历，找到最后一条 AI 消息 (角色消息)
  let lastCharMessage = null;
  for (let i = chat.length - 1; i >= 0; i--) {
    if (!chat[i].is_user) {
      lastCharMessage = chat[i];
      break;
    }
  }

  if (!lastCharMessage) {
    showToast('error', '未找到角色生成的消息。');
    console.error('[AI Optimizer] No character message found in chat history.');
    callback('');
    return;
  }

  console.log(`[AI Optimizer] Found last character message with ID: ${lastCharMessage.mes_id}`);
  const messageText = lastCharMessage.mes;

  // 步骤 1: 先对整个消息进行清理
  const cleanedMessage = cleanTextWithRegex(messageText);

  const disabledWords = (settings.disabledWords || '')
    .split(',')
    .map((w: string) => w.trim())
    .filter(Boolean);
  if (disabledWords.length === 0) {
    showToast('warning', '未设置禁用词，无法提取。');
    callback('');
    return;
  }

  // 步骤 2: 在清理后的文本中提取句子
  const sentences = extractSentencesWithRules(cleanedMessage, settings);

  if (sentences.length > 0) {
    showToast('success', '已提取待优化内容。');
    const numberedSentences = sentences.map((sentence, index) => `${index + 1}. ${sentence}`).join('\n');
    callback(numberedSentences);
  } else {
    // 在 Panel.vue 中处理此情况的UI反馈
    // (toastr as any).info('在最后一条角色消息中未找到包含禁用词的句子。');
    callback('');
  }
}

/**
 * 使用正则表达式列表清理文本。
 * @param text 要清理的文本。
 * @returns 清理后的文本。
 */
function cleanTextWithRegex(text: string): string {
  const settings = getPluginSettings();
  const regexFilters = settings.regexFilters || '';

  if (!regexFilters.trim()) {
    return text;
  }

  const regexLines = regexFilters
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  let cleanedText = text;

  for (const line of regexLines) {
    try {
      let pattern = line;
      let flags = 'gs'; // 默认标志

      // 检查是否为 /pattern/flags 格式
      const match = line.match(/^\/(.*)\/([gimsuy]*)$/);
      if (match) {
        pattern = match[1];
        // 如果用户提供了标志，则使用用户的；否则，保留我们的默认值
        flags = match[2] !== '' ? match[2] : flags;
      }

      const regex = new RegExp(pattern, flags);
      cleanedText = cleanedText.replace(regex, '');
    } catch (error) {
      console.error(`[AI Optimizer] 无效的正则表达式: "${line}"`, error);
      // 如果某个表达式无效，则跳过它
    }
  }

  return cleanedText.trim();
}

/**
 * 将指定的文本和提示词发送给AI进行优化。
 * @param textToOptimize 要优化的文本。
 * @param prompt 使用的系统提示词。
 * @returns 优化后的文本。
 */
export async function optimizeText(
  textToOptimize: string,
  prompt: string, // This parameter is kept for API compatibility but is now ignored.
  lastCharMessageText: string,
): Promise<string | null> {
  // This function is now a simple wrapper around the unified getOptimizedText function.
  return getOptimizedText(textToOptimize, lastCharMessageText);
}

/**
 * 替换最后一条角色消息中的句子。
 * @param originalContent 包含原始句子的文本块。
 * @param optimizedContent 包含优化后句子的文本块。
 * @param callback 更新UI的回调函数。
 */
/**
 * 内部函数，用于替换消息内容。
 * @param lastCharMessage 要修改的消息对象。
 * @param originalContent 原始句子内容。
 * @param optimizedContent 优化后的句子内容。
 */
async function replaceMessageInternal(lastCharMessage: any, originalContent: string, optimizedContent: string) {
  const context = getContext();
  const originalSentences = originalContent
    .split('\n')
    .map(s => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  const optimizedSentences = (optimizedContent.match(/\d+[.)]\s*[\s\S]*?(?=\s*\d+[.)]|\s*$)/g) || [])
    .map(s => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  if (originalSentences.length === 0) {
    console.warn('[AI Optimizer] No original sentences to replace.');
    return;
  }

  // 如果AI返回的句子数量与原始句子数量不匹配，则将所有原始句子替换为完整的优化后内容
  let modifiedMessage = lastCharMessage.mes;
  if (originalSentences.length !== optimizedSentences.length) {
    console.warn(
      `[AI Optimizer] Mismatch in sentence count. Original: ${originalSentences.length}, Optimized: ${optimizedSentences.length}. Replacing as a single block.`,
    );
    // 当句子数量不匹配时，将所有优化后的句子（已去编号）合并为一个字符串
    const replacementText = optimizedSentences.join(' ');
    // 用合并后的文本替换第一个原始句子
    modifiedMessage = modifiedMessage.replace(
      new RegExp(originalSentences[0].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')),
      replacementText,
    );
    // 移除剩余的原始句子
    for (let i = 1; i < originalSentences.length; i++) {
      modifiedMessage = modifiedMessage.replace(
        new RegExp(originalSentences[i].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')),
        '',
      );
    }
  } else {
    originalSentences.forEach((original, index) => {
      const optimized = optimizedSentences[index];
      // 移除 'g' 标志，确保只替换第一个匹配项
      const regex = new RegExp(original.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
      modifiedMessage = modifiedMessage.replace(regex, optimized);
    });
  }

  const tempVarName = `__optimizer_swipe_text_${Date.now()}`;
  const formattedMessage = modifiedMessage.replace(/\r?\n/g, '<br>');
  const safeMessageForSetvar = JSON.stringify(formattedMessage);

  const commandChain = [
    `/setvar key=${tempVarName} ${safeMessageForSetvar}`,
    `/addswipe switch=true {{getvar::${tempVarName}}}`,
    `/flushvar ${tempVarName}`,
  ].join(' | ');

  try {
    await context.executeSlashCommands(commandChain);
    console.log('[AI Optimizer] Executed addswipe command chain for auto-optimization.');
  } catch (error) {
    console.error('[AI Optimizer] Error executing addswipe command chain:', error);
    throw new Error('通过斜杠命令添加新消息版本时出错。');
  }
}

export function replaceMessage(
  originalContent: string,
  optimizedContent: string,
  callback: (newContent: string) => void,
) {
  console.log('[AI Optimizer] Starting message replacement.');

  const context = getContext();
  const chat = context.chat;

  if (!chat || chat.length === 0) {
    showToast('error', '聊天记录为空，无法替换。');
    return;
  }

  // 找到最后一条角色消息
  let lastCharMessage = null;
  for (let i = chat.length - 1; i >= 0; i--) {
    if (!chat[i].is_user) {
      lastCharMessage = chat[i];
      break;
    }
  }

  if (!lastCharMessage) {
    showToast('error', '未找到可替换的角色消息。');
    return;
  }

  const originalSentences = originalContent
    .split('\n')
    .map(s => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  const optimizedSentences = (optimizedContent.match(/\d+[.)]\s*[\s\S]*?(?=\s*\d+[.)]|\s*$)/g) || [])
    .map(s => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);

  if (originalSentences.length !== optimizedSentences.length) {
    console.warn('[AI Optimizer] Mismatch in sentence count. Will attempt block replacement.');
  }

  let modifiedMessage = lastCharMessage.mes;

  // 当句子数量不匹配时，进行块替换
  if (originalSentences.length !== optimizedSentences.length) {
    const replacementText = optimizedSentences.join(' ');
    modifiedMessage = modifiedMessage.replace(
      new RegExp(originalSentences[0].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')),
      replacementText,
    );
    for (let i = 1; i < originalSentences.length; i++) {
      modifiedMessage = modifiedMessage.replace(
        new RegExp(originalSentences[i].replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')),
        '',
      );
    }
  } else {
    originalSentences.forEach((original, index) => {
      const optimized = optimizedSentences[index];
      if (optimized) {
        // 移除 'g' 标志，确保只替换第一个匹配项
        const regex = new RegExp(original.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
        modifiedMessage = modifiedMessage.replace(regex, optimized);
      }
    });
  }

  // 更新测试文本框
  callback(modifiedMessage);

  // 执行替换
  (async () => {
    await replaceMessageInternal(lastCharMessage, originalContent, optimizedContent);
    showToast('success', '已添加优化后的消息版本！');
  })();
}

/**
 * 获取并解析 {{lastcharmessage}} 宏。
 * @returns 解析后的最后一条角色消息内容。
 */
export function getLastCharMessage(): string {
  try {
    const context = getContext() as any;
    if (context.utility && typeof context.utility.substitudeMacros === 'function') {
      // 尝试使用 context.utility 中的函数
      return context.utility.substitudeMacros('{{lastcharmessage}}');
    }
    // 作为备用方案，手动查找最后一条消息
    const chat = context.chat;
    if (!chat || chat.length === 0) {
      return '';
    }
    for (let i = chat.length - 1; i >= 0; i--) {
      if (!chat[i].is_user) {
        return chat[i].mes;
      }
    }
    return '';
  } catch (error) {
    console.error('[AI Optimizer] Error getting last char message:', error);
    return '';
  }
}
