import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function TextField({ value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, style }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.onSurface,
    borderRadius: theme.shape.small,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.typography.bodyLarge.fontSize,
  },
});
