import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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
  getAssociatedTokenAddress,
  getAccount
} from "@solana/spl-token";
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { getRpcUrl } from '@/modules/data-module';
import COLORS from '@/assets/colors';
import TYPOGRAPHY from '@/assets/typography';
import Icons from '@/assets/svgs';

const Buffer = global.Buffer;

import { 
  DEFAULT_USDC_TOKEN,
  DEFAULT_SOL_TOKEN,
  fetchTokenPrice 
} from '@/modules/data-module/services/tokenService';

const { width } = Dimensions.get('window');
const LTV_RATIO = 1.5; // 150% collateralization

const PROGRAM_ID = new PublicKey("E3BgKRdiLizpKkbeB6txw5VB4DUZUduQJnSF1Nikb4XP");

// LIVE MAINNET SKR TOKEN
const DEFAULT_SKR_TOKEN = {
  address: 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3', 
  symbol: 'SKR',
  name: 'Seeker',
  decimals: 9,
};

// Oracle Addresses (Devnet)
const PYTH_SOL_USD = new PublicKey("J83w4H9txzS6AsvS5hL8HscV57sY4zQ9w64D9YWh5T84");
const SB_SOL_USD = new PublicKey("GvDMxP2uzBox97D3vjLzyfJyoH79YCDAuyvBnN1YuyW4");

interface LendingPoolAccount {
  publicKey: PublicKey;
  account: {
    lender: PublicKey;
    loanMint: PublicKey;
    collateralMint: PublicKey;
    totalLiquidity: anchor.BN;
    remainingLiquidity: anchor.BN;
    minBorrow: anchor.BN;
    maxBorrow: anchor.BN;
    interestRate: anchor.BN;
    vaultBump: number;
    poolBump: number;
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
  const [activeTab, setActiveTab] = useState<'MARKET' | 'MY_OFFERS'>('MARKET');
  const [pools, setPools] = useState<LendingPoolAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<LendingPoolAccount | null>(null);
  
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [skrPrice, setSkrPrice] = useState<number>(0.50); 

  const [depositAmount, setDepositAmount] = useState('');
  const [minRange, setMinRange] = useState('');
  const [maxRange, setMaxRange] = useState('');
  const [interest, setInterest] = useState('5.0');
  const [lendToken, setLendToken] = useState<'USDC' | 'SOL'>('USDC');
  const [borrowAmount, setBorrowAmount] = useState('');

  const connection = useMemo(() => new Connection(getRpcUrl(), 'confirmed'), []);
  const isMainnet = useMemo(() => connection.rpcEndpoint.includes('mainnet'), [connection]);

  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connection) return;
    try {
      const sol = await connection.getBalance(publicKey);
      setSolBalance(sol / LAMPORTS_PER_SOL);

      const usdcAddress = DEFAULT_USDC_TOKEN?.address;
      if (usdcAddress) {
        const usdcAta = await getAssociatedTokenAddress(new PublicKey(usdcAddress), publicKey);
        try {
          const account = await getAccount(connection, usdcAta);
          setUsdcBalance(Number(account.amount) / 1_000_000);
        } catch {
          setUsdcBalance(0);
        }
      }
    } catch (err: any) {
      console.warn("Balance fetch error:", err.message || err);
    }
  }, [publicKey, connection]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const provider = useMemo(() => {
    if (!wallet || !publicKey) return null;
    return new AnchorProvider(connection, { publicKey, signTransaction, signAllTransactions } as any, { preflightCommitment: 'confirmed' });
  }, [connection, wallet, publicKey, signTransaction, signAllTransactions]);

  const idl: any = useMemo(() => ({
    "address": "E3BgKRdiLizpKkbeB6txw5VB4DUZUduQJnSF1Nikb4XP",
    "instructions": [
      {
        "name": "create_pool",
        "discriminator": [233, 146, 209, 142, 207, 104, 64, 188],
        "accounts": [
          { "name": "lender", "writable": true, "signer": true },
          { "name": "loanMint" },
          { "name": "collateralMint" },
          { "name": "lenderLoanAta", "writable": true },
          { "name": "poolAccount", "writable": true },
          { "name": "vault", "writable": true },
          { "name": "tokenProgram" },
          { "name": "systemProgram" }
        ],
        "args": [
          { "name": "totalLiquidity", "type": "u64" },
          { "name": "minBorrow", "type": "u64" },
          { "name": "maxBorrow", "type": "u64" },
          { "name": "interestRate", "type": "u64" }
        ]
      },
      {
        "name": "take_loan",
        "discriminator": [193, 114, 252, 230, 240, 48, 169, 137],
        "accounts": [
          { "name": "borrower", "writable": true, "signer": true },
          { "name": "poolAccount", "writable": true },
          { "name": "poolVault", "writable": true },
          { "name": "loanMint" },
          { "name": "collateralMint" },
          { "name": "borrowerCollateralAta", "writable": true },
          { "name": "borrowerLoanAta", "writable": true },
          { "name": "activeLoan", "writable": true, "signer": true },
          { "name": "loanVault", "writable": true },
          { "name": "pythPriceInfo" },
          { "name": "switchboardPriceInfo" },
          { "name": "tokenProgram" },
          { "name": "systemProgram" }
        ],
        "args": [
          { "name": "amountToBorrow", "type": "u64" }
        ]
      }
    ],
    "accounts": [
      { "name": "LendingPool" },
      { "name": "ActiveLoan" }
    ],
    "types": [
      {
        "name": "LendingPool",
        "type": {
          "kind": "struct",
          "fields": [
            { "name": "lender", "type": "pubkey" },
            { "name": "loan_mint", "type": "pubkey" },
            { "name": "collateral_mint", "type": "pubkey" },
            { "name": "total_liquidity", "type": "u64" },
            { "name": "remaining_liquidity", "type": "u64" },
            { "name": "min_borrow", "type": "u64" },
            { "name": "max_borrow", "type": "u64" },
            { "name": "interest_rate", "type": "u64" },
            { "name": "vault_bump", "type": "u8" },
            { "name": "pool_bump", "type": "u8" }
          ]
        }
      },
      {
        "name": "ActiveLoan",
        "type": {
          "kind": "struct",
          "fields": [
            { "name": "borrower", "type": "pubkey" },
            { "name": "pool", "type": "pubkey" },
            { "name": "collateral_mint", "type": "pubkey" },
            { "name": "amount_borrowed", "type": "u64" },
            { "name": "repayment_amount", "type": "u64" },
            { "name": "collateral_amount", "type": "u64" },
            { "name": "expiry", "type": "i64" },
            { "name": "status", "type": "u8" },
            { "name": "bump", "type": "u8" }
          ]
        }
      }
    ]
  }), []);

  const fetchPools = useCallback(async () => {
    if (!provider || !idl) return;
    setLoading(true);
    try {
      console.log("[LendingView] Fetching pools from contract:", idl.address);
      const program = new Program(idl, provider);
      
      // Safety check for program accounts
      if (!program.account || !program.account.lendingPool) {
        throw new Error("LendingPool account definition missing in IDL");
      }
      
      const allPools = await program.account.lendingPool.all();
      console.log(`[LendingView] Found ${allPools.length} pools`);
      setPools(allPools as any);
    } catch (err: any) {
      console.error("Error fetching pools:", err.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [provider, idl]);

  useEffect(() => { fetchPools(); }, [fetchPools]);

  const onRefresh = () => { setRefreshing(true); fetchPools(); fetchBalances(); };

  const handleCreateLendingOrder = async () => {
    Alert.alert("Coming Soon", "P2P Lending is currently under development and will be available in the next update.");
    return;

    if (!provider || !publicKey) return;
    const amountNum = parseFloat(depositAmount);
    if (!amountNum) { Alert.alert("Error", "Enter a valid amount"); return; }

    if (isMainnet) {
      Alert.alert("Network Mismatch", "The P2P contract is currently on Devnet. Your wallet is on Mainnet. Please notify the developer to deploy the contract to Mainnet.");
      return;
    }

    setLoading(true);
    try {
      const program = new Program(idl, provider);
      const loanMint = new PublicKey(lendToken === 'USDC' ? DEFAULT_USDC_TOKEN.address : DEFAULT_SOL_TOKEN.address);
      const collateralMint = new PublicKey(DEFAULT_SKR_TOKEN.address);
      const lenderLoanAta = await getAssociatedTokenAddress(loanMint, publicKey);
      
      const decimals = lendToken === 'USDC' ? 1_000_000 : 1_000_000_000;
      const totalLiquidity = new anchor.BN(Math.floor(amountNum * decimals));
      const minBorrow = new anchor.BN(Math.floor(parseFloat(minRange) * decimals));
      const maxBorrow = new anchor.BN(Math.floor(parseFloat(maxRange) * decimals));
      const interestRate = new anchor.BN(Math.floor(parseFloat(interest) * 100));

      const poolSeed = Buffer.from("pool"); 
      const vaultSeed = Buffer.from("pool_vault");

      const [poolAccount] = PublicKey.findProgramAddressSync(
        [poolSeed, publicKey.toBuffer(), loanMint.toBuffer()],
        PROGRAM_ID
      );

      const [vault] = PublicKey.findProgramAddressSync(
        [vaultSeed, poolAccount.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .create_pool(totalLiquidity, minBorrow, maxBorrow, interestRate)
        .accounts({
          lender: publicKey,
          loanMint: loanMint,
          collateralMint: collateralMint,
          lenderLoanAta: lenderLoanAta,
          poolAccount: poolAccount,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any).rpc();

      Alert.alert("Success", "Liquidity Pool Created!");
      setShowCreateModal(false);
      fetchPools();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatedCollateral = useMemo(() => {
    const amount = parseFloat(borrowAmount) || 0;
    const rate = selectedPool?.account.interestRate.toNumber() || 0;
    const totalValueToCover = amount * (1 + (rate / 10000));
    return ((totalValueToCover * LTV_RATIO) / skrPrice).toFixed(2);
  }, [borrowAmount, selectedPool, skrPrice]);

  const handleConfirmBorrow = async () => {
    Alert.alert("Coming Soon", "Borrowing features are currently under development and will be available in the next update.");
    return;

    if (!provider || !publicKey || !selectedPool) return;
    const amount = parseFloat(borrowAmount);
    if (!amount) return;

    if (isMainnet) {
      Alert.alert("Network Mismatch", "The P2P contract is currently on Devnet. Your wallet is on Mainnet. Please notify the developer to deploy the contract to Mainnet.");
      return;
    }

    setLoading(true);
    try {
      const program = new Program(idl, provider);
      const loanMint = selectedPool.account.loanMint;
      const collateralMint = selectedPool.account.collateralMint;
      const borrowerCollateralAta = await getAssociatedTokenAddress(collateralMint, publicKey);
      const borrowerLoanAta = await getAssociatedTokenAddress(loanMint, publicKey);
      
      const vaultSeed = Buffer.from("pool_vault");
      const [poolVault] = PublicKey.findProgramAddressSync(
        [vaultSeed, selectedPool.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Derive active_loan PDA: [b"active_loan", borrower, pool, remaining_liquidity_le_bytes]
      const remainingLiquidityBuffer = selectedPool.account.remainingLiquidity.toArrayLike(Buffer, 'le', 8);
      const [activeLoan] = PublicKey.findProgramAddressSync(
        [Buffer.from("active_loan"), publicKey.toBuffer(), selectedPool.publicKey.toBuffer(), remainingLiquidityBuffer],
        PROGRAM_ID
      );

      // Derive loan_vault PDA: [b"loan_vault", active_loan]
      const [loanVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan_vault"), activeLoan.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .take_loan(new anchor.BN(Math.floor(amount * (loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 1_000_000 : 1_000_000_000))))
        .accounts({
          borrower: publicKey,
          poolAccount: selectedPool.publicKey,
          poolVault: poolVault,
          loanMint: loanMint,
          collateralMint: collateralMint,
          borrowerCollateralAta: borrowerCollateralAta,
          borrowerLoanAta: borrowerLoanAta,
          activeLoan: activeLoan,
          loanVault: loanVault,
          pythPriceInfo: PYTH_SOL_USD,
          switchboardPriceInfo: SB_SOL_USD,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      Alert.alert("Success", "Borrowed successfully!");
      setShowBorrowModal(false);
      fetchPools();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPools = useMemo(() => {
    if (activeTab === 'MARKET') {
      return pools.filter(p => p.account.lender.toBase58() !== address);
    }
    return pools.filter(p => p.account.lender.toBase58() === address);
  }, [pools, address, activeTab]);

  const renderPoolItem = ({ item }: { item: LendingPoolAccount }) => {
    const isUSDC = item.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address;
    const tokenSymbol = isUSDC ? 'USDC' : 'SOL';
    const decimals = isUSDC ? 1_000_000 : 1_000_000_000;

    return (
      <View style={styles.offerCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.lenderName}>{tokenSymbol} Pool by {item.account.lender.toBase58().slice(0,4)}</Text>
          <View style={styles.interestBadge}>
            <Text style={styles.interestText}>{(item.account.interestRate.toNumber() / 100).toFixed(1)}% APR</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>{(item.account.remainingLiquidity.toNumber() / decimals).toFixed(2)} {tokenSymbol}</Text>
          </View>
          <View>
            <Text style={[styles.statLabel, { textAlign: 'right' }]}>Borrow Range</Text>
            <Text style={[styles.statValue, { textAlign: 'right' }]}>
              {(item.account.minBorrow.toNumber() / decimals).toFixed(0)} - {(item.account.maxBorrow.toNumber() / decimals).toFixed(0)} {tokenSymbol}
            </Text>
          </View>
        </View>
        {activeTab === 'MARKET' && (
          <TouchableOpacity style={styles.borrowButton} onPress={() => { setSelectedPool(item); setShowBorrowModal(true); }}>
            <Text style={styles.borrowButtonText}>Borrow from Pool</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {isMainnet && (
        <View style={styles.networkWarning}>
          <Icons.InfoIcon width={16} height={16} fill={COLORS.white} />
          <Text style={styles.networkWarningText}>The P2P contract is currently on Devnet. Your wallet is on Mainnet. Please notify the developer to deploy the contract to Mainnet.</Text>
        </View>
      )}
      <Text style={styles.title}>P2P Lending</Text>
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'MARKET' && styles.activeTab]} onPress={() => setActiveTab('MARKET')}>
          <Text style={[styles.tabText, activeTab === 'MARKET' && styles.activeTabText]}>P2P Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'MY_OFFERS' && styles.activeTab]} onPress={() => setActiveTab('MY_OFFERS')}>
          <Text style={[styles.tabText, activeTab === 'MY_OFFERS' && styles.activeTabText]}>My Offers</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'MY_OFFERS' && (
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Icons.PlusCircleIcon width={20} height={20} fill={COLORS.white} />
          <Text style={styles.createButtonText}>Create Lending Order</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={filteredPools}
        renderItem={renderPoolItem}
        keyExtractor={item => item.publicKey.toBase58()}
        estimatedItemSize={180}
        ListHeaderComponent={<>{ListHeaderComponent && (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent)}{renderHeader()}</>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandPrimary} />}
        ListEmptyComponent={() => <View style={styles.empty}><Text style={styles.emptyText}>No active lending orders.</Text></View>}
      />

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lend Assets</Text>
            <View style={styles.pairToggle}>
              <TouchableOpacity style={[styles.pairButton, lendToken === 'USDC' && styles.activePair]} onPress={() => setLendToken('USDC')}>
                <Text style={[styles.pairText, lendToken === 'USDC' && styles.activePairText]}>USDC / SKR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pairButton, lendToken === 'SOL' && styles.activePair]} onPress={() => setLendToken('SOL')}>
                <Text style={[styles.pairText, lendToken === 'SOL' && styles.activePairText]}>SOL / SKR</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Amount to Lend ({lendToken})</Text>
                <Text style={styles.balanceText}>Balance: {lendToken === 'USDC' ? usdcBalance.toFixed(2) : solBalance.toFixed(4)}</Text>
              </View>
              <TextInput style={styles.input} value={depositAmount} onChangeText={setDepositAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.greyMid} />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Min Borrow</Text>
                <TextInput style={styles.input} value={minRange} onChangeText={setMinRange} keyboardType="numeric" placeholder="10" placeholderTextColor={COLORS.greyMid} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Max Borrow</Text>
                <TextInput style={styles.input} value={maxRange} onChangeText={setMaxRange} keyboardType="numeric" placeholder="500" placeholderTextColor={COLORS.greyMid} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>APR (%)</Text>
              <TextInput style={styles.input} value={interest} onChangeText={setInterest} keyboardType="numeric" placeholder="5.0" placeholderTextColor={COLORS.greyMid} />
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleCreateLendingOrder} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Deposit & List Pool</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.close}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showBorrowModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Borrow {selectedPool?.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 'USDC' : 'SOL'}</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount to Borrow</Text>
              <TextInput style={styles.input} value={borrowAmount} onChangeText={setBorrowAmount} keyboardType="numeric" placeholder="100.00" placeholderTextColor={COLORS.greyMid} />
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.label}>Required SKR Collateral (150%)</Text>
              <Text style={styles.summaryValue}>{calculatedCollateral} SKR</Text>
            </View>
            <TouchableOpacity style={styles.submitButton} onPress={handleConfirmBorrow} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.submitButtonText}>Confirm & Borrow</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBorrowModal(false)} style={styles.close}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  title: { color: COLORS.white, fontSize: 24, fontWeight: '800', marginBottom: 16 },
  networkWarning: { backgroundColor: COLORS.errorRed, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  networkWarningText: { color: COLORS.white, fontSize: 11, fontWeight: '600', marginLeft: 10, flex: 1 },
  tabsContainer: { flexDirection: 'row', backgroundColor: COLORS.darkerBackground, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: COLORS.lighterBackground },
  tabText: { color: COLORS.greyMid, fontWeight: '700', fontSize: 14 },
  activeTabText: { color: COLORS.brandPrimary },
  createButton: { backgroundColor: COLORS.brandGreen, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  createButtonText: { color: COLORS.white, fontWeight: '800', marginLeft: 8 },
  offerCard: { backgroundColor: COLORS.lightBackground, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  lenderName: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  interestBadge: { backgroundColor: 'rgba(50, 212, 222, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  interestText: { color: COLORS.brandPrimary, fontWeight: '800', fontSize: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statLabel: { color: COLORS.greyMid, fontSize: 11, marginBottom: 4 },
  statValue: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  borrowButton: { backgroundColor: COLORS.brandPrimary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  borrowButtonText: { color: COLORS.black, fontWeight: '800', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  modalTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800', marginBottom: 20 },
  pairToggle: { flexDirection: 'row', backgroundColor: COLORS.darkerBackground, borderRadius: 12, padding: 4, marginBottom: 20 },
  pairButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activePair: { backgroundColor: COLORS.lighterBackground },
  pairText: { color: COLORS.greyMid, fontWeight: '700' },
  activePairText: { color: COLORS.brandPrimary },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  balanceText: { color: COLORS.greyMid, fontSize: 11 },
  input: { backgroundColor: COLORS.darkerBackground, borderRadius: 16, padding: 16, color: COLORS.white, fontSize: 16 },
  row: { flexDirection: 'row' },
  summaryBox: { backgroundColor: COLORS.darkerBackground, padding: 20, borderRadius: 20, marginBottom: 24 },
  summaryValue: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  submitButton: { backgroundColor: COLORS.brandPrimary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  submitButtonText: { color: COLORS.black, fontSize: 16, fontWeight: '800' },
  close: { alignItems: 'center', marginTop: 20 },
  closeText: { color: COLORS.greyMid, fontSize: 14 },
  empty: { padding: 60, alignItems: 'center' },
  emptyText: { color: COLORS.greyMid, fontSize: 14 }
});

export default LendingView;
