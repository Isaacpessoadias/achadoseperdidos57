import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function ButtonPrimary({ onPress, disabled, children, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, style, disabled && styles.disabled]}
    >
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.shape.medium,
    elevation: theme.elevation.low,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: theme.colors.onPrimary,
    fontSize: theme.typography.bodyLarge.fontSize,
    fontWeight: theme.typography.bodyLarge.fontWeight,
  },
  disabled: {
    opacity: 0.5,
  },
});
