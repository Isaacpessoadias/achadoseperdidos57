import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function TopNavigation({ activeView, setActiveView, profileImage, DEFAULT_PROFILE_IMAGE }) {
  return (
    <View style={styles.navContainer}>
      <View style={styles.tabGroup}>
        <TouchableOpacity
          style={[styles.tabButton, activeView === 'lost' && styles.active]}
          onPress={() => setActiveView('lost')}
        >
          <Text style={styles.tabText}>Itens Perdidos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeView === 'found' && styles.active]}
          onPress={() => setActiveView('found')}
        >
          <Text style={styles.tabText}>Itens Achados</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeView === 'profile' && styles.active]}
          onPress={() => setActiveView('profile')}
        >
          <Text style={styles.tabText}>Perfil</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => setActiveView('profile')} style={styles.avatarButton}>
        <Image
          source={profileImage ? { uri: profileImage } : DEFAULT_PROFILE_IMAGE}
          style={styles.avatar}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tabGroup: {
    flexDirection: 'row',
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  active: {
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  tabText: {
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  avatarButton: {
    borderWidth: 2,
    borderColor: colors.outline,
    borderRadius: 30,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
