import { StyleSheet, View } from 'react-native';
import { Button, Icon, Logo, Mascot, Row, Screen, Stack, Text, type IconName } from '../../components';
import { useNav } from '../../navigation/Navigator';
import { bankCoverage } from '../../practice/questions';
import { colors, radii, spacing } from '../../theme';

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'book', text: `${bankCoverage().countLabel} JAMB, WAEC & NECO questions with answers` },
  { icon: 'wifiOff', text: 'Works offline — no data wahala' },
  { icon: 'swords', text: 'Duel friends, earn XP & badges' },
];

export default function WelcomeScreen() {
  const nav = useNav();
  return (
    <Screen
      footer={
        <>
          <Button title="Get started" iconRight="arrowRight" onPress={() => nav.push('OnboardExam')} />
          <Button title="I already have an account" variant="ghost" onPress={() => nav.push('Login')} />
        </>
      }
    >
      <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.xl }}>
        <Logo size={36} />
        <View style={styles.hero}>
          <Mascot mood="happy" size={180} />
          <View style={styles.bubble}>
            <Text variant="bodyStrong">Hi! I'm Passy. I'll escort you all the way to exam day.</Text>
          </View>
        </View>
        <Text variant="h1" align="center">
          Pass JAMB, WAEC & NECO — one question at a time
        </Text>
        <Stack gap={spacing.sm} style={{ alignSelf: 'stretch' }}>
          {POINTS.map((p) => (
            <Row key={p.text} gap={spacing.md}>
              <View style={styles.pointIcon}>
                <Icon name={p.icon} size={20} color="primary" />
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {p.text}
              </Text>
            </Row>
          ))}
        </Stack>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    maxWidth: 300,
    marginTop: -spacing.sm,
  },
  pointIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
