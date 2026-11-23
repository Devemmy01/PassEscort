import type { ReactNode } from 'react';
import { StyleSheet, Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, fontFamilyFor, typography, type ColorToken, type TypographyVariant } from '../theme';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

/**
 * The only text primitive screens should use — always token-driven. The
 * effective fontWeight (variant or style override) picks the Inter face, and
 * fontWeight is then reset so Android doesn't faux-bold an already-bold face.
 */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const override = StyleSheet.flatten(style);
  const weight = override?.fontWeight ?? typography[variant].fontWeight;
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        typography[variant] as TextStyle,
        { color: colors[color] },
        align ? { textAlign: align } : null,
        style,
        { fontFamily: fontFamilyFor(weight), fontWeight: 'normal' },
      ]}
    />
  );
}
