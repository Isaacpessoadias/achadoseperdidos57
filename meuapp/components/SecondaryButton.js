import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, shapes, elevation, spacing } from '../theme';

export default function SecondaryButton({ title, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.outline,
    borderRadius: shapes.borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    ...elevation.level1,
  },
  text: {
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});