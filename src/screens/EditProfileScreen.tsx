import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput } from 'react-native';
import COLORS from '@/assets/colors';

const EditProfileScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Edit Your Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor={COLORS.gray}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Bio"
        placeholderTextColor={COLORS.gray}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <View style={styles.buttonContainer}>
        <Button
          title="Save Changes"
          onPress={() => {
            // Logic to save changes (e.g., dispatch to Redux, call API)
            console.log("Saving changes:", { name, bio });
            navigation.goBack();
          }}
          color={COLORS.brandPrimary}
        />
        <View style={{ marginVertical: 10 }} />
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          color={COLORS.gray}
        />
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
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 30,
  },
  input: {
    width: '90%',
    backgroundColor: COLORS.darkerBackground,
    color: COLORS.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 30,
    width: '90%',
  },
});

export default EditProfileScreen;

