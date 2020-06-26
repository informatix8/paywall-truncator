import pkg from './package.json';

export default [
    {
        input: pkg.module,
        output: {
            name: 'Truncator',
            file: pkg.main,
            format: 'cjs',
            sourcemap: true
        }
    }
];
