interface Biquad {
  b: [number, number, number];
  a: [number, number];
}

function shelfFilter(sampleRate: number): Biquad {
  const gainDb = 3.999843853973347;
  const q = 0.7071752369554196;
  const fc = 1681.9744509555319;

  const k = Math.tan((Math.PI * fc) / sampleRate);
  const vh = 10 ** (gainDb / 20);
  const vb = vh ** 0.4996667741545416;
  const a0 = 1 + k / q + k * k;

  return {
    b: [
      (vh + (vb * k) / q + k * k) / a0,
      (2 * (k * k - vh)) / a0,
      (vh - (vb * k) / q + k * k) / a0,
    ],
    a: [(2 * (k * k - 1)) / a0, (1 - k / q + k * k) / a0],
  };
}

function highPassFilter(sampleRate: number): Biquad {
  const q = 0.5003270373238773;
  const fc = 38.13547087602444;

  const k = Math.tan((Math.PI * fc) / sampleRate);
  const a0 = 1 + k / q + k * k;

  return {
    b: [1, -2, 1],
    a: [(2 * (k * k - 1)) / a0, (1 - k / q + k * k) / a0],
  };
}

function applyBiquad(input: Float32Array | Float64Array, filter: Biquad): Float64Array {
  const out = new Float64Array(input.length);
  const [b0, b1, b2] = filter.b;
  const [a1, a2] = filter.a;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  for (let n = 0; n < input.length; n++) {
    const x0 = input[n] ?? 0;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[n] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

const toLufs = (meanSquare: number) => -0.691 + 10 * Math.log10(meanSquare);

export function measureLoudness(channels: readonly Float32Array[], sampleRate: number): number {
  const first = channels[0];
  if (!first || sampleRate <= 0) return -Infinity;

  const blockSize = Math.round(0.4 * sampleRate);
  const hop = Math.round(0.1 * sampleRate);
  if (first.length < blockSize) return -Infinity;

  const shelf = shelfFilter(sampleRate);
  const highPass = highPassFilter(sampleRate);
  const weighted = channels.map((ch) => applyBiquad(applyBiquad(ch, shelf), highPass));

  const prefix = weighted.map((ch) => {
    const sums = new Float64Array(ch.length + 1);
    for (let i = 0; i < ch.length; i++) sums[i + 1] = (sums[i] ?? 0) + (ch[i] ?? 0) ** 2;
    return sums;
  });

  const blocks: number[] = [];
  for (let start = 0; start + blockSize <= first.length; start += hop) {
    let energy = 0;
    for (const sums of prefix) {
      energy += ((sums[start + blockSize] ?? 0) - (sums[start] ?? 0)) / blockSize;
    }
    blocks.push(energy);
  }

  const mean = (values: number[]) => values.reduce((acc, v) => acc + v, 0) / values.length;

  const aboveAbsolute = blocks.filter((e) => e > 0 && toLufs(e) > -70);
  if (aboveAbsolute.length === 0) return -Infinity;

  const relativeThreshold = toLufs(mean(aboveAbsolute)) - 10;
  const aboveRelative = aboveAbsolute.filter((e) => toLufs(e) > relativeThreshold);
  if (aboveRelative.length === 0) return -Infinity;

  return toLufs(mean(aboveRelative));
}
