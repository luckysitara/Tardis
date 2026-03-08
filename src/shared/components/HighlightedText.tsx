import React from 'react';
import { Text } from 'react-native';
import COLORS from '@/assets/colors';

interface HighlightedTextProps {
  text: string;
  style: any;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, style }) => {
  if (!text) return null;
  
  // Split by mentions (@user), hashtags (#tag), links (http...), and blinks (solana-action...)
  const parts = text.split(/(@\w+(?:\.\w+)?|#\w+|https?:\/\/\S+|solana-action:\S+)/g);
  
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <Text key={i} style={{ color: COLORS.brandPrimary, fontWeight: '600' }}>
              {part}
            </Text>
          );
        }
        if (part.startsWith('#')) {
          return (
            <Text key={i} style={{ color: COLORS.brandPrimary }}>
              {part}
            </Text>
          );
        }
        if (part.match(/^https?:\/\/\S+/) || part.startsWith('solana-action:')) {
          return (
            <Text key={i} style={{ color: COLORS.brandPrimary, textDecorationLine: 'underline' }}>
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
};
