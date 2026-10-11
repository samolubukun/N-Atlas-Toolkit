// Audio Recording & Encoding utility for N-ATLaS ASR integration

export function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + samples.length * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function downsampleBuffer(audioBuffers, nativeSampleRate, targetSampleRate = 16000) {
  const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const b of audioBuffers) {
    merged.set(b, offset);
    offset += b.length;
  }

  if (nativeSampleRate === targetSampleRate) {
    return merged;
  }

  const ratio = nativeSampleRate / targetSampleRate;
  const newLength = Math.round(merged.length / ratio);
  const finalSamples = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const originIdx = i * ratio;
    const low = Math.floor(originIdx);
    const high = Math.min(low + 1, merged.length - 1);
    const weight = originIdx - low;
    finalSamples[i] = merged[low] * (1 - weight) + merged[high] * weight;
  }

  return finalSamples;
}
