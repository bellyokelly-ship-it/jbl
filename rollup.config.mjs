import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.tsx',
  output: {
    file: 'dist/index.js',
    format: 'iife',
    name: 'JimmysBigLoad',
    globals: {
      react: 'SP_REACT',
      'react-dom': 'SP_REACTDOM',
      'decky-frontend-lib': 'DFL'
    }
  },
  external: ['react', 'react-dom', 'decky-frontend-lib'],
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    typescript({ tsconfig: './tsconfig.json' })
  ]
};
