import fs from 'node:fs'
import path from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

// Setup __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const urls = [
   'https://tailwindcss.com/docs/aspect-ratio',
   'https://tailwindcss.com/docs/columns',
   'https://tailwindcss.com/docs/break-after',
   'https://tailwindcss.com/docs/break-before',
   'https://tailwindcss.com/docs/break-inside',
   'https://tailwindcss.com/docs/box-decoration-break',
   'https://tailwindcss.com/docs/box-sizing',
   'https://tailwindcss.com/docs/display',
   'https://tailwindcss.com/docs/float',
   'https://tailwindcss.com/docs/clear',
   'https://tailwindcss.com/docs/isolation',
   'https://tailwindcss.com/docs/object-fit',
   'https://tailwindcss.com/docs/object-position',
   'https://tailwindcss.com/docs/overflow',
   'https://tailwindcss.com/docs/overscroll-behavior',
   'https://tailwindcss.com/docs/position',
   'https://tailwindcss.com/docs/top-right-bottom-left',
   'https://tailwindcss.com/docs/visibility',
   'https://tailwindcss.com/docs/z-index',
   'https://tailwindcss.com/docs/flex-basis',
   'https://tailwindcss.com/docs/flex-direction',
   'https://tailwindcss.com/docs/flex-wrap',
   'https://tailwindcss.com/docs/flex',
   'https://tailwindcss.com/docs/flex-grow',
   'https://tailwindcss.com/docs/flex-shrink',
   'https://tailwindcss.com/docs/order',
   'https://tailwindcss.com/docs/grid-template-columns',
   'https://tailwindcss.com/docs/grid-column',
   'https://tailwindcss.com/docs/grid-template-rows',
   'https://tailwindcss.com/docs/grid-row',
   'https://tailwindcss.com/docs/grid-auto-flow',
   'https://tailwindcss.com/docs/grid-auto-columns',
   'https://tailwindcss.com/docs/grid-auto-rows',
   'https://tailwindcss.com/docs/gap',
   'https://tailwindcss.com/docs/justify-content',
   'https://tailwindcss.com/docs/justify-items',
   'https://tailwindcss.com/docs/justify-self',
   'https://tailwindcss.com/docs/align-content',
   'https://tailwindcss.com/docs/align-items',
   'https://tailwindcss.com/docs/align-self',
   'https://tailwindcss.com/docs/place-content',
   'https://tailwindcss.com/docs/place-items',
   'https://tailwindcss.com/docs/place-self',
   'https://tailwindcss.com/docs/padding',
   'https://tailwindcss.com/docs/margin',
   'https://tailwindcss.com/docs/width',
   'https://tailwindcss.com/docs/min-width',
   'https://tailwindcss.com/docs/max-width',
   'https://tailwindcss.com/docs/height',
   'https://tailwindcss.com/docs/min-height',
   'https://tailwindcss.com/docs/max-height',
   'https://tailwindcss.com/docs/font-family',
   'https://tailwindcss.com/docs/font-size',
   'https://tailwindcss.com/docs/font-smoothing',
   'https://tailwindcss.com/docs/font-style',
   'https://tailwindcss.com/docs/font-weight',
   'https://tailwindcss.com/docs/font-stretch',
   'https://tailwindcss.com/docs/font-variant-numeric',
   'https://tailwindcss.com/docs/letter-spacing',
   'https://tailwindcss.com/docs/line-clamp',
   'https://tailwindcss.com/docs/line-height',
   'https://tailwindcss.com/docs/list-style-image',
   'https://tailwindcss.com/docs/list-style-position',
   'https://tailwindcss.com/docs/list-style-type',
   'https://tailwindcss.com/docs/text-align',
   'https://tailwindcss.com/docs/color',
   'https://tailwindcss.com/docs/text-decoration-line',
   'https://tailwindcss.com/docs/text-decoration-color',
   'https://tailwindcss.com/docs/text-decoration-style',
   'https://tailwindcss.com/docs/text-decoration-thickness',
   'https://tailwindcss.com/docs/text-underline-offset',
   'https://tailwindcss.com/docs/text-transform',
   'https://tailwindcss.com/docs/text-overflow',
   'https://tailwindcss.com/docs/text-wrap',
   'https://tailwindcss.com/docs/text-indent',
   'https://tailwindcss.com/docs/vertical-align',
   'https://tailwindcss.com/docs/white-space',
   'https://tailwindcss.com/docs/word-break',
   'https://tailwindcss.com/docs/overflow-wrap',
   'https://tailwindcss.com/docs/hyphens',
   'https://tailwindcss.com/docs/content',
   'https://tailwindcss.com/docs/background-attachment',
   'https://tailwindcss.com/docs/background-clip',
   'https://tailwindcss.com/docs/background-color',
   'https://tailwindcss.com/docs/background-image',
   'https://tailwindcss.com/docs/background-origin',
   'https://tailwindcss.com/docs/background-position',
   'https://tailwindcss.com/docs/background-repeat',
   'https://tailwindcss.com/docs/background-size',
   'https://tailwindcss.com/docs/border-radius',
   'https://tailwindcss.com/docs/border-width',
   'https://tailwindcss.com/docs/border-color',
   'https://tailwindcss.com/docs/border-style',
   'https://tailwindcss.com/docs/outline-width',
   'https://tailwindcss.com/docs/outline-color',
   'https://tailwindcss.com/docs/outline-style',
   'https://tailwindcss.com/docs/outline-offset',
   'https://tailwindcss.com/docs/box-shadow',
   'https://tailwindcss.com/docs/text-shadow',
   'https://tailwindcss.com/docs/opacity',
   'https://tailwindcss.com/docs/mix-blend-mode',
   'https://tailwindcss.com/docs/background-blend-mode',
   'https://tailwindcss.com/docs/mask-clip',
   'https://tailwindcss.com/docs/mask-composite',
   'https://tailwindcss.com/docs/mask-image',
   'https://tailwindcss.com/docs/mask-mode',
   'https://tailwindcss.com/docs/mask-origin',
   'https://tailwindcss.com/docs/mask-position',
   'https://tailwindcss.com/docs/mask-repeat',
   'https://tailwindcss.com/docs/mask-size',
   'https://tailwindcss.com/docs/mask-type',
   'https://tailwindcss.com/docs/filter',
   'https://tailwindcss.com/docs/filter-blur',
   'https://tailwindcss.com/docs/filter-brightness',
   'https://tailwindcss.com/docs/filter-contrast',
   'https://tailwindcss.com/docs/filter-drop-shadow',
   'https://tailwindcss.com/docs/filter-grayscale',
   'https://tailwindcss.com/docs/filter-hue-rotate',
   'https://tailwindcss.com/docs/filter-invert',
   'https://tailwindcss.com/docs/filter-saturate',
   'https://tailwindcss.com/docs/filter-sepia',
   'https://tailwindcss.com/docs/backdrop-filter',
   'https://tailwindcss.com/docs/backdrop-filter-blur',
   'https://tailwindcss.com/docs/backdrop-filter-brightness',
   'https://tailwindcss.com/docs/backdrop-filter-contrast',
   'https://tailwindcss.com/docs/backdrop-filter-grayscale',
   'https://tailwindcss.com/docs/backdrop-filter-hue-rotate',
   'https://tailwindcss.com/docs/backdrop-filter-invert',
   'https://tailwindcss.com/docs/backdrop-filter-opacity',
   'https://tailwindcss.com/docs/backdrop-filter-saturate',
   'https://tailwindcss.com/docs/backdrop-filter-sepia',
   'https://tailwindcss.com/docs/border-collapse',
   'https://tailwindcss.com/docs/border-spacing',
   'https://tailwindcss.com/docs/table-layout',
   'https://tailwindcss.com/docs/caption-side',
   'https://tailwindcss.com/docs/transition-property',
   'https://tailwindcss.com/docs/transition-behavior',
   'https://tailwindcss.com/docs/transition-duration',
   'https://tailwindcss.com/docs/transition-timing-function',
   'https://tailwindcss.com/docs/transition-delay',
   'https://tailwindcss.com/docs/animation',
   'https://tailwindcss.com/docs/backface-visibility',
   'https://tailwindcss.com/docs/perspective',
   'https://tailwindcss.com/docs/perspective-origin',
   'https://tailwindcss.com/docs/rotate',
   'https://tailwindcss.com/docs/scale',
   'https://tailwindcss.com/docs/skew',
   'https://tailwindcss.com/docs/transform',
   'https://tailwindcss.com/docs/transform-origin',
   'https://tailwindcss.com/docs/transform-style',
   'https://tailwindcss.com/docs/translate',
   'https://tailwindcss.com/docs/accent-color',
   'https://tailwindcss.com/docs/appearance',
   'https://tailwindcss.com/docs/caret-color',
   'https://tailwindcss.com/docs/color-scheme',
   'https://tailwindcss.com/docs/cursor',
   'https://tailwindcss.com/docs/field-sizing',
   'https://tailwindcss.com/docs/pointer-events',
   'https://tailwindcss.com/docs/resize',
   'https://tailwindcss.com/docs/scroll-behavior',
   'https://tailwindcss.com/docs/scroll-margin',
   'https://tailwindcss.com/docs/scroll-padding',
   'https://tailwindcss.com/docs/scroll-snap-align',
   'https://tailwindcss.com/docs/scroll-snap-stop',
   'https://tailwindcss.com/docs/scroll-snap-type',
   'https://tailwindcss.com/docs/touch-action',
   'https://tailwindcss.com/docs/user-select',
   'https://tailwindcss.com/docs/will-change',
   'https://tailwindcss.com/docs/fill',
   'https://tailwindcss.com/docs/stroke',
   'https://tailwindcss.com/docs/stroke-width',
   'https://tailwindcss.com/docs/forced-color-adjust',
]

const outputFile = path.join(__dirname, 'output.html')

function sleepRandom(min = 500, max = 1500) {
   const delay = Math.floor(Math.random() * (max - min + 1)) + min
   return new Promise(resolve => setTimeout(resolve, delay))
}

async function processUrl(url) {
   try {
      const res = await fetch(url)
      const html = await res.text()
      const $ = cheerio.load(html)

      const titleElem = $('[data-title]').first()
      const descElem = $('[data-description]').first()
      const contentElem = $('#quick-reference')

      const responseTitle = titleElem.length ? $.html(titleElem) : ''
      const responseDescription = descElem.length ? $.html(descElem) : ''
      const responseContent = contentElem.length ? contentElem.html() : ''

      let articleHtml = `<article>${responseTitle}${responseDescription}${responseContent}</article>`

      // Remove all class attributes
      articleHtml = articleHtml.replace(/\sclass=".*?"/g, '')

      // Replace literal '\n' strings with <br />
      articleHtml = articleHtml.replace(/\\n/g, '<br />')

      // Remove <button>Show more</button> elements
      articleHtml = articleHtml.replace(/<button[^>]*>\s*Show more\s*<\/button>/gi, '')

      // Remove hidden="" attributes
      articleHtml = articleHtml.replace(/\s?hidden=""/g, '')

      fs.appendFileSync(outputFile, `${articleHtml}\n`, 'utf8')
      console.log(`Processed: ${url}`)
   } catch (err) {
      console.error(`Error processing ${url}:`, err)
   }
}
;(async () => {
   for (const url of urls) {
      await processUrl(url)
      await sleepRandom() // 500ms delay between each request
   }
})()
