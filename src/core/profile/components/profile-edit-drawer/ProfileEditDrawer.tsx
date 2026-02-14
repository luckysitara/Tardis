import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    Image,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Alert,
    ScrollView,
    ImageStyle,
    // FlatList, // Removed as NFT list is gone
    InteractionManager,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/useReduxHooks';
import {
    updateProfilePic,
    updateUsername,
    updateDescription,
    fetchUserProfile,
} from '@/shared/state/auth/reducer';
import { uploadProfileAvatar } from '@/core/profile/services/profileService';
import { styles } from './ProfileEditDrawer.styles';
import Icons from '@/assets/svgs';
import { IPFSAwareImage, getValidImageSource } from '@/shared/utils/IPFSImage';
import COLORS from '@/assets/colors';
// Removed: import { NftItem } from '@/modules/nft/types';
// Removed: import { fetchWithRetries } from '@/modules/data-module/utils/fetch';
// Removed: import { ENDPOINTS } from '@/shared/config/constants';
// Removed: import { fixImageUrl } from '@/modules/nft/utils/imageUtils';
// Removed: import { TENSOR_API_KEY } from '@env';
import TYPOGRAPHY from '@/assets/typography';

interface ProfileEditDrawerProps {
    visible: boolean;
    onClose: () => void;
    profileData: {
        userId: string;
        profilePicUrl: string;
        username: string;
        description: string;
    };
    onProfileUpdated?: (field: 'image' | 'username' | 'description') => void;
}

// Only PROFILE_EDIT view remains
enum DrawerView {
    PROFILE_EDIT,
    // NFT_LIST, // Removed
    // NFT_CONFIRM, // Removed
}

const LOG_TAG = "[ProfileEditDrawer]";

// Define fallback colors if they don't exist in COLORS
const SUCCESS_GREEN = '#27AE60';
const ERROR_RED = '#EB5757';

const { height: windowHeight } = Dimensions.get('window');

const ProfileEditDrawer = ({
    visible,
    onClose,
    profileData,
    onProfileUpdated,
}: ProfileEditDrawerProps) => {
    const dispatch = useAppDispatch();
    const isMounted = useRef(true);
    const isInitialized = useRef(false);
    const prevVisibleRef = useRef(visible);

    // Log only on actual changes to visible prop
    useEffect(() => {
        if (prevVisibleRef.current !== visible) {
            console.log('[ProfileEditDrawer] visible actually changed:', visible);
            prevVisibleRef.current = visible;
        }
    }, [visible]);

    // --- State --- 
    const [tempUsername, setTempUsername] = useState(profileData.username);
    const [tempDescription, setTempDescription] = useState(profileData.description);
    const [localImageUri, setLocalImageUri] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedSource, setSelectedSource] = useState<'library' | null>(null); // Only 'library' source remains
    // Removed: const [cachedNfts, setCachedNfts] = useState<NftItem[]>([]);
    // Removed: const [nftsLoading, setNftsLoading] = useState(false);
    // Removed: const [nftsError, setNftsError] = useState<string | null>(null);
    // Removed: const [isPreparingNfts, setIsPreparingNfts] = useState(false);
    // Removed: const [selectedNft, setSelectedNft] = useState<NftItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentView, setCurrentView] = useState<DrawerView>(DrawerView.PROFILE_EDIT);
    const [showAvatarOptions, setShowAvatarOptions] = useState(false);
    const [showUploadProgress, setShowUploadProgress] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const progressAnim = useRef(new Animated.Value(0)).current;

    // --- Drag-to-dismiss state ---
    const drawerTranslateY = useRef(new Animated.Value(windowHeight)).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true, // Always allow drag dismiss in PROFILE_EDIT
            onPanResponderMove: (_, { dy }) => {
                if (dy > 0) { // Only drag down
                    drawerTranslateY.setValue(dy);
                }
            },
            onPanResponderRelease: (_, { dy, vy }) => {
                if (dy > 150 || vy > 0.5) { // If dragged far enough or fast enough
                    Animated.timing(drawerTranslateY, {
                        toValue: windowHeight,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        onClose();
                        drawerTranslateY.setValue(windowHeight);
                    });
                } else {
                    Animated.timing(drawerTranslateY, {
                        toValue: 0,
                        duration: 100,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            drawerTranslateY.setValue(0);
        } else {
            drawerTranslateY.setValue(windowHeight);
        }
    }, [visible, drawerTranslateY]);

    // Memoize profileData to prevent unnecessary re-renders
    const memoizedProfileData = useMemo(() => profileData, [
        profileData.userId,
        profileData.username,
        profileData.description,
        profileData.profilePicUrl
    ]);

    // --- Effects --- 
    useEffect(() => {
        console.log('[ProfileEditDrawer] Component mounted');
        isMounted.current = true;
        return () => {
            console.log('[ProfileEditDrawer] Component unmounting');
            isMounted.current = false;
            isInitialized.current = false;
        };
    }, []);

    // Initialization effect - only runs once when drawer becomes visible
    useEffect(() => {
        if (visible && !isInitialized.current) {
            console.log('[ProfileEditDrawer] Initializing component state with profileData:', memoizedProfileData);
            // Initialize component state only once
            setTempUsername(memoizedProfileData.username);
            setTempDescription(memoizedProfileData.description);
            setLocalImageUri(null);
            setSelectedSource(null);
            // Removed: setCachedNfts([]);
            // Removed: setNftsLoading(false);
            // Removed: setNftsError(null);
            // Removed: setIsPreparingNfts(false);
            // Removed: setSelectedNft(null);
            setIsProcessing(false);
            setCurrentView(DrawerView.PROFILE_EDIT);

            isInitialized.current = true;
        } else if (!visible) {
            // Reset initialization flag when drawer is closed
            isInitialized.current = false;
        }
    }, [visible, memoizedProfileData]);

    // --- Callbacks --- 

    // Removed: fetchNFTs useCallback

    // Confirm and upload selected image (only from Library now)
    const handleConfirmImageUpload = useCallback(async (imageUri: string, source: 'library') => {
        if (isUploading) { // isProcessing is removed from here for simplicity, handle globally
            setIsProcessing(false);
            return;
        }

        if (!imageUri) {
            setIsProcessing(false);
            return;
        }

        if (!profileData.userId) {
            Alert.alert('Missing Data', 'No valid user to upload to');
            setIsProcessing(false);
            return;
        }

        setIsUploading(true);
        setIsProcessing(true); // Set processing globally
        setUploadError(null);

        // Show progress bar overlay
        setShowUploadProgress(true);
        setUploadProgress(0);
        progressAnim.setValue(0);

        // Create realistic animated progress
        const animateProgress = () => {
            // Animate to 90% with a natural easing, saving the last 10% for completion
            Animated.timing(progressAnim, {
                toValue: 90,
                duration: 15000, // 15 seconds to reach 90%
                useNativeDriver: false,
            }).start();
        };

        // Start the animation
        animateProgress();
        
        // Subscribe to animated value for updating state
        const progressListener = progressAnim.addListener(({value}) => {
            setUploadProgress(value);
        });

        try {
            const newUrl = await uploadProfileAvatar(profileData.userId, imageUri);

            // Animate to 100% quickly upon success
            Animated.timing(progressAnim, {
                toValue: 100,
                duration: 500,
                useNativeDriver: false,
            }).start();

            // Wait a moment before hiding progress
            setTimeout(() => {
                if (isMounted.current) {
                    setShowUploadProgress(false);
                    progressAnim.removeListener(progressListener);
                }
            }, 1000);

            if (!isMounted.current) {
                return;
            }

            dispatch(updateProfilePic(newUrl));
            if (onProfileUpdated) onProfileUpdated('image');

            setLocalImageUri(null);
            setSelectedSource(null);
            setCurrentView(DrawerView.PROFILE_EDIT); // Always return to main edit view
        } catch (err: any) {
            // Handle error - stop animation and hide progress
            progressAnim.removeListener(progressListener);
            progressAnim.setValue(0);
            setUploadError(err.message || 'Failed to upload image');
            setShowUploadProgress(false);
            
            Alert.alert('Upload Error', err.message || 'Failed to upload image');
            setCurrentView(DrawerView.PROFILE_EDIT);
        } finally {
            if (isMounted.current) {
                setIsUploading(false);
                setIsProcessing(false);
            }
        }
    }, [dispatch, profileData.userId, isUploading, onProfileUpdated, setCurrentView, progressAnim]);

    // Toggle Avatar Options visibility
    const handleToggleAvatarOptions = useCallback(() => {
        console.log('[ProfileEditDrawer] handleToggleAvatarOptions called');
        console.log('[ProfileEditDrawer] isProcessing:', isProcessing, 'isUploading:', isUploading);
        console.log('[ProfileEditDrawer] Current showAvatarOptions:', showAvatarOptions);

        if (isProcessing || isUploading) {
            console.log('[ProfileEditDrawer] Skipping toggle due to processing state');
            return;
        }

        setTimeout(() => {
            if (isMounted.current) {
                console.log('[ProfileEditDrawer] Forcibly showing avatar options menu');
                setShowAvatarOptions(true); // Always force to true, don't toggle
            }
        }, 50);
    }, [isProcessing, isUploading]);

    // Select Image from Library
    const handleSelectImageFromLibrary = useCallback(async () => {
        if (isProcessing || isUploading) { // Removed isPreparingNfts
            return;
        }

        setIsProcessing(true);
        setShowAvatarOptions(false);

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!isMounted.current) {
                setIsProcessing(false);
                return;
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setLocalImageUri(result.assets[0].uri);
                setSelectedSource('library');

                // Call upload directly
                handleConfirmImageUpload(result.assets[0].uri, 'library');
            } else {
                setIsProcessing(false);
            }
        } catch (error: any) {
            Alert.alert('Error picking image', error.message);
            setIsProcessing(false);
        }
    }, [isProcessing, isUploading, handleConfirmImageUpload]); // Removed isPreparingNfts

    // Removed: handlePrepareAndShowNfts useCallback
    // Removed: handleSelectNft useCallback
    // Removed: handleCancelNftSelection useCallback
    // Removed: handleCancelNftFlow useCallback
    // Removed: handleConfirmNft useCallback
    // Removed: handleRetryNftLoad useCallback

    // Update profile (username, description)
    const handleUpdateProfileDetails = useCallback(async () => {
        if (!profileData.userId || isProcessing || isUploading) {
            return;
        }

        const newUsername = tempUsername.trim();
        const newDescription = tempDescription.trim();
        const usernameChanged = newUsername !== profileData.username && newUsername.length > 0;
        const descriptionChanged = newDescription !== profileData.description;

        if (!usernameChanged && !descriptionChanged) {
            Alert.alert('No Changes', 'No changes were made to your profile details.');
            onClose();
            return;
        }

        setIsProcessing(true);
        let changesMade = false;

        try {
            if (usernameChanged) {
                await dispatch(
                    updateUsername({ userId: profileData.userId, newUsername })
                ).unwrap();
                if (onProfileUpdated) onProfileUpdated('username');
                changesMade = true;
            }

            if (descriptionChanged) {
                await dispatch(
                    updateDescription({ userId: profileData.userId, newDescription })
                ).unwrap();
                if (onProfileUpdated) onProfileUpdated('description');
                changesMade = true;
            }

            if (changesMade) {
                onClose();
            }
        } catch (err: any) {
            const message = err?.message || err?.toString() || 'An unknown error occurred during update.';
            Alert.alert('Update Failed', message);
        } finally {
            if (isMounted.current) {
                setIsProcessing(false);
            }
        }
    }, [
        dispatch,
        tempUsername,
        tempDescription,
        profileData.userId,
        profileData.username,
        profileData.description,
        onProfileUpdated,
        onClose,
        isProcessing,
        isUploading
    ]);

    // --- Render Helpers --- 
    // Removed: EmptyNftList
    // Removed: keyExtractor for NftItem
    // Removed: renderNftItem

    // Add isChanged() function to check if any profile data has changed
    const isChanged = useCallback(() => {
        return (
            tempUsername.trim() !== profileData.username ||
            tempDescription.trim() !== profileData.description
        );
    }, [tempUsername, tempDescription, profileData.username, profileData.description]);

    // Render content (simplified to only PROFILE_EDIT view)
    const renderContent = () => {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
                <ScrollView
                    style={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContentContainer}
                >
                    <View style={styles.imageSection}>
                        <TouchableOpacity
                            onPress={(event) => {
                                console.log('[ProfileEditDrawer] Image container pressed');
                                event.stopPropagation?.();
                                handleToggleAvatarOptions();
                            }}
                            style={styles.imageContainer}
                            activeOpacity={0.8}
                            disabled={isProcessing || isUploading}>
                            <IPFSAwareImage
                                style={styles.profileImage as ImageStyle}
                                source={
                                    localImageUri
                                        ? { uri: localImageUri }
                                        : profileData.profilePicUrl
                                            ? getValidImageSource(profileData.profilePicUrl)
                                            : require('@/assets/images/User.png')
                                }
                                defaultSource={require('@/assets/images/User.png')}
                            />

                            <View style={styles.profileImageOverlay}>
                                <View style={styles.profileImageEditIconContainer}>
                                    <Icons.EditIcon width={20} height={20} color={COLORS.white} />
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={(event) => {
                                console.log('[ProfileEditDrawer] Edit picture button pressed');
                                event.stopPropagation?.();
                                handleToggleAvatarOptions();
                            }}
                            activeOpacity={0.7}
                            disabled={isProcessing || isUploading}
                            style={styles.editPictureButton}>
                            <Text style={styles.editPictureText}>Edit picture</Text>
                        </TouchableOpacity>

                        {showAvatarOptions && (
                            <View
                                style={{
                                    borderRadius: 16,
                                    padding: 12,
                                    flexDirection: 'row',
                                    justifyContent: 'space-around',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                    marginHorizontal: 16,
                                }}
                            >
                                <TouchableOpacity
                                    style={[styles.avatarOptionButton, styles.avatarOptionButtonWithMargin]}
                                    onPress={(e) => {
                                        console.log('[ProfileEditDrawer] Library button pressed');
                                        e.stopPropagation();
                                        handleSelectImageFromLibrary();
                                    }}
                                    disabled={isProcessing || isUploading}
                                    activeOpacity={0.7}>
                                    <Icons.GalleryIcon width={20} height={20} color={COLORS.white} style={{ marginRight: 8 }} />
                                    <Text style={styles.avatarOptionText}>Library</Text>
                                </TouchableOpacity>
                                {/* Removed: NFT button */}
                            </View>
                        )}
                    </View>

                    <View style={styles.inputSection}>
                        <View style={styles.inputLabelContainer}>
                            <Text style={styles.inputLabel}>Display name</Text>
                            <Text style={styles.characterCount}>{tempUsername.length}/50</Text>
                        </View>
                        <TextInput
                            style={[
                                styles.textInput,
                                tempUsername.length >= 50 && styles.textInputAtLimit
                            ]}
                            value={tempUsername}
                            onChangeText={setTempUsername}
                            placeholder="Enter your display name"
                            placeholderTextColor={COLORS.greyMid}
                            maxLength={50}
                            editable={!isProcessing && !isUploading}
                        />
                        <Text style={styles.inputHelperText}>This is the name that will be displayed to others</Text>
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>Wallet address</Text>
                        <TextInput
                            style={[styles.textInput, styles.disabledInput]}
                            value={`@${profileData.userId.substring(0, 6)}...${profileData.userId.slice(-4)}`}
                            editable={false}
                        />
                        <Text style={styles.inputHelperText}>Your wallet address cannot be changed</Text>
                    </View>

                    <View style={styles.inputSection}>
                        <View style={styles.inputLabelContainer}>
                            <Text style={styles.inputLabel}>Bio</Text>
                            <Text style={[
                                styles.characterCount,
                                tempDescription.length > 150 && styles.characterCountWarning
                            ]}>
                                {tempDescription.length}/160
                            </Text>
                        </View>
                        <TextInput
                            style={[
                                styles.textInput,
                                styles.bioInput,
                                tempDescription.length >= 160 && styles.textInputAtLimit
                            ]}
                            value={tempDescription}
                            onChangeText={setTempDescription}
                            placeholder="Write a short bio about yourself"
                            placeholderTextColor={COLORS.greyMid}
                            multiline
                            maxLength={160}
                            editable={!isProcessing && !isUploading}
                        />
                        <Text style={styles.inputHelperText}>Tell others about yourself in a few words</Text>
                    </View>
                    <View style={styles.bottomSpacerView} />
                </ScrollView>
            </KeyboardAvoidingView>
        );
    };

    // --- Main Render ---
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={() => {
                if (isProcessing || isUploading) return;
                // Simplified: only close the drawer
                onClose();
            }}
        >
            <TouchableWithoutFeedback onPress={(event) => {
                console.log('[ProfileEditDrawer] Overlay pressed');
                if (isProcessing || isUploading) {
                    console.log('[ProfileEditDrawer] Ignoring overlay press due to processing state');
                    return;
                }

                // Prevent event bubbling
                event.stopPropagation?.();
                console.log('[ProfileEditDrawer] After stopPropagation');

                // If avatar options are shown, just hide them instead of closing the drawer
                if (showAvatarOptions) {
                    console.log('[ProfileEditDrawer] Hiding avatar options instead of closing drawer');
                    setShowAvatarOptions(false);
                    return;
                }

                console.log('[ProfileEditDrawer] Closing drawer');
                onClose();
            }}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[
                    styles.drawerContainer,
                    // No more currentView === DrawerView.PROFILE_EDIT conditional logic for transform
                    { transform: [{ translateY: drawerTranslateY }] },
                ]}
                {...panResponder.panHandlers}
            >
                {/* Drag handle always present */}
                <View
                    style={{
                        width: 40,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: COLORS.borderDarkColor,
                        alignSelf: 'center',
                        marginTop: 10,
                        marginBottom: 10,
                        opacity: 0.7,
                    }}
                />
                <View style={styles.headerContainer}>
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation?.();
                            onClose();
                        }}
                        style={styles.backButton}
                        disabled={isProcessing || isUploading}>
                        <Text style={styles.backButtonText}>✕</Text>
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>Edit Profile</Text>

                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (isChanged()) ? styles.saveButtonActive : styles.saveButtonInactive
                        ]}
                        onPress={handleUpdateProfileDetails}
                        disabled={isProcessing || isUploading || !isChanged()}>
                        <Text style={[
                            styles.saveButtonText,
                            (isChanged()) ? styles.saveButtonTextActive : styles.saveButtonTextInactive
                        ]}>
                            {isProcessing ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>
                {renderContent()}
                {showUploadProgress && (
                    <View style={styles.uploadProgressOverlay}>
                        <View style={styles.uploadProgressContainer}>
                            <View style={styles.uploadProgressHeader}>
                                <Text style={styles.uploadProgressTitle}>Uploading Image</Text>
                                {uploadProgress < 100 && (
                                    <Text style={styles.uploadProgressPercentage}>
                                        {Math.round(uploadProgress)}%
                                    </Text>
                                )}
                            </View>
                            
                            <View style={styles.uploadProgressBarContainer}>
                                <Animated.View
                                    style={[
                                        styles.uploadProgressBar,
                                        { width: progressAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%']
                                          })
                                        }
                                    ]}
                                />
                                <View style={styles.uploadProgressBarShine} />
                            </View>
                            
                            {uploadProgress >= 100 ? (
                                <View style={styles.uploadSuccessContainer}>
                                    <Text style={{color: SUCCESS_GREEN, fontSize: 20}}>✓</Text>
                                    <Text style={styles.uploadSuccessText}>Upload complete!</Text>
                                </View>
                            ) : uploadError ? (
                                <View style={styles.uploadErrorContainer}>
                                    <Text style={{color: ERROR_RED, fontSize: 20}}>✗</Text>
                                    <Text style={styles.uploadErrorText}>{uploadError}</Text>
                                </View>
                            ) : (
                                <Text style={styles.uploadProgressText}>
                                    Please wait while we upload your image...
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </Animated.View>
        </Modal>
    );
};

// Ensure the component is properly memoized with a custom comparison function
const MemoizedProfileEditDrawer = memo(ProfileEditDrawer, (prevProps, nextProps) => {
    // Only re-render if these props actually change
    return (
        prevProps.visible === nextProps.visible &&
        prevProps.profileData.userId === nextProps.profileData.userId &&
        prevProps.profileData.profilePicUrl === nextProps.profileData.profilePicUrl &&
        prevProps.profileData.username === nextProps.profileData.username &&
        prevProps.profileData.description === nextProps.profileData.description
    );
});

export default MemoizedProfileEditDrawer;
