import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
];
