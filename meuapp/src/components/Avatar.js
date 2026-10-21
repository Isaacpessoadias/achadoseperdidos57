import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Avatar({ uri, fallback, size = 48, style }) {
  const source = uri ? { uri } : fallback;
  return (
    <Image source={source} style={[styles.avatar, { width: size, height: size }, style]}/>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: theme.shape.large,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
});
