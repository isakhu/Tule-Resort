/**
 * Standards-compliant ISO/IEC 18004 QR Code Generator (Byte mode, Error Correction Level M).
 * Produces crisp, scannable QR SVGs with 4-module quiet zone, GF(256) Reed-Solomon ECC,
 * BCH(15,5) format bits, BCH(18,6) version bits (v >= 7), and optimal 8-mask penalty scoring.
 */

interface EcVersionSpec {
  version: number;
  maxBytes: number;
  ecCodewordsPerBlock: number;
  blocksGroup1: [number, number]; // [count, dataCodewords]
  blocksGroup2?: [number, number];
}

// ISO/IEC 18004 Error Correction Level M specifications (Versions 1..10)
const EC_M_SPECS: EcVersionSpec[] = [
  { version: 1, maxBytes: 14, ecCodewordsPerBlock: 10, blocksGroup1: [1, 16] },
  { version: 2, maxBytes: 26, ecCodewordsPerBlock: 16, blocksGroup1: [1, 28] },
  { version: 3, maxBytes: 42, ecCodewordsPerBlock: 26, blocksGroup1: [1, 44] },
  { version: 4, maxBytes: 62, ecCodewordsPerBlock: 18, blocksGroup1: [2, 32] },
  { version: 5, maxBytes: 84, ecCodewordsPerBlock: 24, blocksGroup1: [2, 43] },
  { version: 6, maxBytes: 106, ecCodewordsPerBlock: 16, blocksGroup1: [4, 27] },
  { version: 7, maxBytes: 122, ecCodewordsPerBlock: 18, blocksGroup1: [4, 31] },
  { version: 8, maxBytes: 152, ecCodewordsPerBlock: 22, blocksGroup1: [2, 38], blocksGroup2: [2, 39] },
  { version: 9, maxBytes: 180, ecCodewordsPerBlock: 22, blocksGroup1: [3, 36], blocksGroup2: [2, 37] },
  { version: 10, maxBytes: 213, ecCodewordsPerBlock: 26, blocksGroup1: [4, 43], blocksGroup2: [1, 44] },
];

const ALIGNMENT_POSITIONS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// GF(256) log/exp lookup tables for primitive polynomial 0x11d (x^8 + x^4 + x^3 + x^2 + 1)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildRsGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeRsRemainder(data: number[], ecCount: number): number[] {
  const gen = buildRsGenerator(ecCount);
  const res = new Array<number>(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) {
      for (let i = 0; i < ecCount; i++) {
        res[i] ^= gfMul(gen[i + 1], factor);
      }
    }
  }
  return res;
}

function encodeDataCodewords(bytes: Uint8Array, spec: EcVersionSpec): number[] {
  const g1Count = spec.blocksGroup1[0];
  const g1Data = spec.blocksGroup1[1];
  const g2Count = spec.blocksGroup2?.[0] ?? 0;
  const g2Data = spec.blocksGroup2?.[1] ?? 0;
  const totalDataCodewords = g1Count * g1Data + g2Count * g2Data;
  const totalDataBits = totalDataCodewords * 8;

  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode: Byte (0100)
  pushBits(0b0100, 4);
  // Character count indicator: 8 bits for versions 1..9, 16 bits for version >= 10
  const countBits = spec.version >= 10 ? 16 : 8;
  pushBits(bytes.length, countBits);

  for (const b of bytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zero bits)
  const terminatorLen = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < terminatorLen; i++) bits.push(0);

  // Byte alignment padding
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let b = 0; b < 8; b++) {
      val = (val << 1) | bits[i + b];
    }
    codewords.push(val);
  }

  // Pad codewords alternating 0xEC, 0x11
  let padToggle = 0;
  while (codewords.length < totalDataCodewords) {
    codewords.push(padToggle === 0 ? 0xec : 0x11);
    padToggle ^= 1;
  }

  // Split into RS blocks & interleave data + EC codewords
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;

  for (let i = 0; i < g1Count; i++) {
    const block = codewords.slice(offset, offset + g1Data);
    offset += g1Data;
    dataBlocks.push(block);
    ecBlocks.push(computeRsRemainder(block, spec.ecCodewordsPerBlock));
  }
  for (let i = 0; i < g2Count; i++) {
    const block = codewords.slice(offset, offset + g2Data);
    offset += g2Data;
    dataBlocks.push(block);
    ecBlocks.push(computeRsRemainder(block, spec.ecCodewordsPerBlock));
  }

  const interleaved: number[] = [];
  const maxDataLen = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      interleaved.push(block[i]);
    }
  }

  return interleaved;
}

function getBchFormatBits(mask: number): number {
  // Error correction Level M indicator bits = 00
  const data = mask & 0b111;
  let rem = data << 10;
  const poly = 0x537;
  for (let i = 14; i >= 10; i--) {
    if ((rem >>> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function getBchVersionBits(version: number): number {
  let rem = version << 12;
  const poly = 0x1f25;
  for (let i = 17; i >= 12; i--) {
    if ((rem >>> i) & 1) {
      rem ^= poly << (i - 12);
    }
  }
  return (version << 12) | rem;
}

function createFunctionGrid(version: number): {
  size: number;
  modules: boolean[][];
  isFunction: boolean[][];
} {
  const size = 17 + 4 * version;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const setFn = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = val;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns + 1-module white separator borders
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
        const inOuterRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInnerSquare = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(r, c, !inBorder && (inOuterRing || inInnerSquare));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const bit = i % 2 === 0;
    setFn(6, i, bit);
    setFn(i, 6, bit);
  }

  // Alignment patterns
  const alignCoords = ALIGNMENT_POSITIONS[version] ?? [];
  const lastIdx = alignCoords.length - 1;
  for (let rIdx = 0; rIdx <= lastIdx; rIdx++) {
    for (let cIdx = 0; cIdx <= lastIdx; cIdx++) {
      if (
        (rIdx === 0 && cIdx === 0) ||
        (rIdx === 0 && cIdx === lastIdx) ||
        (rIdx === lastIdx && cIdx === 0)
      ) {
        continue;
      }
      const centerR = alignCoords[rIdx];
      const centerC = alignCoords[cIdx];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const val = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFn(centerR + dr, centerC + dc, val);
        }
      }
    }
  }

  // Reserve format info zones around finders + mandatory dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFn(8, i, false);
      setFn(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFn(8, size - 1 - i, false);
  }
  for (let i = 0; i < 7; i++) {
    setFn(size - 1 - i, 8, false);
  }
  setFn(size - 8, 8, true); // Dark module (4*v + 9, 8)

  // Version info (versions 7..10)
  if (version >= 7) {
    const vBits = getBchVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = Boolean((vBits >>> i) & 1);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, bit);
      setFn(b, a, bit);
    }
  }

  return { size, modules, isFunction };
}

function drawFormatBits(modules: boolean[][], size: number, mask: number): void {
  const fmt = getBchFormatBits(mask);

  // Copy 1: around top-left finder
  for (let i = 0; i <= 5; i++) modules[8][i] = Boolean((fmt >>> i) & 1);
  modules[8][7] = Boolean((fmt >>> 6) & 1);
  modules[8][8] = Boolean((fmt >>> 7) & 1);
  modules[7][8] = Boolean((fmt >>> 8) & 1);
  for (let i = 9; i < 15; i++) modules[14 - i][8] = Boolean((fmt >>> i) & 1);

  // Copy 2: top-right horizontal & bottom-left vertical
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = Boolean((fmt >>> (14 - i)) & 1);
  for (let i = 0; i < 7; i++) modules[size - 1 - i][8] = Boolean((fmt >>> i) & 1);
}

function shouldFlipMask(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function placeCodewords(
  modules: boolean[][],
  isFunction: boolean[][],
  size: number,
  codewords: number[],
): void {
  const totalBits = codewords.length * 8;
  let bitIndex = 0;
  let goingUp = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Skip vertical timing column cleanly
    for (let step = 0; step < size; step++) {
      const r = goingUp ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const c = right - offset;
        if (isFunction[r][c]) continue;
        let bit = false;
        if (bitIndex < totalBits) {
          const cw = codewords[bitIndex >>> 3];
          bit = Boolean((cw >>> (7 - (bitIndex & 7))) & 1);
          bitIndex++;
        }
        modules[r][c] = bit;
      }
    }
    goingUp = !goingUp;
  }
}

function scorePenalty(modules: boolean[][], size: number): number {
  let penalty = 0;

  // N1: 5+ same-color modules in a row/col
  const evalLine = (getBit: (i: number) => boolean) => {
    let runColor = getBit(0);
    let runLen = 1;
    for (let i = 1; i < size; i++) {
      const bit = getBit(i);
      if (bit === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = bit;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  };

  for (let r = 0; r < size; r++) evalLine((c) => modules[r][c]);
  for (let c = 0; c < size; c++) evalLine((r) => modules[r][c]);

  // N2: 2x2 same-color blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = modules[r][c];
      if (
        modules[r][c + 1] === color &&
        modules[r + 1][c] === color &&
        modules[r + 1][c + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  // N3: 1:1:3:1:1 finder-like ratio with 4 light modules on either side
  const isPattern = (getBit: (i: number) => boolean, start: number): boolean => {
    const p1 =
      getBit(start) &&
      !getBit(start + 1) &&
      getBit(start + 2) &&
      getBit(start + 3) &&
      getBit(start + 4) &&
      !getBit(start + 5) &&
      getBit(start + 6);
    if (!p1) return false;
    const clearLeft =
      start >= 4 &&
      !getBit(start - 1) &&
      !getBit(start - 2) &&
      !getBit(start - 3) &&
      !getBit(start - 4);
    const clearRight =
      start + 10 < size &&
      !getBit(start + 7) &&
      !getBit(start + 8) &&
      !getBit(start + 9) &&
      !getBit(start + 10);
    return clearLeft || clearRight;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 7; c++) {
      if (isPattern((i) => modules[r][i], c)) penalty += 40;
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 7; r++) {
      if (isPattern((i) => modules[i][c], r)) penalty += 40;
    }
  }

  // N4: balance of dark vs light modules
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) darkCount++;
    }
  }
  const percentDiff = Math.abs((darkCount * 100) / (size * size) - 50);
  penalty += Math.floor(percentDiff / 5) * 10;

  return penalty;
}

/**
 * Generates an ISO/IEC 18004 scannable QR code boolean matrix (true = dark module) for any UTF-8 text.
 */
export function createQrMatrix(text: string): boolean[][] {
  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText) {
    throw new Error('QR code input text cannot be empty.');
  }

  const encoder = new TextEncoder();
  const bytes = encoder.encode(cleanText);

  const spec = EC_M_SPECS.find((s) => bytes.length <= s.maxBytes);
  if (!spec) {
    throw new Error(
      `QR code payload exceeds supported maximum (${EC_M_SPECS[EC_M_SPECS.length - 1].maxBytes} bytes).`,
    );
  }

  const codewords = encodeDataCodewords(bytes, spec);
  const { size, modules: baseModules, isFunction } = createFunctionGrid(spec.version);
  placeCodewords(baseModules, isFunction, size, codewords);

  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestModules: boolean[][] = baseModules;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = baseModules.map((row, r) =>
      row.map((val, c) => (isFunction[r][c] ? val : shouldFlipMask(mask, r, c) ? !val : val)),
    );
    drawFormatBits(candidate, size, mask);
    const penalty = scorePenalty(candidate, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestModules = candidate;
    }
  }

  return bestModules;
}

/**
 * Renders a standards-compliant, high-contrast QR Code SVG string with a 4-module white quiet zone.
 */
export function renderQrSvgString(text: string, sizePx = 240): string {
  const matrix = createQrMatrix(text);
  const moduleCount = matrix.length;
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;

  const pathParts: string[] = [];
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        pathParts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" ` +
    `width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" role="img" aria-label="QR Code">` +
    `<rect width="${totalModules}" height="${totalModules}" fill="#ffffff"/>` +
    `<path d="${pathParts.join('')}" fill="#0B252C"/>` +
    `</svg>`
  );
}

/**
 * Converts a generated QR SVG into a browser-safe Base64/UTF-8 Data URI for <img> tags & downloads.
 */
export function generateQrSvgUri(text: string, sizePx = 240): string {
  const cleanText = typeof text === 'string' ? text.trim() : '';
  if (!cleanText) return '';
  const svg = renderQrSvgString(cleanText, sizePx);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
