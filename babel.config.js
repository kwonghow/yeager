const plugins = [
  '@babel/plugin-proposal-export-default-from',
  '@babel/plugin-proposal-export-namespace-from',
  '@babel/plugin-syntax-dynamic-import',
  ['@babel/plugin-proposal-class-properties', { loose: false }],
];

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: false,
        targets: {
          browsers: ['>0.25%'],
        },
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  env: {
    development: {
      plugins: [
        'react-hot-loader/babel',
        ['@babel/plugin-transform-runtime', { corejs: 2 }],
        'styled-jsx/babel',
        ...plugins,
      ],
    },
    production: {
      plugins: [
        ['styled-jsx/babel', { optimizeForSpeed: false }],
        ['@babel/plugin-transform-runtime', { corejs: 2 }],
        'transform-remove-console',
        ...plugins,
      ],
    },
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: 'commonjs',
            targets: {
              node: 'current',
            },
          },
        ],
        '@babel/preset-react',
        '@babel/preset-typescript',
      ],
      plugins: [
        // ['@babel/plugin-transform-runtime'],
        ...plugins,
        // '@babel/plugin-transform-modules-commonjs',
        // 'dynamic-import-node-babel-7',
      ],
    },
    lib: {
      ignore: [
        '**/node_modules/*',
        '**/__tests__/*',
        '**/__mocks__/*',
        'rollup.config.js',
        'webpack.config.js',
      ],
      plugins: [
        '@babel/plugin-syntax-dynamic-import',
        'dynamic-import-webpack',
        ['@babel/plugin-transform-runtime', { corejs: 2 }],
        'styled-jsx/babel',
      ],
    },
  },
};
