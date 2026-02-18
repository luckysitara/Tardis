import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native'; // Keep FlatList for type inference, FlashList extends it
import { FlashList } from "@shopify/flash-list";
import COLORS from '@/assets/colors';
import PostComponent from '../components/PostComponent'; // Import the PostComponent

// Dummy data for posts, updated to match PostProps
const DUMMY_POSTS = Array.from({ length: 50 }).map((_, i) => ({
  id: String(i),
  username: `seeker${i + 1}.skr`,
  content: `This is post number ${i + 1} in the Town Square. It is cryptographically signed by my Seed Vault! #Tardis`,
  mediaUri: i % 3 === 0 ? `https://picsum.photos/id/${i + 10}/400/200` : undefined, // Add some dummy media
  timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(), // Vary timestamp
  isSigned: true, // All posts are signed in Tardis
  likes: Math.floor(Math.random() * 100),
  reposts: Math.floor(Math.random() * 20),
}));

const TownSquareScreen = () => {
  const renderItem = ({ item }: { item: typeof DUMMY_POSTS[0] }) => (
    <PostComponent {...item} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Town Square</Text>
      <FlashList
        data={DUMMY_POSTS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={250} // Adjust based on average post height with media
        contentContainerStyle={styles.flashListContentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  flashListContentContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
});

export default TownSquareScreen;

