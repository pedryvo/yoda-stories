# Sound & Music Specification

*Star Wars: Yoda Stories* utilizes uncompressed 11025 Hz / 22050 Hz 8-bit or 16-bit mono PCM WAV audio for sound effects, character voice chirps (R2-D2, Yoda, Vader breathing), weapons, and musical stings.

## Sound Catalog (`sfx/`)

Key sound files extracted from the original release:
- `opening.wav` - Classic Star Wars Main Title fanfare.
- `youwin.wav` - Victory fanfare upon completing the adventure.
- `tryagain.wav` - Game Over defeat musical theme.
- `cantina.wav` - Mos Eisley Cantina Band theme.
- `emptheme.wav` - Imperial March (Darth Vader's Theme).
- `saber.wav`, `saberout.wav`, `saberswg.wav`, `schwing.wav` - Lightsaber ignition, hum, and slash effects.
- `blaster.wav`, `impblst.wav`, `riflblst.wav` - Blaster rifle and pistol shots.
- `r2d2-1.wav`, `r2d2-2.wav` - R2-D2 vocal beeps and whistles.
- `vader.wav` - Darth Vader mechanical respirator sound.
- `xwingin.wav`, `xwingout.wav`, `xwingby.wav` - Incom T-65 X-Wing starfighter flybys.
- `locator.wav` - Directional homing device ping.

## Modern Web Implementation
Sounds are managed through the Web Audio API with:
- Asynchronous buffer caching.
- Volume balance and dedicated toggles for Sound and Music.
- Positional stereo panning support for monster and vehicle movement.
- Mobile audio unlock on initial touch gesture.
