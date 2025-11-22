<<<<<<< HEAD
import { z } from 'zod';
export type Settings = z.infer<typeof Settings>;
export const Settings = z.object({
  autoOptimize: z.boolean().default(false),
  apiProvider: z
    .enum(['openai', 'openai_test', 'google', 'sillytavern_backend', 'sillytavern_preset'])
    .default('openai'),
  apiUrl: z.string().url().optional().or(z.literal('')).default(''),
  apiKey: z.string().default(''),
  modelName: z.string().default(''),
  autoFetchModels: z.boolean().default(false),
  disabledWords: z.string().default(''),
  sentencePatterns: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['contains', 'startsWith', 'endsWith', 'patternAB']),
        valueA: z.string(),
        valueB: z.string().optional(),
        enabled: z.boolean(),
      }),
    )
    .default([]),
  regexFilters: z
    .string()
    .default(
      [
        '<StatusPlaceHolderImpl\\/>',
        '\\s*<!--[\\s\\S]*?-->\\s*',
        '(<disclaimer>.*?<\\/disclaimer>)|(<guifan>.*?<\\/guifan>)|```start|<content>|<\\/content>|```end|<done>|`<done>`|(<!--\\s*consider\\s*:\\s*(.*?)\\s*-->)|(.*?<\\/think(ing)?>(\\n)?)|(<think(ing)?>[\\s\\S]*?<\\/think(ing)?>(\\n)?)',
        '/<UpdateVariable>[\\s\\S]*?<\\/UpdateVariable>/gm',
      ].join('\n'),
    ),
  disableNotifications: z.boolean().default(false),

  // 生成设置
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().positive().default(2000),
  top_p: z.number().min(0).max(1).default(1),
  top_k: z.number().int().positive().optional(),

  // 提示词编写器设置
  promptSettings: z
    .object({
      main: z.string().default(''),
      system: z.string().default(''),
      final_system: z.string().default(''),
    })
    .default({
      main: '你是一个专业的剧情优化助手。',
      system: '请根据用户的要求，优化提供的句子，使其更生动、更具描述性。',
      final_system: '只返回优化后的句子，不要包含任何额外的解释或标签。',
    }),
});

export const setting_field = 'ai_text_optimizer';
=======
export type Settings = z.infer<typeof Settings>;
export const Settings = z
  .object({
    button_selected: z.boolean().default(false),
  })
  .prefault({});

export const setting_field = 'tavern_extension_example';
>>>>>>> a1d4b450e551280aae4a6e70f0f3a660762f9e99
