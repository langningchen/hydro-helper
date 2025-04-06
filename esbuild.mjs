import { context } from 'esbuild';
import process from 'process';
import console from 'console';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        platform: 'node',
        outfile: 'out/extension.js',
        external: ['vscode'],
    });
    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
