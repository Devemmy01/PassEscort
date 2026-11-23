import { StyleSheet, View } from 'react-native';
import { AppBar, Card, Row, Screen, SectionHeader, Stack, SubjectIcon, Tag, Text } from '../../components';
import { useNav } from '../../navigation/Navigator';
import { countQuestions } from '../../practice/questions';
import { knownSubjects, SUBJECT_FAMILIES, subjectMeta, type SubjectFamily } from '../../practice/subjects';
import { spacing } from '../../theme';

/** WK11 reference: every subject's glyph, department colour and short label. */
export default function SubjectsScreen() {
  const nav = useNav();
  const families = Object.keys(SUBJECT_FAMILIES) as SubjectFamily[];
  return (
    <Screen header={<AppBar onBack={nav.back} title="Subjects" subtitle="Iconography · WK 11" />}>
      <Stack gap={spacing.lg}>
        <Text variant="body" color="textSecondary">
          One Lucide glyph per subject on its department colour, used everywhere a subject appears. Figma's ten subjects keep Figma's glyphs;
          the rest extend the same family. Colour is never the only cue — the glyph and name always travel with it.
        </Text>
        {families.map((f) => {
          const subjects = knownSubjects().filter((s) => subjectMeta(s).family === f);
          return (
            <View key={f} style={{ gap: spacing.sm }}>
              <SectionHeader title={SUBJECT_FAMILIES[f].label} />
              <Card padding="md">
                <View style={styles.grid}>
                  {subjects.map((s) => {
                    const meta = subjectMeta(s);
                    const count = countQuestions(['JAMB', 'WAEC', 'NECO'], s);
                    return (
                      <View key={s} style={styles.cell}>
                        <SubjectIcon subject={s} size={48} />
                        <Text variant="label" align="center" numberOfLines={2}>
                          {s}
                        </Text>
                        <Row gap={spacing.xxs} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Tag label={meta.source === 'figma' ? 'Figma' : 'Extended'} tone={meta.source === 'figma' ? 'primary' : 'neutral'} />
                        </Row>
                        <Text variant="caption" color="textSecondary" align="center">
                          {count ? `${count} questions` : 'No questions yet'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </View>
          );
        })}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  cell: { width: '33.33%', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
});
