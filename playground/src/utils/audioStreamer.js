/**
 * AudioStreamer: Manages Web Audio API microphone capture, 
 * downsampling to 16kHz 16-bit Mono PCM, and streaming over WebSocket
 * to the N-ATLaS live STT endpoint.
 */
export class AudioStreamer {
  constructor({ wsUrl, apiKey, onTranscript, onError, onStatusChange, onAudioLevel }) {
    this.wsUrl = wsUrl;
    this.apiKey = apiKey;
    this.onTranscript = onTranscript;
    this.onError = onError;
    this.onStatusChange = onStatusChange;
    this.onAudioLevel = onAudioLevel;

    this.socket = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.sourceNode = null;
    this.isStreaming = false;
  }

  async start(language = "en-ng") {
    try {
      this.onStatusChange?.("connecting");
      
      // 1. Immediately request microphone access from user system
      await this._initAudio();

      // 2. Connect WebSocket stream to ASR backend
      const url = new URL(this.wsUrl);
      url.searchParams.set("language", language);
      if (this.apiKey) {
        url.searchParams.set("token", this.apiKey);
      }
      
      this.socket = new WebSocket(url.toString());
      this.socket.binaryType = "arraybuffer";

      this.socket.onopen = () => {
        this.onStatusChange?.("connected");
        this.isStreaming = true;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const transcript = data.channel?.alternatives?.[0]?.transcript || "";
          if (transcript) {
            this.onTranscript?.({
              transcript,
              isFinal: data.is_final ?? true,
              words: data.channel?.alternatives?.[0]?.words || [],
              language: data.language,
              model: data.model,
            });
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      this.socket.onerror = (err) => {
        this.onError?.("WebSocket connection error");
        this.stop();
      };

      this.socket.onclose = () => {
        this.onStatusChange?.("disconnected");
        this.isStreaming = false;
      };

    } catch (err) {
      this.onError?.(err.message);
      this.stop();
    }
  }

  async _initAudio() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // ScriptProcessor to capture raw PCM
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    // Voice Activity Energy Gate to avoid sending pure background noise/silence
    let silenceFrames = 0;
    const SILENCE_THRESHOLD = 0.008; // RMS below this is treated as ambient room silence
    const SILENCE_HANGOVER = 4; // allow ~1 sec hangover after speaking to avoid clipping trailing words

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isStreaming || this.socket?.readyState !== WebSocket.OPEN) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      // Compute audio level for VU-meter
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      this.onAudioLevel?.(Math.min(1, rms * 5));

      if (rms >= SILENCE_THRESHOLD) {
        silenceFrames = 0; // Active speech detected
      } else {
        silenceFrames++;
      }

      // If in continuous deep silence, suppress streaming packets to prevent Whisper silence hallucination
      if (silenceFrames > SILENCE_HANGOVER) {
        return;
      }

      // Convert Float32Array to 16-bit PCM Int16Array
      const pcm16 = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Stream raw binary buffer
      this.socket.send(pcm16.buffer);
    };

    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    this.isStreaming = true;
    this.onStatusChange?.("streaming");
  }

  stop() {
    this.isStreaming = false;
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "CloseStream" }));
        this.socket.close();
      } catch (e) {}
    }
    this.socket = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onStatusChange?.("idle");
    this.onAudioLevel?.(0);
  }
}
