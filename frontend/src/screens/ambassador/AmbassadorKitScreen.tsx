import * as Clipboard from 'expo-clipboard';
import { useMemo, useRef, useState } from 'react';
import { Linking, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { AppBar, Button, Card, Icon, Logo, Mascot, Row, Screen, SectionHeader, SegmentedControl, Stack, Text } from '../../components';
import { AMBASSADOR_RULES } from '../../game/referral';
import { useNav } from '../../navigation/Navigator';
import { kitTemplates, nextExamYear, type KitTemplate } from '../../social/ambassadorKit';
import { referralLink, waMeUrl } from '../../social/links';
import { bankCoverage } from '../../practice/questions';
import { useApp } from '../../state/AppState';
import { shareImage } from '../../social/exportImage';
import { colors, layout, palette, radii, spacing } from '../../theme';
import { ReferralCodeCard } from './ReferralCodeCard';

export type KitGraphic = 'status' | 'square' | 'pass';

/** Artboards in base units, and the size each one is exported at. */
export const KIT_GRAPHICS: Record<KitGraphic, { label: string; base: [number, number]; export: [number, number]; use: string }> = {
  status: { label: 'Status', base: [360, 640], export: [1080, 1920], use: 'WhatsApp Status, Instagram & TikTok stories' },
  square: { label: 'Post', base: [360, 360], export: [1080, 1080], use: 'Class groups, Instagram feed, X' },
  pass: { label: 'Pass only', base: [360, 200], export: [1080, 600], use: 'Profile pictures, DMs, printing' },
};

// One line each at 16 units in a 312-unit column, so Passy can sit below them.
const POINTS = [`${bankCoverage().countLabel} questions with answers`, 'JAMB CBT practice with a timer', 'Works offline once downloaded'];

/**
 * One starter-kit graphic. Drawn in base units and scaled to `width`, like
 * the share cards, so the preview and the export are the same artwork.
 */
export function KitGraphicView({ kind, code, width, year }: { kind: KitGraphic; code: string; width: number; year: number }) {
  const [bw, bh] = KIT_GRAPHICS[kind].base;
  const k = width / bw;
  const s = (n: number) => n * k;
  const link = referralLink(code).replace(/^https?:\/\//, '');

  if (kind === 'pass') {
    return (
      <View style={[styles.art, { width, height: s(bh), backgroundColor: palette.slate50, alignItems: 'center', justifyContent: 'center' }]}>
        <ReferralCodeCard code={code} width={s(320)} ambassador />
      </View>
    );
  }

  const dark = kind === 'status';
  const fg = dark ? palette.white : palette.slate900;
  return (
    <View
      style={[styles.art, { width, height: s(bh), borderRadius: s(16) }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Starter kit ${KIT_GRAPHICS[kind].label} graphic with code ${code}`}
    >
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${bw} ${bh}`} width={width} height={s(bh)}>
        <Defs>
          <RadialGradient id="kg" cx="80%" cy="35%" r="70%">
            <Stop offset="0" stopColor={palette.sky500} stopOpacity={dark ? 0.5 : 0.22} />
            <Stop offset="1" stopColor={palette.sky500} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={bw} height={bh} fill={dark ? palette.navy900 : palette.slate50} />
        <Rect width={bw} height={bh} fill="url(#kg)" />
      </Svg>

      <View style={{ position: 'absolute', left: s(24), top: s(24) }}>
        <Logo size={s(26)} inverse={dark} />
      </View>

      {kind === 'status' ? (
        <>
          <View style={{ position: 'absolute', left: s(24), right: s(24), top: s(84) }}>
            <Text style={{ color: palette.sky100, fontSize: s(14), lineHeight: s(18), fontWeight: '700', letterSpacing: s(1.4) }}>JAMB · WAEC · NECO {year}</Text>
            <Text style={{ color: fg, fontSize: s(38), lineHeight: s(44), fontWeight: '700', marginTop: s(8), letterSpacing: -s(0.5) }}>Study with me on PassEscort</Text>
            <View style={{ gap: s(10), marginTop: s(20) }}>
              {POINTS.map((p) => (
                <Row key={p} gap={s(10)}>
                  <View style={[styles.tick, { width: s(24), height: s(24), borderRadius: s(12) }]}>
                    <Icon name="check" size={s(15)} rawColor={palette.navy900} strokeWidth={3} />
                  </View>
                  <Text style={{ color: fg, fontSize: s(16), lineHeight: s(21), fontWeight: '500' }}>{p}</Text>
                </Row>
              ))}
            </View>
          </View>
          {/* Bullets end at ~310; Passy 292–442 at the right; ticket (320 wide → 166 tall) 448–614; link 620–638. */}
          <View style={{ position: 'absolute', right: s(8), top: s(292) }}>
            <Mascot mood="happy" size={s(150)} />
          </View>
          <View style={{ position: 'absolute', left: s(20), top: s(448) }}>
            <ReferralCodeCard code={code} width={s(320)} ambassador />
          </View>
          <Text style={{ position: 'absolute', left: 0, right: 0, top: s(620), color: fg, textAlign: 'center', fontSize: s(14), lineHeight: s(18), fontWeight: '600' }}>
            Join free → {link}
          </Text>
        </>
      ) : (
        <>
          <View style={{ position: 'absolute', left: s(24), top: s(70), width: s(200) }}>
            <Text style={{ color: fg, fontSize: s(28), lineHeight: s(33), fontWeight: '700', letterSpacing: -s(0.5) }}>{year} exams? Let's prepare together.</Text>
            <Text style={{ color: palette.slate600, fontSize: s(14), lineHeight: s(19), fontWeight: '500', marginTop: s(8) }}>
              Free practice questions, timed CBT practice and quiz duels.
            </Text>
          </View>
          <View style={{ position: 'absolute', right: s(2), top: s(48) }}>
            <Mascot mood="think" size={s(150)} />
          </View>
          <View style={{ position: 'absolute', left: s(20), top: s(186) }}>
            <ReferralCodeCard code={code} width={s(320)} ambassador />
          </View>
        </>
      )}
    </View>
  );
}

export default function AmbassadorKitScreen() {
  const nav = useNav();
  const { state } = useApp();
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<KitGraphic>('status');
  const [copied, setCopied] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const graphicRef = useRef<View>(null);
  const code = state.referralCode;
  const link = referralLink(code);
  const today = useMemo(() => new Date(), []);
  const year = nextExamYear(today);
  const templates = useMemo(
    () => kitTemplates({ firstName: state.profile.name.split(' ')[0] ?? '', code, link, today, questionCount: bankCoverage().countLabel }),
    [state.profile.name, code, link, today],
  );
  const meta = KIT_GRAPHICS[kind];
  const tablet = width >= layout.tabletBreakpoint;
  const previewWidth = Math.min(width - 32, kind === 'status' ? (tablet ? 360 : 260) : tablet ? 480 : 340);
  const caption = templates.find((t) => t.channel === 'status')!.text;

  const copy = async (t: KitTemplate) => {
    await Clipboard.setStringAsync(t.text);
    setCopied(t.channel);
  };

  return (
    <Screen header={<AppBar onBack={nav.back} title="Starter kit" subtitle={`Code ${code}`} />}>
      <Stack gap={spacing.lg}>
        <Text variant="body" color="textSecondary">
          Ready-made graphics and messages with your code already in them. Post, paste, done.
        </Text>

        <SectionHeader title="Graphics" />
        <SegmentedControl
          options={(Object.keys(KIT_GRAPHICS) as KitGraphic[]).map((g) => ({ value: g, label: KIT_GRAPHICS[g].label }))}
          value={kind}
          onChange={setKind}
        />
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View ref={graphicRef} collapsable={false}>
            <KitGraphicView kind={kind} code={code} width={previewWidth} year={year} />
          </View>
          <Text variant="caption" color="textSecondary" align="center">
            {meta.export[0]}×{meta.export[1]} · {meta.use}
          </Text>
        </View>
        <Button
          title="Share this graphic"
          icon="share"
          loading={sharing}
          onPress={async () => {
            setSharing(true);
            await shareImage(graphicRef, { width: meta.export[0], height: meta.export[1] }, caption, 'Share your code');
            setSharing(false);
          }}
        />

        <SectionHeader title="Messages" />
        {templates.map((t) => (
          <Card key={t.channel} padding="md">
            <Stack gap={spacing.sm}>
              <View>
                <Text variant="bodyStrong">{t.title}</Text>
                <Text variant="bodySm" color="textSecondary">
                  {t.hint}
                </Text>
              </View>
              <View style={styles.bubble}>
                <Text variant="bodySm">{t.text}</Text>
              </View>
              <Row gap={spacing.sm}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={copied === t.channel ? 'Copied' : 'Copy'}
                    icon={copied === t.channel ? 'check' : 'copy'}
                    variant="secondary"
                    size="sm"
                    onPress={() => void copy(t)}
                  />
                </View>
                {t.channel === 'whatsapp-dm' || t.channel === 'whatsapp-group' ? (
                  <View style={{ flex: 1 }}>
                    <Button title="WhatsApp" icon="message" variant="whatsapp" size="sm" onPress={() => void Linking.openURL(waMeUrl(t.text)).catch(() => Share.share({ message: t.text }))} />
                  </View>
                ) : null}
              </Row>
            </Stack>
          </Card>
        ))}

        <Card tone="soft" padding="md">
          <Stack gap={spacing.xs}>
            <Text variant="label" color="primary">
              Ambassador do's and don'ts
            </Text>
            {[
              'Do share with people you know: classmates, lesson groups, your Status.',
              `Do tell friends about the ${AMBASSADOR_RULES.inviteGems} gems — it's a real reward for them too.`,
              "Don't spam groups you're not in, and don't run paid ads with the PassEscort name.",
              "Don't promise grades. PassEscort helps you practise; the results are the student's.",
            ].map((r) => (
              <Text key={r} variant="bodySm" color="text">
                • {r}
              </Text>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { overflow: 'hidden' },
  tick: { backgroundColor: palette.sky400, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    borderTopLeftRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.successSoftBorder,
  },
});
