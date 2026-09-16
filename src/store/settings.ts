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
>>>>>>> ca79a60657738624986a5eb77a4305c3a12174bd

  watch(
    settings,
    new_settings => {
<<<<<<< HEAD
      _.set(extension_settings, setting_field, toRaw(new_settings)); // 用 toRaw 去除 proxy 层
=======
      _.set(extension_settings, setting_field, klona(new_settings)); // 用 klona 克隆对象从而去除 proxy 层
>>>>>>> ca79a60657738624986a5eb77a4305c3a12174bd
      saveSettingsDebounced();
    },
    { deep: true },
  );
  return {
    settings,
  };
});
