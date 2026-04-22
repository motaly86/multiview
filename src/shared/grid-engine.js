// Grid layout calculator
const GridEngine = (() => {
  function getLayout(count) {
    if (count <= 0) return { cols: 0, rows: 0 };
    if (count === 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    if (count <= 12) return { cols: 4, rows: 3 };
    if (count <= 16) return { cols: 4, rows: 4 };
    if (count <= 20) return { cols: 5, rows: 4 };
    if (count <= 25) return { cols: 5, rows: 5 };
    if (count <= 30) return { cols: 6, rows: 5 };
    return { cols: 6, rows: 6 };
  }

  // Force a specific layout
  const PRESETS = {
    '1x1': { cols: 1, rows: 1 },
    '2x2': { cols: 2, rows: 2 },
    '3x3': { cols: 3, rows: 3 },
    '4x4': { cols: 4, rows: 4 },
    '5x5': { cols: 5, rows: 5 },
    '6x6': { cols: 6, rows: 6 },
  };

  return { getLayout, PRESETS };
})();

if (typeof window !== 'undefined') window.GridEngine = GridEngine;
