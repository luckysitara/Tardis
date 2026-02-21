import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { styles } from './transferBalanceButton.style';

export interface TransferBalanceButtonProps {
  amIFollowing?: boolean;
  areTheyFollowingMe?: boolean;
  onPressFollow?: () => void;
  onPressUnfollow?: () => void;
  onSendToWallet?: () => void;
  recipientAddress?: string;
  showOnlyTransferButton?: boolean;
  showCustomWalletInput?: boolean;
  buttonLabel?: string;
  externalModalVisible?: boolean;
  externalSetModalVisible?: (visible: boolean) => void;
}

const TransferBalanceButton: React.FC<TransferBalanceButtonProps> = ({
  amIFollowing = false,
  areTheyFollowingMe = false,
  onPressFollow = () => {},
  onPressUnfollow = () => {},
  showOnlyTransferButton = false,
  buttonLabel = 'Send to Wallet',
}) => {
  let followLabel = 'Follow';
  if (amIFollowing) {
    followLabel = 'Following';
  } else if (!amIFollowing && areTheyFollowingMe) {
    followLabel = 'Follow Back';
  }

  const handlePressFollowButton = () => {
    if (amIFollowing) {
      onPressUnfollow();
    } else {
      onPressFollow();
    }
  };

  return (
    <View style={styles.container}>
      {!showOnlyTransferButton && (
        <TouchableOpacity style={styles.btn} onPress={handlePressFollowButton}>
          <Text style={styles.text}>{followLabel}</Text>
        </TouchableOpacity>
      )}
      
      {/* Transaction features removed as requested */}
    </View>
  );
};

export default TransferBalanceButton;
