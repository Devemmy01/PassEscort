import { StyleSheet, View } from 'react-native';
import { MASCOT_MOODS, MASCOT_NAME, MASCOT_POSES } from '../../brand/mascot';
import { AppBar, Card, Icon, ICON_NAMES, Logo, Logomark, Mascot, Row, Screen, SectionHeader, Stack, Tag, Text } from '../../components';
import { useNav } from '../../navigation/Navigator';
import { colors, contrastRatio, palette, radii, spacing, TEXT_PAIRS, type TypographyVariant } from '../../theme';

// Mirrors the Figma "— Colors" board (PE/Colors/* variables).
const SWATCH_GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Brand — Navy Blue',
    items: [
      ['navy950', palette.navy950],
      ['navy900 · primary', palette.navy900],
      ['navy800', palette.navy800],
      ['navy700 · pressed', palette.navy700],
      ['navy100 · track', palette.navy100],
      ['navy50 · soft', palette.navy50],
    ],
  },
  {
    title: 'Brand — Sky Blue',
    items: [
      ['sky700 · link', palette.sky700],
      ['sky600', palette.sky600],
      ['sky500 · accent, XP', palette.sky500],
      ['sky400', palette.sky400],
      ['sky100 · XP pill', palette.sky100],
      ['sky50', palette.sky50],
    ],
  },
  {
    title: 'Functional & rewards',
    items: [
      ['green600 · correct', palette.green600],
      ['red600 · wrong', palette.red600],
      ['amber500 · gold, gems', palette.amber500],
      ['sun', palette.sun],
      ['orange · streak', palette.orange],
    ],
  },
  {
    title: 'Neutrals',
    items: [
      ['white · surface', palette.white],
      ['slate50 · background', palette.slate50],
      ['gray200 · border', palette.gray200],
      ['slate400 · disabled', palette.slate400],
      ['slate500 · secondary', palette.slate500],
      ['slate900 · text', palette.slate900],
    ],
  },
];

const TYPE_SAMPLES: [TypographyVariant, string][] = [
  ['display', 'Display · 32 Bold'],
  ['h1', 'H1 · 28 Bold'],
  ['h2', 'H2 · 22 Bold'],
  ['h3', 'H3 · 18 SemiBold'],
  ['bodyLg', 'Body large · 17 — question text'],
  ['body', 'Body Large · 16 — default reading size'],
  ['bodySm', 'Body · 14 — secondary info'],
  ['label', 'Label · 14 Medium — chips, tabs'],
  ['button', 'Button · 16 Medium'],
  ['caption', 'Caption · 12 Medium — metadata only'],
  ['overline', 'OVERLINE · 12 BOLD'],
  ['mono', '29:41 · 12/40 — tabular numerals'],
];

export default function BrandScreen() {
  const nav = useNav();
  return (
    <Screen header={<AppBar title="Brand identity" subtitle="WK 01" onBack={nav.back} />}>
      <Stack gap={spacing.lg}>
        <SectionHeader title="Logo" />
        <Card>
          <Stack gap={spacing.lg}>
            <Logo size={44} />
            <View style={styles.inverse}>
              <Logo size={44} inverse />
            </View>
            <Row gap={spacing.lg} style={{ alignItems: 'flex-end' }}>
              <Logomark size={96} />
              <Logomark size={48} />
              <Logomark size={32} />
              <Logomark size={20} />
            </Row>
            <Text variant="bodySm" color="textSecondary">
              Mark: a navy "D" with two sky pills, from Figma (Splash Screen 62:574), redrawn as vectors so it is sharp at every size and
              generates the app icon. Minimum height 20dp. Clear space = one pill's height on every side. The wordmark is Figma artwork
              in a custom geometric face (assets/brand); never retype it in Inter.
            </Text>
          </Stack>
        </Card>

        <SectionHeader title="Colour" />
        {SWATCH_GROUPS.map((g) => (
          <Card key={g.title} padding="md">
            <Text variant="label" style={{ marginBottom: spacing.sm }}>
              {g.title}
            </Text>
            <View style={styles.swatches}>
              {g.items.map(([name, hex]) => (
                <View key={name} style={styles.swatch}>
                  <View style={[styles.chip, { backgroundColor: hex }]} />
                  <Text variant="caption">{name}</Text>
                  <Text variant="caption" color="textSecondary">
                    {hex}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ))}

        <Card padding="md">
          <Text variant="label">Contrast audit (live from tokens)</Text>
          <Text variant="bodySm" color="textSecondary" style={{ marginBottom: spacing.sm }}>
            Every shipped text pair clears WCAG AA 4.5:1 — enforced by a unit test, because cheap LCDs crush mid-tones.
          </Text>
          {TEXT_PAIRS.map(([fg, bg]) => {
            const ratio = contrastRatio(colors[fg], colors[bg]);
            return (
              <View key={`${fg}-${bg}`} style={[styles.pair, { backgroundColor: colors[bg] }]}>
                <Text variant="label" color={fg} style={{ flex: 1 }}>
                  {fg} on {bg}
                </Text>
                <Tag label={`${ratio.toFixed(1)}:1`} tone={ratio >= 7 ? 'success' : 'info'} />
              </View>
            );
          })}
        </Card>

        <SectionHeader title="Typography" />
        <Card>
          <Stack gap={spacing.md}>
            {TYPE_SAMPLES.map(([variant, sample]) => (
              <Text key={variant} variant={variant}>
                {sample}
              </Text>
            ))}
            <Text variant="bodySm" color="textSecondary">
              Inter (Figma PE/Typography), four weights. No weights below 400; running text never below 16; captions only for
              non-essential metadata. Line heights are 1.25–1.5× so Android never clips descenders.
            </Text>
          </Stack>
        </Card>

        <SectionHeader title={`Mascot — ${MASCOT_NAME} the owl`} />
        <Card>
          <Text variant="body" color="textSecondary" style={{ marginBottom: spacing.md }}>
            {MASCOT_NAME} is your learning partner. Screens ask for a mood, never a file, so the art can change without touching
            them. There is no sad Passy: setbacks get the encouraging thumbs-up and a next step.
          </Text>
          <View style={styles.moods}>
            {MASCOT_MOODS.map((m) => (
              <View key={m} style={styles.mood}>
                <Mascot mood={m} size={96} />
                <Text variant="label">{m}</Text>
                <Text variant="caption" color="textSecondary" align="center">
                  {MASCOT_POSES[m].usage}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <SectionHeader title="Iconography" />
        <Card padding="md">
          <View style={styles.icons}>
            {ICON_NAMES.map((name) => (
              <View key={name} style={styles.iconCell}>
                <Icon name={name} size={24} />
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="bodySm" color="textSecondary">
            24dp grid, 2px rounded strokes. Flame, bolt, star and gem are filled when "active".
          </Text>
        </Card>

        <SectionHeader title="Spacing & radii" />
        <Card>
          <Stack gap={spacing.sm}>
            {[2, 4, 8, 12, 16, 24, 32, 48].map((s) => (
              <Row key={s}>
                <Text variant="caption" style={{ width: 32 }}>
                  {s}
                </Text>
                <View style={{ width: s * 4, height: 12, borderRadius: 3, backgroundColor: colors.primary }} />
              </Row>
            ))}
            <Row gap={spacing.md} style={{ marginTop: spacing.sm }}>
              {Object.entries(radii)
                .filter(([k]) => k !== 'pill')
                .map(([k, r]) => (
                  <View key={k} style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 52, height: 52, borderRadius: r, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }} />
                    <Text variant="caption">
                      {k} {r}
                    </Text>
                  </View>
                ))}
            </Row>
          </Stack>
        </Card>

        <SectionHeader title="Low-end device rules" />
        <Card tone="gold">
          <Stack gap={spacing.sm}>
            {[
              'Depth = solid 3–4dp "ledges", never blurred shadows (cheap GPUs + muddy panels).',
              'All interactive targets ≥ 48dp; options are full-width.',
              'Correct/wrong always pairs colour with an icon (✓ / ✕).',
              'Animations use transform + opacity only (native driver); none are required to understand state.',
              'Mark and icons are vectors; Passy ships as 512px palette PNGs (~35 KB per pose, ~300 KB for all eight).',
              'Checked at 360dp wide, with a 1.4× font-scale cap.',
            ].map((rule) => (
              <Row key={rule} style={{ alignItems: 'flex-start' }}>
                <Icon name="check" size={18} color="warningText" strokeWidth={3} />
                <Text variant="bodySm" color="text" style={{ flex: 1 }}>
                  {rule}
                </Text>
              </Row>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inverse: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 96, gap: 2 },
  chip: { height: 48, borderRadius: radii.sm, borderWidth: 2, borderColor: colors.border },
  pair: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radii.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  moods: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.lg },
  mood: { width: '48%', alignItems: 'center', gap: 2 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  iconCell: { width: 64, alignItems: 'center', gap: 4, paddingVertical: spacing.xs },
});
