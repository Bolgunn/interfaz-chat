import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: { initialColorMode: 'system', useSystemColorMode: false },
  fonts: {
    heading: `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
    body: `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  },
  colors: {
    brand: {
      50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
      500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81',
    },
  },
  semanticTokens: {
    colors: {
      'bg.app': { default: 'gray.50', _dark: '#0f1117' },
      'bg.panel': { default: 'white', _dark: 'gray.800' },
      'bg.subtle': { default: 'gray.100', _dark: 'whiteAlpha.100' },
      'bg.sidebar': { default: 'white', _dark: 'gray.900' },
      'border.subtle': { default: 'gray.200', _dark: 'whiteAlpha.200' },
      'text.muted': { default: 'gray.500', _dark: 'gray.400' },
    },
  },
  components: {
    Button: { defaultProps: { colorScheme: 'brand' } },
  },
  styles: {
    global: {
      'html, body, #root': { height: '100%' },
      body: { bg: 'bg.app' },
      '.katex-display': { margin: '0.25em 0', textAlign: 'left' },
      '.katex-display > .katex': { textAlign: 'left' },
    },
  },
});

export default theme;
