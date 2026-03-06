import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions
} from 'react-native';
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { 
  PublicKey, 
  SystemProgram, 
  Connection, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress 
} from "@solana/spl-token";
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { getRpcUrl } from '@/modules/data-module';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';
import { Buffer } from 'buffer';

import { 
  DEFAULT_SOL_TOKEN, 
  DEFAULT_USDC_TOKEN,
  fetchTokenPrice 
} from '@/modules/data-module/services/tokenService';

const { width } = Dimensions.get('window');
const LTV_RATIO = 1.5; // 150% collateralization

// Program ID from the IDL
const PROGRAM_ID = new PublicKey("E3BgKRdiLizpKkbeB6txw5VB4DUZUduQJnSF1Nikb4XP");

// Mock SKR Token (Seeker)
const DEFAULT_SKR_TOKEN = {
  address: 'SKRxxxxxx1111111111111111111111111111111111', // Placeholder mint
  symbol: 'SKR',
  name: 'Seeker',
  decimals: 9,
  logoURI: 'https://api.dicebear.com/7.x/identicon/png?seed=skr',
};

// Mock Oracle Addresses from tests (Devnet)
const PYTH_SOL_USD = new PublicKey("J83w4H9txzS6AsvS5hL8HscV57sY4zQ9w64D9YWh5T84");
const SB_SOL_USD = new PublicKey("GvDMxP2uzBox97D3vjLzyfJyoH79YCDAuyvBnN1YuyW4");

interface LoanAccount {
  publicKey: PublicKey;
  account: {
    lender: PublicKey;
    borrower: PublicKey;
    collateralMint: PublicKey;
    loanMint: PublicKey;
    collateralAmount: anchor.BN;
    loanAmount: anchor.BN;
    repaymentAmount: anchor.BN;
    expiry: anchor.BN;
    status: number; // 0: Available Offer, 1: Active Loan, 2: Repaid, 3: Liquidated
    bump: number;
  };
}

interface LendingViewProps {
  address: string;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

const LendingView: React.FC<LendingViewProps> = ({ address, ListHeaderComponent }) => {
  const { 
    wallet, 
    publicKey, 
    signTransaction, 
    signAllTransactions 
  } = useWallet();
  const [activeTab, setActiveTab] = useState<'MARKET' | 'MY_LOANS'>('MARKET');
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLendModal, setShowLendModal] = useState(false);
  const [showBorrowConfirmModal, setShowBorrowConfirmModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<LoanAccount | null>(null);
  const [solPrice, setSolPrice] = useState<number>(140); // Initial fallback

  // Form State for Lending Offer (Lender/Maker)
  const [lendAmount, setLendAmount] = useState('');
  const [lendInterest, setLendInterest] = useState('5');
  const [lendDurationHours, setLendDurationHours] = useState('24');
  const [lendToken, setLendToken] = useState(DEFAULT_USDC_TOKEN);

  useEffect(() => {
    const getPrice = async () => {
      try {
        const price = await fetchTokenPrice(DEFAULT_SOL_TOKEN);
        if (price) setSolPrice(price);
      } catch (err) {
        console.warn("Failed to fetch SOL price:", err);
      }
    };
    getPrice();
  }, []);

  const connection = useMemo(() => new Connection(getRpcUrl(), 'confirmed'), []);

  const provider = useMemo(() => {
    if (!wallet || !publicKey) return null;
    const anchorWallet = { publicKey, signTransaction, signAllTransactions };
    return new AnchorProvider(connection, anchorWallet as any, { preflightCommitment: 'confirmed' });
  }, [connection, wallet, publicKey, signTransaction, signAllTransactions]);

  // IDL matches Anchor 0.30 format
  const idl: any = useMemo(() => ({
    "address": PROGRAM_ID.toBase58(),
    "metadata": { "name": "lending_program", "version": "0.1.0", "spec": "0.1.0", "address": PROGRAM_ID.toBase58() },
    "instructions": [
      {
        "name": "initializeLoan",
        "discriminator": [235, 149, 178, 147, 146, 178, 207, 151],
        "accounts": [
          { "name": "borrower", "writable": true, "signer": true },
          { "name": "collateralMint" },
          { "name": "borrowerCollateralAta", "writable": true },
          { "name": "loanAccount", "writable": true },
          { "name": "vault", "writable": true },
          { "name": "tokenProgram" },
          { "name": "systemProgram", "address": "11111111111111111111111111111111" }
        ],
        "args": [
          { "name": "collateralAmount", "type": "u64" },
          { "name": "loanAmount", "type": "u64" },
          { "name": "repaymentAmount", "type": "u64" },
          { "name": "expiry", "type": "i64" }
        ]
      },
      {
        "name": "acceptLoan",
        "discriminator": [115, 234, 176, 73, 152, 3, 37, 221],
        "accounts": [
          { "name": "lender", "writable": true, "signer": true },
          { "name": "borrower", "writable": true },
          { "name": "loanMint" },
          { "name": "lenderLoanAta", "writable": true },
          { "name": "borrowerLoanAta", "writable": true },
          { "name": "loanAccount", "writable": true },
          { "name": "pythPriceInfo" },
          { "name": "switchboardPriceInfo" },
          { "name": "tokenProgram" }
        ],
        "args": []
      },
      {
        "name": "repayLoan",
        "discriminator": [224, 93, 144, 77, 61, 17, 137, 54],
        "accounts": [
          { "name": "borrower", "writable": true, "signer": true },
          { "name": "lender", "writable": true },
          { "name": "loanMint" },
          { "name": "collateralMint" },
          { "name": "borrowerLoanAta", "writable": true },
          { "name": "lenderLoanAta", "writable": true },
          { "name": "borrowerCollateralAta", "writable": true },
          { "name": "loanAccount", "writable": true },
          { "name": "vault", "writable": true },
          { "name": "tokenProgram" }
        ],
        "args": []
      }
    ],
    "accounts": [
      { "name": "loan", "discriminator": [20, 195, 70, 117, 165, 227, 182, 1] }
    ],
    "types": [
      {
        "name": "loan",
        "type": {
          "kind": "struct",
          "fields": [
            { "name": "lender", "type": "pubkey" },
            { "name": "borrower", "type": "pubkey" },
            { "name": "collateralMint", "type": "pubkey" },
            { "name": "loanMint", "type": "pubkey" },
            { "name": "collateralAmount", "type": "u64" },
            { "name": "loanAmount", "type": "u64" },
            { "name": "repaymentAmount", "type": "u64" },
            { "name": "expiry", "type": "i64" },
            { "name": "status", "type": "u8" },
            { "name": "bump", "type": "u8" }
          ]
        }
      }
    ]
  }), []);

  const fetchLoans = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const program = new Program(idl, provider);
      const allLoans = await program.account.loan.all();
      setLoans(allLoans as any);
    } catch (err) {
      console.error("Error fetching loans:", err);
      setLoans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [provider, idl]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const onRefresh = () => { setRefreshing(true); fetchLoans(); };

  const showDevnetAlert = () => {
    Alert.alert(
      "Devnet Feature",
      "The Escrow P2P lending/borrowing features are currently on Devnet. Please contact the developer to deploy to Mainnet and try again later.",
      [{ text: "OK", onPress: () => {
        setShowLendModal(false);
        setShowBorrowConfirmModal(false);
      }}]
    );
  };

  const handleLendFunds = async () => {
    if (!lendAmount || !lendInterest) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    showDevnetAlert();
  };

  const handleConfirmBorrow = async () => {
    showDevnetAlert();
  };

  const handleRepayLoan = async (loan: LoanAccount) => {
    showDevnetAlert();
  };

  const calculatedCollateral = useMemo(() => {
    const amount = parseFloat(lendAmount) || 0;
    const interest = parseFloat(lendInterest) || 0;
    const totalToRepay = amount * (1 + (interest / 100));
    return ((totalToRepay * LTV_RATIO) / solPrice).toFixed(4);
  }, [lendAmount, lendInterest, solPrice]);

  const filteredLoans = useMemo(() => {
    if (activeTab === 'MARKET') {
      // Offers available for taking (Lender set, Borrower empty)
      return loans.filter(l => 
        l.account.status === 0 && 
        l.account.lender && 
        l.account.lender.toBase58() !== address &&
        (l.account.borrower.equals(PublicKey.default))
      );
    } else {
      // Loans involving the user
      return loans.filter(l => 
        (l.account.borrower && l.account.borrower.toBase58() === address) || 
        (l.account.lender && l.account.lender.toBase58() === address)
      );
    }
  }, [loans, activeTab, address]);

  const renderMarketOverview = () => (
    <View style={styles.overviewContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total TVL</Text>
        <Text style={styles.statValue}>$0.00</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Offers</Text>
        <Text style={styles.statValue}>0</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Avg. Yield</Text>
        <Text style={styles.statValue}>0.0%</Text>
      </View>
    </View>
  );

  const renderLoanItem = ({ item }: { item: LoanAccount }) => {
    const isLender = item.account.lender.toBase58() === address;
    const isBorrower = item.account.borrower.toBase58() === address;
    
    const statusMap = ["Available Offer", "Active", "Repaid", "Liquidated"];
    const statusColor = [COLORS.brandPrimary, COLORS.brandGreen, COLORS.greyMid, COLORS.errorRed];

    const loanToken = item.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 'USDC' : 'SKR';
    const loan = item.account.loanAmount;
    const repayment = item.account.repaymentAmount;
    const interestPercent = loan.isZero() ? 0 : repayment.sub(loan).mul(new anchor.BN(100)).div(loan).toNumber();

    return (
      <View style={styles.loanCard}>
        <View style={styles.loanHeader}>
          <View style={styles.typeTag}>
            <Icons.WalletIcon width={14} height={14} fill={COLORS.brandPrimary} />
            <Text style={styles.loanType}>
              {loanToken} Lending Offer
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor[item.account.status] + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor[item.account.status] }]}>
              {statusMap[item.account.status]}
            </Text>
          </View>
        </View>

        <View style={styles.mainValues}>
          <View>
            <Text style={styles.mainLabel}>Offering</Text>
            <View style={styles.valueRow}>
              <Text style={styles.mainValue}>{(loan.toNumber() / (loanToken === 'USDC' ? 1_000_000 : 1_000_000_000)).toFixed(2)}</Text>
              <Text style={styles.currency}>{loanToken}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={[styles.mainLabel, { textAlign: 'right' }]}>Yield</Text>
            <View style={[styles.valueRow, { justifyContent: 'flex-end' }]}>
              <Text style={[styles.mainValue, { color: COLORS.brandGreen }]}>{interestPercent}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.loanDetailsGrid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>LTV</Text>
            <Text style={styles.gridValue}>150% (Fixed)</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Collateral</Text>
            <Text style={styles.gridValue}>SOL</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Duration</Text>
            <Text style={styles.gridValue}>7 Days</Text>
          </View>
        </View>

        {activeTab === 'MARKET' && item.account.status === 0 && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setSelectedOffer(item);
              setShowBorrowConfirmModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Borrow Now</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'MY_LOANS' && isBorrower && item.account.status === 1 && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: COLORS.brandGreen }]}
            onPress={() => handleRepayLoan(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Repay Principal + Interest</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'MARKET' && styles.activeTab]}
        onPress={() => setActiveTab('MARKET')}
      >
        <Text style={[styles.tabText, activeTab === 'MARKET' && styles.activeTabText]}>P2P Market</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'MY_LOANS' && styles.activeTab]}
        onPress={() => setActiveTab('MY_LOANS')}
      >
        <Text style={[styles.tabText, activeTab === 'MY_LOANS' && styles.activeTabText]}>My Positions</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {ListHeaderComponent && (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent)}
      <View style={styles.headerContent}>
        <Text style={styles.title}>P2P Lending</Text>
        <Text style={styles.subtitle}>Borrow from available liquidity or lend to earn yield.</Text>
        {renderMarketOverview()}
        {renderTabs()}
        {activeTab === 'MY_LOANS' && (
          <TouchableOpacity 
            style={styles.lendButtonMain}
            onPress={() => setShowLendModal(true)}
            activeOpacity={0.7}
          >
            <Icons.PlusCircleIcon width={20} height={20} fill={COLORS.white} />
            <Text style={styles.lendButtonText}>Create Lending Offer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredLoans}
        renderItem={renderLoanItem}
        keyExtractor={item => item.publicKey.toBase58()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandPrimary} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icons.SearchIcon width={48} height={48} fill={COLORS.lightGrey} />
            <Text style={styles.emptyText}>No available offers in the market.</Text>
            {activeTab === 'MARKET' && (
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Text style={styles.refreshButtonText}>Refresh Market</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Lender Modal (The Maker) */}
      <Modal visible={showLendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Lend Funds</Text>
                <Text style={styles.modalSubtitle}>Create a new offer for the P2P marketplace</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLendModal(false)} style={styles.closeButton}>
                <Text style={{ color: COLORS.white, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Token to Lend</Text>
                <View style={styles.tokenPicker}>
                  <TouchableOpacity 
                    style={[styles.tokenOption, lendToken.symbol === 'USDC' && styles.activeTokenOption]}
                    onPress={() => setLendToken(DEFAULT_USDC_TOKEN)}
                  >
                    <Text style={[styles.tokenOptionText, lendToken.symbol === 'USDC' && styles.activeTokenOptionText]}>USDC</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tokenOption, lendToken.symbol === 'SKR' && styles.activeTokenOption]}
                    onPress={() => setLendToken(DEFAULT_SKR_TOKEN as any)}
                  >
                    <Text style={[styles.tokenOptionText, lendToken.symbol === 'SKR' && styles.activeTokenOptionText]}>SKR</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Lend Amount ({lendToken.symbol})</Text>
                <TextInput
                  style={styles.input}
                  value={lendAmount}
                  onChangeText={setLendAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.accessoryDarkColor}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Desired Interest (%)</Text>
                <TextInput
                  style={styles.input}
                  value={lendInterest}
                  onChangeText={setLendInterest}
                  keyboardType="numeric"
                  placeholder="5.0"
                  placeholderTextColor={COLORS.accessoryDarkColor}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration (Hours)</Text>
                <View style={styles.durationButtons}>
                  {['24', '168', '720'].map(h => (
                    <TouchableOpacity 
                      key={h}
                      style={[styles.durationChip, lendDurationHours === h && styles.activeDurationChip]}
                      onPress={() => setLendDurationHours(h)}
                    >
                      <Text style={[styles.durationChipText, lendDurationHours === h && styles.activeDurationChipText]}>
                        {h === '24' ? '1 Day' : h === '168' ? '1 Week' : '1 Month'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Expected Return</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.brandGreen }]}>
                    {lendAmount ? (parseFloat(lendAmount) * (1 + parseFloat(lendInterest)/100)).toFixed(2) : '0.00'} {lendToken.symbol}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Required Collateral Ratio</Text>
                  <Text style={styles.summaryValue}>150% (SOL)</Text>
                </View>
              </View>

              <TouchableOpacity style={[styles.submitButton, { backgroundColor: COLORS.brandGreen }]} onPress={handleLendFunds}>
                <Text style={styles.submitButtonText}>Publish Offer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Borrow Confirmation Modal (The Taker) */}
      <Modal visible={showBorrowConfirmModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Confirm Borrowing</Text>
                <Text style={styles.modalSubtitle}>Provide collateral to take this offer</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBorrowConfirmModal(false)} style={styles.closeButton}>
                <Text style={{ color: COLORS.white, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedOffer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.offerDetailsBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Borrowing Amount</Text>
                    <Text style={styles.summaryValue}>
                      {(selectedOffer.account.loanAmount.toNumber() / (selectedOffer.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 1_000_000 : 1_000_000_000)).toFixed(2)} {selectedOffer.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 'USDC' : 'SKR'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Repayment at Maturity</Text>
                    <Text style={styles.summaryValue}>
                      {(selectedOffer.account.repaymentAmount.toNumber() / (selectedOffer.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 1_000_000 : 1_000_000_000)).toFixed(2)} {selectedOffer.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 'USDC' : 'SKR'}
                    </Text>
                  </View>
                </View>

                <View style={styles.collateralCalculationBox}>
                  <Text style={styles.inputLabel}>Required Collateral</Text>
                  <View style={styles.collateralDisplay}>
                    <Text style={styles.collateralBigValue}>
                      {((selectedOffer.account.repaymentAmount.toNumber() * LTV_RATIO) / (selectedOffer.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 1_000_000 : 1_000_000_000) / solPrice).toFixed(4)}
                    </Text>
                    <Text style={styles.collateralUnit}>SOL</Text>
                  </View>
                  <Text style={styles.priceHint}>Based on current SOL price of ${solPrice.toFixed(2)}</Text>
                </View>

                <View style={styles.liquidationWarning}>
                  <Icons.InfoIcon width={16} height={16} fill={COLORS.errorRed} />
                  <Text style={styles.warningText}>
                    Liquidation will trigger if your SOL collateral value drops below 110% of the repayment amount.
                  </Text>
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleConfirmBorrow}>
                  <Text style={styles.submitButtonText}>Confirm & Take Loan</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 40 },
  headerWrapper: { marginBottom: 8 },
  headerContent: { paddingHorizontal: 20, paddingTop: 10 },
  title: { color: COLORS.white, fontSize: 28, fontFamily: TYPOGRAPHY.fontFamily, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: COLORS.accessoryDarkColor, fontSize: 14, fontFamily: TYPOGRAPHY.fontFamily, marginBottom: 24 },
  overviewContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { backgroundColor: COLORS.lighterBackground, padding: 12, borderRadius: 16, width: (width - 60) / 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statLabel: { color: COLORS.accessoryDarkColor, fontSize: 10, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  statValue: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  tabsContainer: { flexDirection: 'row', backgroundColor: COLORS.darkerBackground, borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: COLORS.lighterBackground },
  tabText: { color: COLORS.accessoryDarkColor, fontSize: 14, fontWeight: '700' },
  activeTabText: { color: COLORS.brandPrimary },
  loanCard: { backgroundColor: COLORS.lightBackground, borderRadius: 24, padding: 20, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  typeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(50, 212, 222, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  loanType: { color: COLORS.brandPrimary, fontSize: 12, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  mainValues: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  mainLabel: { color: COLORS.accessoryDarkColor, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  mainValue: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  currency: { color: COLORS.accessoryDarkColor, fontSize: 12, fontWeight: '800', marginLeft: 4 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  loanDetailsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 16, marginBottom: 20 },
  gridItem: { alignItems: 'flex-start' },
  gridLabel: { color: COLORS.accessoryDarkColor, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  gridValue: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  actionButton: { backgroundColor: COLORS.brandPrimary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  actionButtonText: { color: COLORS.black, fontWeight: '800', fontSize: 15 },
  lendButtonMain: { backgroundColor: COLORS.brandGreen, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  lendButtonText: { color: COLORS.black, fontWeight: '800', fontSize: 15, marginLeft: 8 },
  emptyContainer: { padding: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.accessoryDarkColor, fontSize: 14, textAlign: 'center', marginTop: 16 },
  refreshButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.lighterBackground, borderRadius: 12 },
  refreshButtonText: { color: COLORS.brandPrimary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: COLORS.accessoryDarkColor, fontSize: 13, marginTop: 2 },
  closeButton: { backgroundColor: COLORS.lighterBackground, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: { backgroundColor: COLORS.darkerBackground, borderRadius: 16, padding: 16, color: COLORS.white, fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  tokenPicker: { flexDirection: 'row', backgroundColor: COLORS.darkerBackground, borderRadius: 16, padding: 4 },
  tokenOption: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTokenOption: { backgroundColor: COLORS.lighterBackground },
  tokenOptionText: { color: COLORS.accessoryDarkColor, fontWeight: '700' },
  activeTokenOptionText: { color: COLORS.brandPrimary },
  durationButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  durationChip: { backgroundColor: COLORS.darkerBackground, paddingVertical: 12, width: (width - 78) / 3, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  activeDurationChip: { backgroundColor: 'rgba(50, 212, 222, 0.1)', borderColor: COLORS.brandPrimary },
  durationChipText: { color: COLORS.accessoryDarkColor, fontWeight: '700' },
  activeDurationChipText: { color: COLORS.brandPrimary },
  summaryCard: { backgroundColor: COLORS.darkerBackground, borderRadius: 16, padding: 16, marginTop: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: COLORS.accessoryDarkColor, fontSize: 13 },
  summaryValue: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  submitButton: { backgroundColor: COLORS.brandPrimary, borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 30, marginBottom: 10 },
  submitButtonText: { color: COLORS.black, fontSize: 16, fontWeight: '800' },
  offerDetailsBox: { backgroundColor: COLORS.darkerBackground, borderRadius: 16, padding: 16, marginBottom: 20 },
  collateralCalculationBox: { backgroundColor: 'rgba(50, 212, 222, 0.05)', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(50, 212, 222, 0.2)', marginBottom: 20 },
  collateralDisplay: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  collateralBigValue: { color: COLORS.brandPrimary, fontSize: 42, fontWeight: '900' },
  collateralUnit: { color: COLORS.brandPrimary, fontSize: 18, fontWeight: '800', marginLeft: 8 },
  priceHint: { color: COLORS.accessoryDarkColor, fontSize: 12, marginTop: 4 },
  liquidationWarning: { flexDirection: 'row', backgroundColor: 'rgba(255, 75, 75, 0.1)', padding: 12, borderRadius: 12, alignItems: 'center' },
  warningText: { color: COLORS.errorRed, fontSize: 11, flex: 1, marginLeft: 10, fontWeight: '600' }
});

export default LendingView;
