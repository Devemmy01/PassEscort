import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Logo, Mascot, Text } from '../../components';
import { AMBASSADOR_RULES } from '../../game/referral';
import { palette } from '../../theme';

/** Base artboard (units); everything scales to `width`. */
const W = 340;
const H = 176;
const STUB = 112;
const NOTCH = 12;
/** Width available for the code on the ticket body, in base units. */
const CODE_WIDTH = W - STUB - 22 - 18;
const TRACKING = 2.5;

/** Largest size (≤ 32) at which the code fits on one line. Inter Bold capitals average ~0.72em. */
export function codeFontSize(code: string): number {
  const n = Math.max(1, code.length);
  return Math.min(32, Math.floor((CODE_WIDTH - (n - 1) * TRACKING) / (n * 0.72)));
}

/* A "pass": rounded ticket with perforation notches cut into both edges. */
const TICKET = `M18 0H${STUB - NOTCH}A${NOTCH} ${NOTCH} 0 0 0 ${STUB + NOTCH} 0H${W - 18}Q${W} 0 ${W} 18V${H - 18}Q${W} ${H} ${W - 18} ${H}H${STUB + NOTCH}A${NOTCH} ${NOTCH} 0 0 0 ${STUB - NOTCH} ${H}H18Q0 ${H} 0 ${H - 18}V18Q0 0 18 0Z`;

/**
 * The referral code, drawn as a pass (WK10 — "visual treatment for the
 * referral code itself"). Same artwork in the app, in the starter-kit
 * graphics and on store assets, so a friend recognises it anywhere.
 * Navy ticket, Passy on the stub, the code in wide-tracked white on the body.
 */
export function ReferralCodeCard({ code, width, ambassador = false }: { code: string; width: number; ambassador?: boolean }) {
  const k = width / W;
  const s = (n: number) => n * k;
  return (
    <View style={{ width, height: s(H) }} accessible accessibilityRole="image" accessibilityLabel={`Referral code ${code.split('').join(' ')}`}>
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} width={width} height={s(H)}>
        <Defs>
          <RadialGradient id="tg" cx="0%" cy="50%" r="80%">
            <Stop offset="0" stopColor={palette.sky500} stopOpacity="0.55" />
            <Stop offset="1" stopColor={palette.sky500} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={TICKET} fill={palette.navy900} />
        <Path d={TICKET} fill="url(#tg)" />
        <Line x1={STUB} y1={NOTCH + 6} x2={STUB} y2={H - NOTCH - 6} stroke={palette.white} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="5 6" />
        <Rect x={STUB + 22} y={H - 44} width={W - STUB - 44} height={2} fill={palette.white} fillOpacity={0.12} />
      </Svg>

      <View style={[styles.stub, { width: s(STUB) }]}>
        <Mascot mood="happy" size={s(92)} />
      </View>

      <View style={{ position: 'absolute', left: s(STUB + 22), right: s(18), top: s(22) }}>
        <Text style={{ color: palette.sky100, fontSize: s(11), lineHeight: s(14), fontWeight: '700', letterSpacing: s(1.4) }}>
          {ambassador ? 'AMBASSADOR CODE' : 'MY INVITE CODE'}
        </Text>
        <Text
          numberOfLines={1}
          style={{ color: palette.white, fontSize: s(codeFontSize(code)), lineHeight: s(40), fontWeight: '700', letterSpacing: s(TRACKING), marginTop: s(6) }}
        >
          {code}
        </Text>
        <Text style={{ color: palette.white, fontSize: s(13), lineHeight: s(17), fontWeight: '500', marginTop: s(4), opacity: 0.9 }}>
          Join with it · we both get {AMBASSADOR_RULES.inviteGems} gems
        </Text>
      </View>

      <View style={{ position: 'absolute', left: s(STUB + 22), bottom: s(12) }}>
        <Logo size={s(20)} inverse />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
