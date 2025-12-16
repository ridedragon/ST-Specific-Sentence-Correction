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
>>>>>>> 92c68c92cf6d23fb9bcbda3d46057851634da0aa

  watch(
    settings,
    new_settings => {
<<<<<<< HEAD
      _.set(extension_settings, setting_field, toRaw(new_settings)); // 用 toRaw 去除 proxy 层
=======
      _.set(extension_settings, setting_field, klona(new_settings)); // 用 klona 克隆对象从而去除 proxy 层
>>>>>>> 92c68c92cf6d23fb9bcbda3d46057851634da0aa
      saveSettingsDebounced();
    },
    { deep: true },
  );
  return {
    settings,
  };
});
