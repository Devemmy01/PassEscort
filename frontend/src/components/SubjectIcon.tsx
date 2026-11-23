import { View } from 'react-native';
import { SUBJECT_FAMILIES, subjectMeta } from '../practice/subjects';
import { radii } from '../theme';
import { Icon } from './Icon';

/**
 * Subject tile (WK11): the subject's Lucide glyph on its department colour.
 * Decorative next to the subject's name, so it is hidden from screen readers.
 */
export function SubjectIcon({ subject, size = 40 }: { subject: string; size?: number }) {
  const meta = subjectMeta(subject);
  const family = SUBJECT_FAMILIES[meta.family];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: size >= 40 ? radii.md : radii.sm, backgroundColor: family.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={meta.icon} size={Math.round(size * 0.55)} rawColor={family.fg} />
    </View>
  );
}
