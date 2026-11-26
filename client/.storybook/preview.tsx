import type { Preview } from '@storybook/react-vite';
import '../src/styles/global.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Тема оформления',
      toolbar: {
        title: 'Тема',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Тёмная' },
          { value: 'light', title: 'Светлая' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i } },
    a11y: { test: 'error' },
  },
  decorators: [
    (Story, context) => {
      // Цвета берутся из CSS-переменных, поэтому достаточно выставить атрибут, как это делает приложение.
      document.documentElement.setAttribute('data-theme', String(context.globals.theme));
      return (
        <>
          {/* Анимации отключены, иначе скриншоты получаются «плавающими». */}
          <style>{`*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important}body{background:var(--bg) !important}`}</style>
          <div style={{ padding: 24, minWidth: 320, background: 'var(--bg)' }}>
            <Story />
          </div>
        </>
      );
    },
  ],
};

export default preview;
