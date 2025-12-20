import { resolve } from 'path'
import { loadEnv } from 'vite'
import type { UserConfig, ConfigEnv } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import progress from 'vite-plugin-progress'
import EslintPlugin from 'vite-plugin-eslint'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import { viteMockServe } from 'vite-plugin-mock'
import PurgeIcons from 'vite-plugin-purge-icons'
import ServerUrlCopy from 'vite-plugin-url-copy'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { createStyleImportPlugin, ElementPlusResolve } from 'vite-plugin-style-import'
import UnoCSS from 'unocss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const root = process.cwd()

function pathResolve(dir: string) {
  return resolve(root, '.', dir)
}

export default ({ command, mode }: ConfigEnv): UserConfig => {
  const isBuild = command === 'build'
  const env = loadEnv(mode, root)

  return {
    base: '/',

    /* ====================== plugins ====================== */
    plugins: [
      nodePolyfills({
        protocolImports: false
      }),

      Vue({
        script: {
          defineModel: true
        }
      }),
      VueJsx(),
      ServerUrlCopy(),
      progress(),

      env.VITE_USE_ALL_ELEMENT_PLUS_STYLE === 'false'
        ? createStyleImportPlugin({
            resolves: [ElementPlusResolve()],
            libs: [
              {
                libraryName: 'element-plus',
                esModule: true,
                resolveStyle: (name) => {
                  if (name === 'click-outside') return ''
                  return `element-plus/es/components/${name.replace(/^el-/, '')}/style/css`
                }
              }
            ]
          })
        : undefined,

      EslintPlugin({
        cache: false,
        failOnWarning: false,
        failOnError: false,
        include: ['src/**/*.vue', 'src/**/*.ts', 'src/**/*.tsx']
      }),

      VueI18nPlugin({
        runtimeOnly: true,
        compositionOnly: true,
        include: [resolve(__dirname, 'src/locales/**')]
      }),

      createSvgIconsPlugin({
        iconDirs: [pathResolve('src/assets/svgs')],
        symbolId: 'icon-[dir]-[name]',
        svgoOptions: true
      }),

      PurgeIcons(),

      env.VITE_USE_MOCK === 'true'
        ? viteMockServe({
            ignore: /^\_/,
            mockPath: 'mock',
            localEnabled: !isBuild,
            prodEnabled: false
          })
        : undefined,

      ViteEjsPlugin({
        title: env.VITE_APP_TITLE
      }),

      UnoCSS()
    ],

    /* ====================== define ====================== */
    define: {
      global: 'globalThis',
      'process.env': {}
    },

    /* ====================== css ====================== */
    css: {
      preprocessorOptions: {
        less: {
          additionalData: '@import "./src/styles/variables.module.less";',
          javascriptEnabled: true
        }
      }
    },

    /* ====================== resolve ====================== */
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.less', '.css'],
      alias: [
        { find: 'vue-i18n', replacement: 'vue-i18n/dist/vue-i18n.cjs.js' },
        { find: /\@\//, replacement: `${pathResolve('src')}/` },
        { find: 'buffer', replacement: 'buffer' },
        { find: 'stream', replacement: 'stream-browserify' },
        { find: 'crypto', replacement: 'crypto-browserify' },
        { find: 'process', replacement: 'process/browser' },
        { find: 'rpc-websockets/dist/lib/client', replacement: 'rpc-websockets' },
        { find: 'rpc-websockets/dist/lib/client/websocket.browser', replacement: 'rpc-websockets' }
      ]
    },

    /* ====================== esbuild（关键） ====================== */
    esbuild: {
      target: 'es2020', // ✅ 关键修复
      pure: env.VITE_DROP_CONSOLE === 'true' ? ['console.log'] : undefined,
      drop: env.VITE_DROP_DEBUGGER === 'true' ? ['debugger'] : undefined
    },

    /* ====================== build（关键） ====================== */
    build: {
      target: 'es2020', // ✅ 从 es2015 → es2020（BigInt 必须）
      outDir: env.VITE_OUT_DIR || 'dist',
      sourcemap: env.VITE_SOURCEMAP === 'true',
      cssCodeSplit: env.VITE_USE_CSS_SPLIT !== 'false',
      cssTarget: 'chrome80', // ✅ 同步升级
      commonjsOptions: {
        transformMixedEsModules: true
      },
      rollupOptions: {
        plugins: env.VITE_USE_BUNDLE_ANALYZER === 'true' ? [visualizer()] : undefined,
        output: {
          manualChunks: {
            'vue-chunks': ['vue', 'vue-router', 'pinia', 'vue-i18n'],
            'element-plus': ['element-plus'],
            'wang-editor': ['@wangeditor/editor', '@wangeditor/editor-for-vue'],
            echarts: ['echarts', 'echarts-wordcloud']
          }
        }
      }
    },

    /* ====================== server ====================== */
    server: {
      port: 4000,
      host: '0.0.0.0',
      hmr: {
        overlay: false
      },
      proxy: {
        '/api': {
          target: 'https://www.echorura.com/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/app': {
          target: 'https://www.echorura.com/app',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/app/, '')
        }
      }
    },

    /* ====================== optimizeDeps ====================== */
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'vue-types',
        'element-plus/es/locale/lang/zh-cn',
        'element-plus/es/locale/lang/en',
        '@iconify/iconify',
        '@vueuse/core',
        'axios',
        'qs',
        'echarts',
        'echarts-wordcloud',
        'qrcode',
        '@wangeditor/editor',
        '@wangeditor/editor-for-vue',
        'vue-json-pretty',
        '@zxcvbn-ts/core',
        'dayjs',
        'cropperjs',
        'buffer',
        'process/browser'
      ],
      esbuildOptions: {
        target: 'es2020',
        define: {
          global: 'globalThis'
        }
      }
    }
  }
}
