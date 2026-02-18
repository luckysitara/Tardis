import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../shared/state/store'; // Adjust path as necessary
import COLORS from '@/assets/colors';

const ProfileScreen = ({ navigation }) => {
  const skrUsername = useSelector((state: RootState) => state.auth.username);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Seeker Profile</Text>
      <Text style={styles.skrText}>{skrUsername || "Loading .skr..."}</Text>

      {/* Placeholder for Profile Picture, Bio, Follower/Following Counts */}
      <View style={styles.profileInfoContainer}>
        <View style={styles.profilePicturePlaceholder} />
        <Text style={styles.bioText}>
          This is a placeholder bio. Hardware-attested Solana Seeker.
        </Text>
        <View style={styles.followStats}>
          <Text style={styles.followText}>0 Followers</Text>
          <Text style={styles.followText}>0 Following</Text>
        </View>
      </View>

      <Button
        title="Edit Profile"
        onPress={() => navigation.navigate('EditProfile')}
        color={COLORS.brandPrimary}
      />

      {/* Placeholder for Internal Profile Content Tabs */}
      <View style={styles.internalTabsContainer}>
        <Text style={styles.internalTabsText}>
          [Placeholder for Posts | Activity | Media | Communities Tabs]
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 50, // Give some space from the top
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 10,
  },
  skrText: {
    fontSize: 22,
    color: COLORS.brandPrimary,
    marginBottom: 20,
  },
  profileInfoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.brandPrimary,
  },
  bioText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    maxWidth: '80%',
  },
  followStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  followText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  internalTabsContainer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
    paddingTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  internalTabsText: {
    color: COLORS.white,
    fontSize: 16,
    fontStyle: 'italic',
  },
});

export default ProfileScreen;

