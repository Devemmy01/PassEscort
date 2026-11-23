import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BadgeMedal, Logo, Mascot, Text, TierShield } from '../../components';
import { badgeById } from '../../game/badges';
import { duelWon, fitFontSize, SHARE_CARD_BASE, tierArtFor, type ShareCardData } from '../../social/shareCards';
import { colors, palette } from '../../theme';

const BOOKS = require('../../../assets/brand/books.png');

/** Card-surface colours that only exist on share cards (artwork, not UI). */
const CARD = {
  navyPanel: palette.navy800,
  inkPanel: '#111A2E',
  white: palette.white,
  skyText: palette.sky400,
} as const;

/**
 * One share card, drawn from Figma "Social Sharing Cards" (frames 71–73,
 * 609 × 696). Every measurement below is in those Figma units and scaled to
 * `width`, so the on-screen preview and the 1080-wide export are the same
 * drawing.
 *
 * Score, streak and level follow Figma. Badge reuses the level layout with
 * the coded medal. Duel has no Figma frame; it follows the score card's
 * system (navy panel, white lockup, CTA pill).
 */
export function ShareCardView({ data, width, link }: { data: ShareCardData; width: number; link: string }) {
  const k = width / SHARE_CARD_BASE.width;
  const s = (n: number) => Math.round(n * k * 10) / 10;
  const height = s(SHARE_CARD_BASE.height);
  const frame = { width, height };

  switch (data.kind) {
    case 'score':
      return (
        <CardFrame frame={frame} k={k} background={<ScoreBackground k={k} />} label={`Score card: ${data.percent}% in ${data.examBody} ${data.subject}`}>
          <View style={{ position: 'absolute', left: s(81), top: s(140), width: s(480) }}>
            <Big text="I just scored" size={s(29)} weight="600" />
            <Text numberOfLines={1} style={{ color: CARD.white, fontSize: s(150), lineHeight: s(166), fontWeight: '700', letterSpacing: -s(6) }}>
              {data.percent}
              <Text style={{ color: CARD.skyText, fontSize: s(150), lineHeight: s(166), fontWeight: '700' }}>%</Text>
            </Text>
          </View>
          <View style={{ position: 'absolute', left: s(81), top: s(318), width: s(250) }}>
            <Big
              text={`in ${data.examBody} ${data.subject}`}
              size={s(fitFontSize(`in ${data.examBody} ${data.subject}`, 250, 29, 22))}
              weight="700"
              lines={2}
            />
            <Cta k={k} prompt="Think you can beat me?" label="Challenge me" link={link} />
          </View>
          <Image source={BOOKS} style={{ position: 'absolute', left: s(326), top: s(478), width: s(96), height: s(92) }} />
          <View style={{ position: 'absolute', right: s(22), top: s(318) }}>
            <Mascot mood="trophy" size={s(268)} />
          </View>
          <Lockup k={k} inverse />
        </CardFrame>
      );

    case 'streak':
      return (
        <CardFrame frame={frame} k={k} background={<StreakBackground k={k} />} label={`Streak card: ${data.days}-day learning streak`}>
          <View style={{ position: 'absolute', left: s(81), top: s(190), width: s(260) }}>
            <Big text="I'm on a" size={s(27)} weight="600" color={palette.slate900} />
            <Text
              style={{
                color: palette.orange600,
                fontSize: s(fitFontSize(String(data.days), 230, 168, 112)),
                lineHeight: s(176),
                fontWeight: '700',
                letterSpacing: -s(6),
              }}
            >
              {data.days}
            </Text>
            <Big text="Day learning streak! 🔥" size={s(28)} weight="700" color={palette.slate900} lines={2} />
          </View>
          <View style={{ position: 'absolute', right: s(10), top: s(150) }}>
            <Mascot mood="wow" size={s(300)} />
          </View>
          <Lockup k={k} />
        </CardFrame>
      );

    case 'level':
    case 'badge': {
      const badge = data.kind === 'badge' ? badgeById(data.badgeId) : undefined;
      const title = data.kind === 'level' ? data.title : (badge?.name ?? 'New badge');
      const tier = data.kind === 'level' ? tierArtFor(data.title) : null;
      const intro =
        data.kind === 'badge' ? 'I just unlocked a new badge.' : tier ? 'I just unlocked a new level badge.' : `I just reached Level ${data.level}.`;
      return (
        <CardFrame frame={frame} k={k} background={<GlowBackground k={k} glow={palette.green600} />} label={`${title} card`}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: s(104), alignItems: 'center' }}>
            {tier ? (
              <TierShield tier={tier} size={s(212)} label={title} />
            ) : badge ? (
              <BadgeMedal icon={badge.icon} tier={badge.tier} size={s(212)} />
            ) : (
              <Mascot mood="cheer" size={s(226)} />
            )}
          </View>
          <View style={{ position: 'absolute', left: s(40), right: s(40), top: s(346), alignItems: 'center' }}>
            <Big text={intro} size={s(18)} weight="500" align="center" />
            <Text
              align="center"
              numberOfLines={1}
              style={{ color: CARD.white, fontSize: s(fitFontSize(title.toUpperCase(), 520, 74, 40)), lineHeight: s(88), fontWeight: '700', letterSpacing: -s(1) }}
            >
              {title.toUpperCase()}
            </Text>
            {data.kind === 'level' && tier ? <Big text={`Level ${data.level}`} size={s(18)} weight="600" align="center" color={CARD.skyText} /> : null}
          </View>
          {tier || badge ? (
            <View style={{ position: 'absolute', right: s(70), top: s(470) }}>
              <Mascot mood="cheer" size={s(118)} />
            </View>
          ) : null}
          <Lockup k={k} inverse />
        </CardFrame>
      );
    }

    case 'duel': {
      const won = duelWon(data);
      const them = data.opponent.split(' ')[0] ?? data.opponent;
      const headline = won ? `I beat ${them}` : `${them} edged it`;
      return (
        <CardFrame frame={frame} k={k} background={<ScoreBackground k={k} />} label={`Duel card: ${data.myScore} to ${data.theirScore} against ${them}`}>
          <View style={{ position: 'absolute', left: s(81), top: s(120), width: s(450) }}>
            <View style={[styles.pill, { backgroundColor: won ? colors.gold : palette.slate100, paddingHorizontal: s(14), height: s(32), borderRadius: s(16) }]}>
              <Text style={{ color: palette.slate900, fontSize: s(15), lineHeight: s(20), fontWeight: '700', letterSpacing: s(1.5) }}>
                {won ? 'VICTORY' : 'GOOD FIGHT'}
              </Text>
            </View>
            <Big text={headline} size={s(fitFontSize(headline, 440, 40, 30))} weight="700" style={{ marginTop: s(18) }} />
            <Text style={{ color: CARD.white, fontSize: s(96), lineHeight: s(112), fontWeight: '700', letterSpacing: -s(3) }}>
              {data.myScore}
              <Text style={{ color: CARD.skyText, fontSize: s(96), lineHeight: s(112), fontWeight: '700' }}>–{data.theirScore}</Text>
            </Text>
            <Big text={`in ${data.subject}`} size={s(fitFontSize(`in ${data.subject}`, 260, 28, 22))} weight="700" lines={2} style={{ width: s(260) }} />
            <View style={{ width: s(250) }}>
              <Cta k={k} prompt={won ? 'Think you can beat me?' : 'Fancy a duel?'} label="Duel me" link={link} />
            </View>
          </View>
          <View style={{ position: 'absolute', right: s(18), top: s(330) }}>
            <Mascot mood={won ? 'cheer' : 'sad'} size={s(250)} />
          </View>
          <Lockup k={k} inverse />
        </CardFrame>
      );
    }
  }
}

/* ------------------------------------------------------------------ */

function CardFrame({
  frame,
  k,
  background,
  label,
  children,
}: {
  frame: { width: number; height: number };
  k: number;
  background: ReactNode;
  label: string;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.card, frame, { borderRadius: 18 * k }]} accessible accessibilityRole="image" accessibilityLabel={label}>
      {background}
      {children}
    </View>
  );
}

function Big({
  text,
  size,
  weight,
  color = CARD.white,
  align,
  lines,
  style,
}: {
  text: string;
  size: number;
  weight: '500' | '600' | '700';
  color?: string;
  align?: 'center';
  lines?: number;
  style?: object;
}) {
  return (
    <Text align={align} numberOfLines={lines} style={[{ color, fontSize: size, lineHeight: Math.round(size * 1.22), fontWeight: weight }, style]}>
      {text}
    </Text>
  );
}

/** "Think you can beat me?" + pill + the short link (a Status image can't be tapped). */
function Cta({ k, prompt, label, link }: { k: number; prompt: string; label: string; link: string }) {
  const s = (n: number) => n * k;
  return (
    <View style={{ marginTop: s(22), gap: s(8), alignItems: 'flex-start' }}>
      <Text style={{ color: CARD.white, fontSize: s(16), lineHeight: s(21), fontWeight: '500' }}>{prompt}</Text>
      {/* Figma draws this pill in Sky 500 (3.75:1 with white); Sky 700 clears AA. */}
      <View style={[styles.pill, { backgroundColor: palette.sky700, height: s(46), paddingHorizontal: s(28), borderRadius: s(23) }]}>
        <Text style={{ color: CARD.white, fontSize: s(16), lineHeight: s(20), fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ color: CARD.white, fontSize: s(14), lineHeight: s(18), fontWeight: '500', opacity: 0.85 }}>{link.replace(/^https?:\/\//, '')}</Text>
    </View>
  );
}

function Lockup({ k, inverse = false }: { k: number; inverse?: boolean }) {
  return (
    <View style={{ position: 'absolute', left: 72 * k, top: 549 * k }}>
      <Logo size={36 * k} inverse={inverse} />
    </View>
  );
}

/* Backgrounds — plain SVG, so they render the same on device, web and in the export. */

function ScoreBackground({ k }: { k: number }) {
  const W = SHARE_CARD_BASE.width;
  const H = SHARE_CARD_BASE.height;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} width={W * k} height={H * k}>
      <Defs>
        <RadialGradient id="g" cx="50%" cy="0%" r="70%">
          <Stop offset="0" stopColor={palette.sky500} stopOpacity="0.45" />
          <Stop offset="1" stopColor={palette.sky500} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width={W} height={H} fill={palette.navy900} />
      <Rect width={W} height={H} fill="url(#g)" />
      <Rect x={34} y={59} width={541} height={578} rx={22} fill={CARD.navyPanel} />
      {[200, 400].map((x) => (
        <Line key={x} x1={x} y1={59} x2={x} y2={637} stroke={palette.white} strokeOpacity={0.06} strokeWidth={1.5} />
      ))}
      <Line x1={34} y1={180} x2={330} y2={637} stroke={palette.white} strokeOpacity={0.05} strokeWidth={1.5} />
      <Line x1={330} y1={59} x2={575} y2={440} stroke={palette.white} strokeOpacity={0.05} strokeWidth={1.5} />
    </Svg>
  );
}

function StreakBackground({ k }: { k: number }) {
  const W = SHARE_CARD_BASE.width;
  const H = SHARE_CARD_BASE.height;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} width={W * k} height={H * k}>
      <Defs>
        <LinearGradient id="o" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.amber500} />
          <Stop offset="1" stopColor={palette.orange} />
        </LinearGradient>
      </Defs>
      <Rect width={W} height={H} fill="url(#o)" />
      <Rect x={32} y={59} width={545} height={578} rx={22} fill={palette.white} />
    </Svg>
  );
}

const CONFETTI: [number, number, number, number, number, string][] = [
  [60, 80, 14, 22, -30, '#F472B6'],
  [130, 210, 18, 18, 45, palette.sun],
  [80, 300, 12, 12, 0, '#4ADE80'],
  [175, 150, 10, 16, 20, palette.sky400],
  [470, 70, 22, 6, 10, palette.sun],
  [540, 160, 16, 16, 30, '#A78BFA'],
  [520, 260, 12, 20, -20, '#F472B6'],
  [560, 340, 10, 10, 0, '#A78BFA'],
  [100, 420, 14, 14, 45, palette.sky400],
  [495, 420, 10, 18, 15, palette.sun],
];

function GlowBackground({ k, glow }: { k: number; glow: string }) {
  const W = SHARE_CARD_BASE.width;
  const H = SHARE_CARD_BASE.height;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} width={W * k} height={H * k}>
      <Defs>
        <RadialGradient id="gl" cx="50%" cy="0%" r="65%">
          <Stop offset="0" stopColor={glow} stopOpacity="0.55" />
          <Stop offset="1" stopColor={glow} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width={W} height={H} fill={palette.slate900} />
      <Rect width={W} height={H} fill="url(#gl)" />
      <Rect x={34} y={59} width={541} height={578} rx={22} fill={CARD.inkPanel} fillOpacity={0.7} />
      {CONFETTI.map(([x, y, w, h, r, c], i) =>
        i % 3 === 2 ? (
          <Circle key={i} cx={x} cy={y} r={w / 2} fill={c} />
        ) : (
          <Rect key={i} x={x} y={y} width={w} height={h} rx={2} fill={c} transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`} />
        ),
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  pill: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
});
