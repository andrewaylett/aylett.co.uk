/*
 * Reed–Solomon decoder for QR code blocks.
 *
 * QR uses RS over GF(2^8)/0x11D with consecutive roots starting at b = 0,
 * i.e. syndromes S_i = c(α^i) for i = 0..eccLen−1 where α = 0x02.
 *
 * Codeword ordering: index 0 is the coefficient of the highest-degree term,
 * matching the byte order in which codewords are transmitted.  An error at
 * array index j therefore sits on x^(n−1−j), giving locator X_k = α^(n−1−j).
 */

import { gfDiv, gfExp, gfMul, polyEval } from './gf256';

/** Compute the eccLen syndromes of the received word.  b = 0 (first root α^0). */
function computeSyndromes(
  codewords: Iterable<number>,
  eccLen: number,
): Uint8Array {
  const syndromes = new Uint8Array(eccLen);
  for (let i = 0; i < eccLen; i++) {
    syndromes[i] = polyEval(codewords, gfExp(i));
  }
  return syndromes;
}

/**
 * Berlekamp–Massey to find the error locator polynomial σ(x).
 * Returns [sigma, L] where L is the register length (= number of errors).
 *
 * sigma is stored low-degree-first: sigma[0] = 1 (constant term), sigma[k]
 * is the coefficient of x^k.  This convention is opposite to polyEval's
 * highest-degree-first, but makes the BM recurrence simpler to index.
 */
function berlekampMassey(syndromes: Uint8Array): [Uint8Array, number] {
  const n = syndromes.length;
  // sigma: current error locator.  b: connection polynomial before last length jump.
  const sigma = new Uint8Array(n + 1);
  let b = new Uint8Array(n + 1);
  sigma[0] = 1;
  b[0] = 1;
  let L = 0; // current number of errors (register length)
  let x = 1; // steps since last length increase

  for (let r = 0; r < n; r++) {
    // Discrepancy δ = S_r + Σ_{i=1}^{L} σ_i · S_{r-i}
    let delta = syndromes[r];
    for (let i = 1; i <= L; i++) {
      delta ^= gfMul(sigma[i], syndromes[r - i]);
    }

    if (delta === 0) {
      x++;
    } else if (2 * L <= r) {
      // Length increase: save sigma, update it, then replace b with the saved copy.
      const prevSigma = new Uint8Array(sigma);
      const scale = delta;
      for (let i = x; i <= n; i++) {
        sigma[i] ^= gfMul(scale, b[i - x]);
      }
      // b ← prevSigma / delta (so the next discrepancy correction is properly scaled)
      const invDelta = gfDiv(1, scale);
      b = prevSigma;
      for (let i = 0; i < b.length; i++) {
        b[i] = gfMul(b[i], invDelta);
      }
      L = r + 1 - L;
      x = 1;
    } else {
      const scale = delta;
      for (let i = x; i <= n; i++) {
        sigma[i] ^= gfMul(scale, b[i - x]);
      }
      x++;
    }
  }

  return [sigma, L];
}

/**
 * Chien search: find all roots of σ(x) among field elements.
 *
 * sigma is low-degree-first.  The polynomial has a root at α^(-(n-1-j))
 * iff array index j is an error position.  We iterate j = 0..n-1 and
 * evaluate σ at the inverse of each candidate locator.
 *
 * Returns error position indices (into the codeword array), or null when
 * the root count does not equal deg σ.
 */
function chienSearch(sigma: Uint8Array, L: number, n: number): number[] | null {
  const positions: number[] = [];

  for (let j = 0; j < n; j++) {
    // Locator for array index j: X_j = α^(n-1-j).
    // σ has X_j as a root iff σ(X_j^{-1}) = 0.
    // X_j^{-1} = α^{-(n-1-j)} = α^{(255 - (n-1-j) % 255) % 255}
    const locatorPow = n - 1 - j;
    const invLocatorPow = (255 - (locatorPow % 255)) % 255;

    // Evaluate σ at α^{invLocatorPow} in low-degree-first order.
    let val = 0;
    for (let i = 0; i <= L; i++) {
      val ^= gfMul(sigma[i], gfExp((invLocatorPow * i) % 255));
    }

    if (val === 0) {
      positions.push(j);
    }
  }

  if (positions.length !== L) {
    return null;
  }
  return positions;
}

/**
 * Forney's formula to compute error magnitudes.
 *
 * For b = 0:  e_k = X_k · Ω(X_k^{-1}) / σ'(X_k^{-1})
 * where Ω = (S · σ) mod x^eccLen is the error evaluator polynomial,
 * and σ' is the formal derivative of σ (in char 2, kills all even-degree terms).
 *
 * Both Ω and σ' are stored low-degree-first to match σ.
 */
function forney(
  syndromes: Uint8Array,
  sigma: Uint8Array,
  L: number,
  errorPositions: number[],
  n: number,
): Uint8Array {
  const eccLen = syndromes.length;

  // Ω = (S · σ) mod x^eccLen, low-degree-first (index i = coefficient of x^i).
  const omega = new Uint8Array(eccLen);
  for (let i = 0; i < eccLen; i++) {
    for (let j = 0; j <= Math.min(i, L); j++) {
      omega[i] ^= gfMul(syndromes[i - j], sigma[j]);
    }
  }

  // Formal derivative in GF(2): d/dx(x^k) = k·x^(k-1), and k=0 in char 2 when k is even.
  // So σ'[i] = σ[i+1] when i is even (i.e. i+1 is odd), 0 otherwise.
  const sigmaDeriv = new Uint8Array(L + 1);
  for (let i = 1; i <= L; i++) {
    if ((i & 1) === 1) {
      sigmaDeriv[i - 1] = sigma[i];
    }
  }

  const magnitudes = new Uint8Array(n);
  for (const j of errorPositions) {
    const locatorPow = n - 1 - j;
    // X_k = α^locatorPow; X_k^{-1} = α^invLocatorPow
    const invLocatorPow = (255 - (locatorPow % 255)) % 255;
    const Xk = gfExp(locatorPow % 255);

    // Evaluate Ω and σ' at X_k^{-1} directly (low-degree-first sum).
    let omegaVal = 0;
    for (let i = 0; i < eccLen; i++) {
      omegaVal ^= gfMul(omega[i], gfExp((i * invLocatorPow) % 255));
    }
    let derivVal = 0;
    for (let i = 0; i <= L; i++) {
      derivVal ^= gfMul(sigmaDeriv[i], gfExp((i * invLocatorPow) % 255));
    }

    if (derivVal === 0) {
      // Degenerate case — should not occur for a correctly formed locator.
      continue;
    }

    // Magnitude = X_k · Ω(X_k^{-1}) / σ'(X_k^{-1}),  b = 0 factor = X_k^1.
    magnitudes[j] = gfMul(Xk, gfDiv(omegaVal, derivVal));
  }

  return magnitudes;
}

/**
 * Decode one QR Reed–Solomon block, correcting up to ⌊eccLen/2⌋ errors.
 *
 * @param codewords - Full block: data codewords then ECC codewords,
 *                   index 0 = coefficient of the highest-degree term.
 * @param eccLen    - Number of ECC codewords at the end of the block.
 * @returns Corrected block and ascending error positions, or null if uncorrectable.
 */
export function rsDecode(
  codewords: Uint8Array,
  eccLen: number,
): { corrected: Uint8Array; errorPositions: number[] } | null {
  const n = codewords.length;
  const corrected = new Uint8Array(codewords); // preserve the original

  // 1. Syndromes — zero means no errors.
  const syndromes = computeSyndromes(corrected, eccLen);
  if (syndromes.every((s) => s === 0)) {
    return { corrected, errorPositions: [] };
  }

  // 2. Berlekamp–Massey: find the error locator polynomial.
  const [sigma, L] = berlekampMassey(syndromes);
  if (L > Math.floor(eccLen / 2)) {
    return null;
  }

  // 3. Chien search: locate the errors.
  const errorPositions = chienSearch(sigma, L, n);
  if (errorPositions === null) {
    return null;
  }

  // 4. Forney's formula: compute error magnitudes.
  const magnitudes = forney(syndromes, sigma, L, errorPositions, n);

  // 5. Apply corrections.
  for (const j of errorPositions) {
    corrected[j] ^= magnitudes[j];
  }

  // 6. Recompute syndromes to guard against miscorrection.
  const check = computeSyndromes(corrected, eccLen);
  if (!check.every((s) => s === 0)) {
    return null;
  }

  return {
    corrected,
    errorPositions: [...errorPositions].sort((a, b) => a - b),
  };
}
