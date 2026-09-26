import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, shapes, elevation, spacing } from '../theme';

export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: shapes.borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    ...elevation.level1,
  },
  text: {
    color: colors.onPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  disabled: {
    backgroundColor: colors.outline,
  },
});
