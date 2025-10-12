declare const hljs: typeof import('highlight.js').default;
declare const Popper: typeof import('@popperjs/core');

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
