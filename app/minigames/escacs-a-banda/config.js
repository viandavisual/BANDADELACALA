// ESCACS A BANDA — v17
// Configuració dels layouts MOBILE i DESKTOP amb vista superior i tauler en pla.
window.EAB_CONFIG = {
  layouts: {
    mobile: {
      canvas: { width: 1080, height: 1920 },
      background: 'assets/background/background.png',
      grid: {
        y: [706, 805, 904, 1003, 1102, 1201, 1300, 1399, 1498],
        xTop:    [145, 243.75, 342.5, 441.25, 540, 638.75, 737.5, 836.25, 935],
        xBottom: [145, 243.75, 342.5, 441.25, 540, 638.75, 737.5, 836.25, 935]
      },
      video: {
        src: 'assets/video/pueblo.webm',
        top: 22,
        left: 319,
        width: 442,
        height: 490,
        objectFit: 'cover',
        objectPosition: 'center center'
      },
      pieces: {
        baseWidth: 102,
        farScale: 1,
        nearScale: 1,
        anchorBottomOffset: 0
      },
      movement: { durationMs: 380, selectedLiftPx: 10 }
    },

    desktop: {
      canvas: { width: 1672, height: 941 },
      background: 'assets/background/background_desktop.png',
      grid: {
        y: [47, 155, 263, 370, 477, 583, 690, 790, 897],
        xTop:    [758, 866, 974, 1081, 1190, 1298, 1407, 1515, 1625],
        xBottom: [758, 866, 974, 1081, 1190, 1298, 1407, 1515, 1625]
      },
      video: {
        src: 'assets/video/pueblo.webm',
        top: 21,
        left: 193,
        width: 354,
        height: 399,
        objectFit: 'cover',
        objectPosition: 'center center'
      },
      pieces: {
        baseWidth: 106,
        farScale: 1,
        nearScale: 1,
        anchorBottomOffset: -5
      },
      movement: { durationMs: 380, selectedLiftPx: 8 }
    }
  }
};
