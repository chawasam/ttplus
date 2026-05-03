import {
  StyleGlass, StyleEQ, StyleNotes, StyleVinyl, StyleAurora, StyleNeon,
  StyleCassette, StylePulse, StyleParticles, StyleSpectrum, StyleSimple,
  StylePill, StyleBanner, StyleGhost, StyleTicker, StyleBadge, StyleCorner,
  StyleMinimalDark, StyleOutline, StyleFrosted, StyleCardWhite,
  StyleWave, StyleFire, StyleRain, StylePlasma, StyleStarfield, StyleFireflies,
  StyleGlitch, StyleMatrix, StyleRipple, StyleSmoke,
  StyleTurntable, StylePiano, StyleWaveform, StyleOscilloscope, StyleVinylColor,
  StyleSpectrumRing, StyleMetronome, StyleCassetteMini, StyleBoomBox, StyleHeadphones,
  StyleRetro80s, StyleVHS, StyleTerminal, StyleHologram, StyleNewspaper,
  StylePolaroid, StyleCyberpunk, StyleLofi, StyleAnime, StyleNature,
  StyleSunset, StyleMidnight, StyleCherry, StyleOcean, StyleForest,
  StyleGold, StyleCosmic, StyleCandy, StyleLava, StyleIce,
} from './styles';

export default function NPStyleSwitch({ styleId, track, cfg }) {
  const p = { track, cfg };
  switch (styleId) {
    // ── Original 11 ──
    case 'eq':              return <StyleEQ        {...p} />;
    case 'notes':           return <StyleNotes     {...p} />;
    case 'vinyl':           return <StyleVinyl     {...p} />;
    case 'aurora':          return <StyleAurora    {...p} />;
    case 'neon':            return <StyleNeon      {...p} />;
    case 'cassette':        return <StyleCassette  {...p} />;
    case 'pulse':           return <StylePulse     {...p} />;
    case 'particles':       return <StyleParticles {...p} />;
    case 'spectrum':        return <StyleSpectrum  {...p} />;
    case 'simple':          return <StyleSimple    {...p} />;
    // ── Minimal ──
    case 'pill':            return <StylePill           {...p} />;
    case 'banner':          return <StyleBanner         {...p} />;
    case 'ghost':           return <StyleGhost          {...p} />;
    case 'ticker':          return <StyleTicker         {...p} />;
    case 'badge':           return <StyleBadge          {...p} />;
    case 'corner':          return <StyleCorner         {...p} />;
    case 'minimal_dark':    return <StyleMinimalDark    {...p} />;
    case 'outline':         return <StyleOutline        {...p} />;
    case 'frosted':         return <StyleFrosted        {...p} />;
    case 'card_white':      return <StyleCardWhite      {...p} />;
    // ── Animated ──
    case 'wave':            return <StyleWave           {...p} />;
    case 'fire':            return <StyleFire           {...p} />;
    case 'rain':            return <StyleRain           {...p} />;
    case 'plasma':          return <StylePlasma         {...p} />;
    case 'starfield':       return <StyleStarfield      {...p} />;
    case 'fireflies':       return <StyleFireflies      {...p} />;
    case 'glitch':          return <StyleGlitch         {...p} />;
    case 'matrix':          return <StyleMatrix         {...p} />;
    case 'ripple':          return <StyleRipple         {...p} />;
    case 'smoke':           return <StyleSmoke          {...p} />;
    // ── Musical ──
    case 'turntable':       return <StyleTurntable      {...p} />;
    case 'piano':           return <StylePiano          {...p} />;
    case 'waveform':        return <StyleWaveform       {...p} />;
    case 'oscilloscope':    return <StyleOscilloscope   {...p} />;
    case 'vinyl_color':     return <StyleVinylColor     {...p} />;
    case 'spectrum_ring':   return <StyleSpectrumRing   {...p} />;
    case 'metronome':       return <StyleMetronome      {...p} />;
    case 'cassette_mini':   return <StyleCassetteMini   {...p} />;
    case 'boom_box':        return <StyleBoomBox        {...p} />;
    case 'headphones':      return <StyleHeadphones     {...p} />;
    // ── Themed ──
    case 'retro_80s':       return <StyleRetro80s       {...p} />;
    case 'vhs':             return <StyleVHS            {...p} />;
    case 'terminal':        return <StyleTerminal       {...p} />;
    case 'hologram':        return <StyleHologram       {...p} />;
    case 'newspaper':       return <StyleNewspaper      {...p} />;
    case 'polaroid':        return <StylePolaroid       {...p} />;
    case 'cyberpunk':       return <StyleCyberpunk      {...p} />;
    case 'lofi':            return <StyleLofi           {...p} />;
    case 'anime':           return <StyleAnime          {...p} />;
    case 'nature':          return <StyleNature         {...p} />;
    // ── Color/Gradient ──
    case 'sunset':          return <StyleSunset         {...p} />;
    case 'midnight':        return <StyleMidnight       {...p} />;
    case 'cherry':          return <StyleCherry         {...p} />;
    case 'ocean':           return <StyleOcean          {...p} />;
    case 'forest':          return <StyleForest         {...p} />;
    case 'gold':            return <StyleGold           {...p} />;
    case 'cosmic':          return <StyleCosmic         {...p} />;
    case 'candy':           return <StyleCandy          {...p} />;
    case 'lava':            return <StyleLava           {...p} />;
    case 'ice':             return <StyleIce            {...p} />;
    default:                return <StyleGlass          {...p} />;
  }
}
