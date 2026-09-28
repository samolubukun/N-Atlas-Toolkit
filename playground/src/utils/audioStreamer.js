/**
 * AudioStreamer: Manages Web Audio API microphone capture, 
 * downsampling to 16kHz 16-bit Mono PCM, and streaming over WebSocket
 * to the Deepgram-style live STT endpoint.
 */
export class AudioStreamer {
  constructor({ wsUrl, onTranscript, onError, onStatusChange, onAudioLevel }) {
    this.wsUrl = wsUrl;
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
      
      // Connect WebSocket
      const url = new URL(this.wsUrl);
      url.searchParams.set("language", language);
      
      this.socket = new WebSocket(url.toString());
      this.socket.binaryType = "arraybuffer";

      this.socket.onopen = async () => {
        this.onStatusChange?.("connected");
        await this._initAudio();
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
