import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.js',
    output: {
        file: './output/kyber.js',
        format: 'esm'
    },
    plugins: [
        nodeResolve(
            { preferBuiltins: false }
        ),
        commonjs(),
    ]
};