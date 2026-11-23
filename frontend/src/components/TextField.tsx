import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontFamilyFor, layout, radii, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  helper?: string;
  icon?: IconName;
  /** Renders a show/hide toggle and masks input. */
  password?: boolean;
  disabled?: boolean;
  /** Red border without a message (e.g. when one banner explains several fields). */
  invalid?: boolean;
}

/** Labelled input. States: default, focused, filled, error, disabled. */
export function TextField({ label, error, helper, icon, password = false, disabled = false, invalid = false, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const hasError = Boolean(error) || invalid;
  const borderColor = hasError ? colors.danger : focused ? colors.focus : colors.borderStrong;

  return (
    <View style={styles.wrap}>
      <Text variant="label" color={disabled ? 'disabledText' : 'text'}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          { borderColor, backgroundColor: disabled ? colors.disabledBg : colors.surface },
          focused && !hasError ? styles.focused : null,
        ]}
      >
        {icon ? <Icon name={icon} size={20} color={hasError ? 'dangerText' : focused ? 'primary' : 'textMuted'} /> : null}
        <TextInput
          {...input}
          editable={!disabled}
          secureTextEntry={password && hidden}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, typography.body, { fontFamily: fontFamilyFor(typography.body.fontWeight), color: disabled ? colors.disabledText : colors.text }]}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={12}
          >
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={20} color="textSecondary" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.message}>
          <Icon name="alert" size={16} color="dangerText" />
          <Text variant="bodySm" color="dangerText" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text variant="bodySm" color="textSecondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  field: {
    minHeight: layout.minTouch + 4,
    borderWidth: 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  focused: { backgroundColor: colors.surface },
  input: { flex: 1, paddingVertical: spacing.md, outlineStyle: 'none' } as object,
  message: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
