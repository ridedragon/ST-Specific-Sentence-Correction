import { setting_field, Settings } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
<<<<<<< HEAD
import { defineStore } from 'pinia';
import { ref, watch, toRaw } from 'vue';
import _ from 'lodash';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(validateInplace(Settings, _.get(extension_settings, setting_field, {})));
=======

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(validateInplace(Settings, _.get(extension_settings, setting_field)));
>>>>>>> ad825c209b30fa0b4e5ea03c34884f6c08556797

  watch(
    settings,
    new_settings => {
<<<<<<< HEAD
      _.set(extension_settings, setting_field, toRaw(new_settings)); // 用 toRaw 去除 proxy 层
=======
      _.set(extension_settings, setting_field, klona(new_settings)); // 用 klona 克隆对象从而去除 proxy 层
>>>>>>> ad825c209b30fa0b4e5ea03c34884f6c08556797
      saveSettingsDebounced();
    },
    { deep: true },
  );
  return {
    settings,
  };
});
