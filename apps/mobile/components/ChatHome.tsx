import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radius, spacing } from '../theme/theme';

interface ChatHomeProps {
  onQuickAction: (action: string) => void;
}

export function ChatHome({ onQuickAction }: ChatHomeProps) {
  const hour = new Date().getHours();
  let greeting = 'Good morning,';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon,';
  else if (hour >= 17) greeting = 'Good evening,';

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.brandTitle}>
        I'm <Text style={styles.brandHighlight}>sutra.</Text>
      </Text>
      
      <Text style={styles.subtitle}>
        Control your PC, just a message away.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onQuickAction('What is currently visible on my PC screen?')} activeOpacity={0.7}>
          <Ionicons name="scan-circle-outline" size={18} color="#FF6E5F" style={styles.actionIcon} />
          <Text style={styles.actionText}>Tutor Screen</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onQuickAction('Take a screenshot of my PC')} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={18} color="#38BDF8" style={styles.actionIcon} />
          <Text style={styles.actionText}>Screenshot</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onQuickAction('Trim silence in my latest video with AiCut')} activeOpacity={0.7}>
          <Ionicons name="cut-outline" size={18} color="#EC4899" style={styles.actionIcon} />
          <Text style={styles.actionText}>AiCut Video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onQuickAction('Summarize recent discussions on WhatsApp')} activeOpacity={0.7}>
          <Ionicons name="chatbubbles-outline" size={18} color="#22C55E" style={styles.actionIcon} />
          <Text style={styles.actionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onQuickAction('Search knowledge hub notebooks for ')} activeOpacity={0.7}>
          <Ionicons name="book-outline" size={18} color="#FBBF24" style={styles.actionIcon} />
          <Text style={styles.actionText}>Notebook RAG</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onQuickAction('Open Chrome browser on my PC')} activeOpacity={0.7}>
          <Ionicons name="globe-outline" size={18} color="#818CF8" style={styles.actionIcon} />
          <Text style={styles.actionText}>Open Browser</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  greeting: {
    ...typography.heading2,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  brandTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
    fontSize: 40,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  brandHighlight: {
    color: colors.accent,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionIcon: {
    marginRight: 6,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
