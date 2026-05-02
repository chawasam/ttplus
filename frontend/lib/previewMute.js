// lib/previewMute.js
// Auto-mute every audio path when the page is loaded as a preview iframe.
// Trigger: ?preview=1 in the URL (set by pages/widgets.js when building iframe src).
// Real widget URLs (no preview flag) are unaffected — this file is a no-op there.
//
// Why patch globals: widget pages use 3 different audio paths (HTMLMediaElement,
// AudioContext, speechSynthesis). Patching at the API level avoids touching
// every widget individually and stays correct as new widgets are added.

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get('preview') === '1';

  if (isPreview && !window.__ttplusPreviewMuted) {
    window.__ttplusPreviewMuted = true;

    // 1. <audio> + <video> — force muted before every play()
    try {
      const proto = HTMLMediaElement.prototype;
      const origPlay = proto.play;
      proto.play = function patchedPlay(...args) {
        try { this.muted = true; this.volume = 0; } catch {}
        return origPlay.apply(this, args);
      };
    } catch {}

    // 2. AudioContext — proxy so .destination returns a silent gain node.
    //    Anything connect()ed to "ctx.destination" lands on muteGain (gain=0)
    //    which is itself never connected to the real output → silence.
    try {
      ['AudioContext', 'webkitAudioContext'].forEach((name) => {
        const Orig = window[name];
        if (!Orig) return;
        function MutedAudioContext(...args) {
          const ctx = new Orig(...args);
          const muteGain = ctx.createGain();
          muteGain.gain.value = 0;
          return new Proxy(ctx, {
            get(target, prop) {
              if (prop === 'destination') return muteGain;
              const v = Reflect.get(target, prop);
              return typeof v === 'function' ? v.bind(target) : v;
            },
          });
        }
        MutedAudioContext.prototype = Orig.prototype;
        window[name] = MutedAudioContext;
      });
    } catch {}

    // 3. Web Speech API
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.speak = () => {};
      }
    } catch {}

    // eslint-disable-next-line no-console
    console.log('[previewMute] active — audio silenced for preview');
  }
}
