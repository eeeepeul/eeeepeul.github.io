import { createElement } from 'react'
import { assetPath } from '../../lib/asset-path.mjs'
import { FigmaHomeScene } from './FigmaHomeScene.mjs'
import { MapGisChrome } from './MapGisChrome.mjs'
import { StageAbout } from './StageAbout.mjs'
import { StageEventLog } from './StageEventLog.mjs'
import { StagePlayer } from './StagePlayer.mjs'
import { StageRadar } from './StageRadar.mjs'
import { StageScaleCell } from './StageScaleCell.mjs'
import { StageFunctionGraph } from './StageFunctionGraph.mjs'
import { StageSpectrum } from './StageSpectrum.mjs'
import { StageVisitors } from './StageVisitors.mjs'
import { StageVolume } from './StageVolume.mjs'

// The home page as one fixed-proportion screen of panels. The cells are laid out on a
// 2000 x 1126 plan and placed by percentage, so the whole stage scales with the window and
// keeps its shape. Cell 4 holds the map; the others are empty places, named by number,
// waiting for their content.
export const STAGE_WIDTH = 2000
export const STAGE_HEIGHT = 1126

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
  [9, 426, 806, 718, 992],
  [10, 718, 806, 1010, 992],
  [11, 1036, 806, 1988, 992],
  [12, 12, 1004, 308, 1112],
  [13, 318, 1004, 1988, 1112],
]

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
      stroke: '#767676',
      strokeWidth: 1.1,
    }),
    [[4, 4], [w - 10.5, 4], [4, h - 10.5], [w - 10.5, h - 10.5]].map(([x, y]) =>
      createElement('rect', { key: `${x}-${y}`, x, y, width: 6.5, height: 6.5, fill: '#767676' })
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
            createElement(StageFunctionGraph)
          )
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
            createElement(StageSpectrum)
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
            createElement('iframe', {
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
            createElement('iframe', {
              className: 'stage-cell__frame',
              src: assetPath('panels/flow-chart.html'),
              title: 'Flow chart',
              loading: 'eager',
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
              createElement('iframe', {
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
      })
    )
  )
}
