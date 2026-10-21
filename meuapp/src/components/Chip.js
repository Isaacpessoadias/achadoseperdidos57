import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Chip({ symbol, label, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, style]}>
      <Text style={styles.text}>{symbol} {label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.shape.small,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: theme.colors.onSecondary,
    fontSize: theme.typography.labelMedium.fontSize,
  },
});
