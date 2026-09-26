import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, shapes, elevation } from '../theme/index';

export default function AvatarButton({ source, onPress, accessibilityLabel = 'Abrir perfil' }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Image source={source} style={styles.avatar} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: shapes.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.outline,
    ...elevation.level1,
  },
});