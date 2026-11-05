import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { FigmaHomeScene } from './FigmaHomeScene.mjs'
import { MapGisChrome } from './MapGisChrome.mjs'
import { StageAbout } from './StageAbout.mjs'
import { StageEventLog } from './StageEventLog.mjs'
import { StagePlayer } from './StagePlayer.mjs'
import { StageRadar } from './StageRadar.mjs'
import { StageScaleCell } from './StageScaleCell.mjs'
import { StageSequence } from './StageSequence.mjs'
import { StageFunctionGraph } from './StageFunctionGraph.mjs'
import { StageDomino } from './StageDomino.mjs'
import { StageGuide } from './StageGuide.mjs'
import { StagePanel15 } from './StagePanel15.mjs'
import { StageWelcome } from './StageWelcome.mjs'
import { StageGrain } from './StageGrain.mjs'
import { StageMargins } from './StageMargins.mjs'
import { StageSpectrum } from './StageSpectrum.mjs'
import { StageHouse } from './StageHouse.mjs'
import { StageVisitors } from './StageVisitors.mjs'
import { StageVolume } from './StageVolume.mjs'
import { StageLateFrame } from './StageLateFrame.mjs'
import { StagePalette } from './StagePalette.mjs'

// The home page as one fixed-proportion screen of panels. The cells are laid out on a
// 2000 x 1126 plan and placed by percentage, so the whole stage scales with the window and
// keeps its shape. Cell 4 holds the map; the others are empty places, named by number,
// waiting for their content.
export const STAGE_WIDTH = 2000
export const STAGE_HEIGHT = 1126

// The welcome card that opens on arrival. It is left out while the site is being worked on (the
// local development server) and shown on the built site; to see it while working, set
// NEXT_PUBLIC_SHOW_WELCOME=1 when starting the server, or change this to true.
const SHOW_WELCOME = process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_SHOW_WELCOME === '1'

// [number, left, top, right, bottom] on the plan.
export const STAGE_CELLS = [
  [1, 12, 14, 412, 418],
  [2, 12, 418, 412, 664],
  [3, 12, 689, 412, 992],
  [4, 426, 12, 1580, 792],
  [5, 1592, 14, 1988, 176],
  [6, 1592, 188, 1988, 528],
  [7, 1592, 540, 1988, 704],
  [8, 1592, 704, 1988, 806],
  [9, 424, 813, 706, 992],
  [10, 706, 813, 988, 992],
  [11, 1286, 805, 1972, 941],
  [12, 12, 1004, 309, 1113],
  [13, 309, 1003, 1972, 1113],
  // the new boxes of the lower band: 14 a strip of small squares, 15 a picture in three parts, 16 the
  // dominoes, 17 the lines of letters, 18 a plain bar
  // (14: the supplied strip on white, its tiles running from 735 to 988 across, laid on the page's own
  // colour; the picture is cut to a hair outside its tiles, so the box is 254 x 16)
  [14, 734.5, 795.7, 988.5, 811.8],
  [15, 1038, 805, 1286, 1003],
  [16, 1286, 941, 1972, 977],
  [17, 1286, 977, 1972, 1003],
  [18, 1972, 806, 1988, 1113],
]

// The big boxes that lie under the cells, grouping them (as in the supplied drawing): [left, top, right,
// bottom] on the plan. One holds the two cells at the top left, the other the whole lower band; they are
// plain black, so the pale margin between the cells reads as a few clear groups instead of many pieces.
// (nothing lies under cell 3: the lower band's box goes round it, along its right side and under it)
export const STAGE_BLOCKS = [
  [0, 0, 426, 676],
  [423, 792, 1986, 1123],
  [0, 998, 423, 1123],
]

// Where the margin's own small graphics lie: [left, top, width, height] on the plan (the picture is 2000 x 685,
// so 614 across is 3.257 of its pixels to a unit)
export const MARGIN_GRAPHICS = [424, 794, 614, 210.3]

// The place the panel reads out (to be tied to the map's own view later).
export const LOCATION_READING = '09.0100\u00b0 N / 21.8000\u00b0 E'

export function getCellStyle([, left, top, right, bottom]) {
  const pct = (value, whole) => `${((value / whole) * 100).toFixed(4)}%`
  return {
    left: pct(left, STAGE_WIDTH),
    top: pct(top, STAGE_HEIGHT),
    width: pct(right - left, STAGE_WIDTH),
    height: pct(bottom - top, STAGE_HEIGHT),
  }
}

// Four corner brackets with a small square at each corner, open in the middle of every side,
// drawn over a picture like a viewfinder. One unit is one pixel of the 2000-wide plan, so the
// fine line scales with the stage and the brackets sit close to the picture's edge.
function ViewfinderFrame() {
  const w = 386
  const h = 365
  const reachX = 124
  const reachY = 123
  return createElement(
    'svg',
    { className: 'viewfinder', viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' },
    createElement('path', {
      d: `M0.6 ${reachY}V0.6H${reachX}M${w - reachX} 0.6H${w - 0.6}V${reachY}M0.6 ${h - reachY}V${h - 0.6}H${reachX}M${w - reachX} ${h - 0.6}H${w - 0.6}V${h - reachY}`,
      fill: 'none',
      stroke: '#bed7d6',
      strokeWidth: 1.1,
    }),
    [[4, 4], [w - 10.5, 4], [4, h - 10.5], [w - 10.5, h - 10.5]].map(([x, y]) =>
      createElement('rect', { key: `${x}-${y}`, x, y, width: 6.5, height: 6.5, fill: '#eae2c4' })
    )
  )
}

// The readout over the scanned houses is the supplied graphic itself (a transparent PNG, a
// little under 2x the cell), laid over the whole cell exactly as it was drawn.
function HouseReadout() {
  return createElement('img', {
    className: 'house-readout',
    src: assetPath('panels/house-readout.png'),
    alt: '',
    draggable: false,
    'aria-hidden': 'true',
  })
}

export function HomeStage() {
  return createElement(
    'main',
    { className: 'stage-shell' },
    createElement(
      'div',
      { className: 'stage', style: { '--stage-ratio': `${STAGE_WIDTH} / ${STAGE_HEIGHT}` } },
      // the colour filters the pictures are shown through (see StagePalette)
      createElement(StagePalette),
      // the margins between the boxes, filled with fine ordered graphics (under the boxes)
      createElement(StageMargins, { boxes: STAGE_CELLS, width: STAGE_WIDTH, height: STAGE_HEIGHT }),
      // the big boxes under the cells
      STAGE_BLOCKS.map((block, index) =>
        createElement('div', {
          key: `block-${index}`,
          className: index === 1 ? 'stage-block stage-block--lower' : 'stage-block',
          'aria-hidden': 'true',
          style: getCellStyle([0, ...block]),
        })
      ),
      STAGE_CELLS.map((cell) => {
        const [number] = cell
        if (number === 4) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--map',
              'data-stage-cell': number,
              'aria-label': '지도',
              style: getCellStyle(cell),
            },
            createElement('div', { className: 'stage-map-space', 'aria-hidden': 'true' }, createElement(FigmaHomeScene)),
            createElement(MapGisChrome, { homeHref: assetPath('') })
          )
        }
        if (number === 10) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--graph',
              'data-stage-cell': number,
              'aria-label': '칸 10, 움직이는 함수 그래프',
              style: getCellStyle(cell),
            },
            createElement(StageFunctionGraph),
            // the small map set in the lower right corner of the picture, with its black frame
            createElement('img', {
              className: 'map-inset',
              src: assetPath('media/map-inset-thin.png'),
              alt: '',
              draggable: false,
              'aria-hidden': 'true',
            })
          )
        }
        if (number === 14) {
          // the strip of small squares above the picture of cell 10
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--strip14',
              'data-stage-cell': number,
              'aria-label': '칸 14, 띠',
              style: getCellStyle(cell),
            },
            createElement('img', {
              className: 'stage-cell__picture',
              src: assetPath('media/strip-14-color.png'),
              alt: '',
              draggable: false,
            })
          )
        }
        if (number === 15) {
          // the supplied picture of three parts (15-1, 15-2, 15-3)
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--panel15',
              'data-stage-cell': number,
              'aria-label': '칸 15',
              style: getCellStyle(cell),
            },
            createElement(StagePanel15)
          )
        }
        if (number === 16) {
          // seventeen tiles whose movement goes along the row like dominoes
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--domino',
              'data-stage-cell': number,
              'aria-label': '칸 16, 도미노',
              style: getCellStyle(cell),
            },
            createElement(StageDomino)
          )
        }
        if (number === 17) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--sequence',
              'data-stage-cell': number,
              'aria-label': '칸 17, 서열',
              style: getCellStyle(cell),
            },
            createElement(StageSequence)
          )
        }
        if (number === 18) {
          // the plain dark bar down the right edge of the lower band
          return createElement('section', {
            key: number,
            className: 'stage-cell stage-cell--solid',
            'data-stage-cell': number,
            'aria-hidden': 'true',
            style: getCellStyle(cell),
          })
        }
        if (number === 13) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--spectrum',
              'data-stage-cell': number,
              'aria-label': '칸 13, 주파수',
              style: getCellStyle(cell),
            },
            createElement(StageSpectrum),
            createElement(StageHouse)
          )
        }
        if (number === 12) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--player',
              'data-stage-cell': number,
              'aria-label': '칸 12, 플레이어',
              style: getCellStyle(cell),
            },
            createElement(StagePlayer)
          )
        }
        if (number === 9) {
          // A looping clip, shown to the shape of the cell (it is nearly the cell's own shape).
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--clip',
              'data-stage-cell': number,
              'aria-label': '칸 9, 영상',
              style: getCellStyle(cell),
            },
            createElement('video', {
              className: 'stage-cell__clip',
              src: assetPath('media/source-1.mp4'),
              autoPlay: true,
              muted: true,
              loop: true,
              playsInline: true,
              preload: 'auto',
              'aria-hidden': 'true',
              tabIndex: -1,
              disablePictureInPicture: true,
            }),
            // a sonar-chart drawing laid over the clip: multiplied over it (the paper drops out, only ink
            // shows), fading away softly round the gel picture in the corner instead of stopping at an edge
            createElement(
              'div',
              { className: 'clip-soft', 'aria-hidden': 'true' },
              createElement('img', {
                className: 'clip-overlay',
                src: assetPath('media/clip-9-overlay.webp'),
                alt: '',
                draggable: false,
              }),
              createElement(StageGrain)
            ),
            // the small picture of gel bands in the upper right corner of the clip (191 x 56)
            createElement('img', {
              className: 'clip-gel',
              src: assetPath('media/gel-9.png'),
              alt: '',
              draggable: false,
              'aria-hidden': 'true',
            })
          )
        }
        if (number === 7) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--radar',
              'data-stage-cell': number,
              'aria-label': '칸 7, 레이더',
              style: getCellStyle(cell),
            },
            createElement(StageRadar)
          )
        }
        if (number === 5) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--visitors',
              'data-stage-cell': number,
              'aria-label': '칸 5, 방문자 기록',
              style: getCellStyle(cell),
            },
            createElement(StageVisitors)
          )
        }
        if (number === 3) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--about',
              'data-stage-cell': number,
              'aria-label': '칸 3, Epeul 데이터 설명',
              style: getCellStyle(cell),
            },
            createElement(StageAbout),
            createElement('div', { className: 'about-volume' }, createElement(StageVolume))
          )
        }
        if (number === 8) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--log',
              'data-stage-cell': number,
              'aria-label': '칸 8, 클릭 기록',
              style: getCellStyle(cell),
            },
            createElement(StageEventLog)
          )
        }
        if (number === 6) {
          // The scanned houses: a 3D model page of its own, turning in its cell.
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--model',
              'data-stage-cell': number,
              'aria-label': '칸 6, 스캔한 집',
              style: getCellStyle(cell),
            },
            createElement(StageLateFrame, {
              className: 'stage-cell__frame',
              src: assetPath('panels/epeul-scanned-houses.html'),
              title: 'epeul scanned houses',
              loading: 'eager',
            }),
            createElement(HouseReadout)
          )
        }
        if (number === 11) {
          // The flow chart: a page of its own that draws itself to the size of the cell.
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--chart',
              'data-stage-cell': number,
              'aria-label': '칸 11, 흐름 차트',
              style: getCellStyle(cell),
            },
            createElement(StageLateFrame, {
              className: 'stage-cell__frame',
              src: assetPath('panels/flow-chart.html'),
              title: 'Flow chart',
              loading: 'eager',
            }),
            // the line of letters over the top left of the chart (picture and chart share one size,
            // 1324 x 264, so the letters sit at their own fractions of the box)
            createElement('span', { className: 'chart-rule', 'aria-hidden': 'true' }),
            createElement('img', {
              className: 'chart-text',
              src: assetPath('media/chart-text.png'),
              alt: '',
              draggable: false,
              'aria-hidden': 'true',
            })
          )
        }
        if (number === 2) {
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--scale',
              'data-stage-cell': number,
              'aria-label': '칸 2, 높음에서 낮음 척도',
              style: getCellStyle(cell),
            },
            createElement(StageScaleCell)
          )
        }
        if (number === 1) {
          // The point relief of the Atlantic: a page of its own, shown in its cell as it is made.
          return createElement(
            'section',
            {
              key: number,
              className: 'stage-cell stage-cell--frame',
              'data-stage-cell': number,
              'aria-label': '칸 1, 점 지형도',
              style: getCellStyle(cell),
            },
            createElement(
              'header',
              { className: 'stage-bar' },
              createElement('span', { className: 'stage-bar__chip' }, 'LOC.'),
              createElement('span', { className: 'stage-bar__chip stage-bar__chip--value' }, LOCATION_READING)
            ),
            createElement(
              'div',
              { className: 'stage-cell__view' },
              createElement(StageLateFrame, {
                className: 'stage-cell__frame',
                src: assetPath('panels/point-relief.html'),
                title: 'Atlantic Point Relief',
                loading: 'eager',
              }),
              createElement(ViewfinderFrame)
            )
          )
        }
        return createElement(
          'section',
          {
            key: number,
            className: 'stage-cell stage-cell--empty',
            'data-stage-cell': number,
            'aria-label': `칸 ${number}`,
            style: getCellStyle(cell),
          },
          createElement('span', { className: 'stage-cell__number', 'aria-hidden': 'true' }, number)
        )
      }),
      // the small graphics the margin round cells 9, 10 and 15 was given (bars, boxes, a column of hexagons),
      // laid over the cells exactly as drawn: the picture is 2000 x 685 and covers 614 x 210.3 of the plan,
      // from its left 424 and top 794
      createElement('img', {
        className: 'stage-margin-graphics',
        src: assetPath('media/margin-graphics-bottom.webp'),
        alt: '',
        draggable: false,
        'aria-hidden': 'true',
        style: getCellStyle([0, MARGIN_GRAPHICS[0], MARGIN_GRAPHICS[1], MARGIN_GRAPHICS[0] + MARGIN_GRAPHICS[2], MARGIN_GRAPHICS[1] + MARGIN_GRAPHICS[3]]),
      }),
      createElement(StageGuide),
      SHOW_WELCOME ? createElement(StageWelcome) : null
    )
  )
}
