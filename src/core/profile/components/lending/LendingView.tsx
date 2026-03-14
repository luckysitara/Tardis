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
import { Buffer } from 'buffer';
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
    loansCount: anchor.BN;
  };
}

interface ActiveLoanAccount {
  publicKey: PublicKey;
  account: {
    borrower: PublicKey;
    pool: PublicKey;
    collateralMint: PublicKey;
    amountBorrowed: anchor.BN;
    repaymentAmount: anchor.BN;
    collateralAmount: anchor.BN;
    expiry: anchor.BN;
    status: number;
    bump: number;
    loanId: anchor.BN;
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
    signAllTransactions,
  } = useWallet();
  const [activeTab, setActiveTab] = useState<'MARKET' | 'MY_OFFERS' | 'MY_LOANS'>('MARKET');
  const [pools, setPools] = useState<LendingPoolAccount[]>([]);
  const [myLoans, setMyLoans] = useState<ActiveLoanAccount[]>([]);
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
    if (!publicKey) return;
    try {
      const sol = await connection.getBalance(publicKey);
      setSolBalance(sol / LAMPORTS_PER_SOL);

      const usdcAta = await getAssociatedTokenAddress(new PublicKey(DEFAULT_USDC_TOKEN.address), publicKey);
      try {
        const account = await getAccount(connection, usdcAta);
        setUsdcBalance(Number(account.amount) / 1_000_000);
      } catch {
        setUsdcBalance(0);
      }
    } catch (err) {
      console.warn("Balance fetch error:", err);
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
          { "name": "loan_mint" },
          { "name": "collateral_mint" },
          { "name": "lender_loan_ata", "writable": true },
          { "name": "pool_account", "writable": true },
          { "name": "vault", "writable": true },
          { "name": "token_program" },
          { "name": "system_program" }
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
          { "name": "pool_account", "writable": true },
          { "name": "pool_vault", "writable": true },
          { "name": "loan_mint" },
          { "name": "collateral_mint" },
          { "name": "borrower_collateral_ata", "writable": true },
          { "name": "borrower_loan_ata", "writable": true },
          { "name": "active_loan", "writable": true, "signer": true },
          { "name": "loan_vault", "writable": true },
          { "name": "pythPriceInfo" },
          { "name": "switchboardPriceInfo" },
          { "name": "tokenProgram" },
          { "name": "systemProgram" }
        ],
        "args": [
          { "name": "amountToBorrow", "type": "u64" }
        ]
      },
      {
        "name": "repay_pool_loan",
        "discriminator": [224, 93, 144, 77, 61, 17, 137, 54],
        "accounts": [
          { "name": "borrower", "writable": true, "signer": true },
          { "name": "pool_account", "writable": true },
          { "name": "pool_vault", "writable": true },
          { "name": "active_loan", "writable": true },
          { "name": "loan_vault", "writable": true },
          { "name": "loan_mint" },
          { "name": "collateral_mint" },
          { "name": "borrower_loan_ata", "writable": true },
          { "name": "borrower_collateral_ata", "writable": true },
          { "name": "token_program" }
        ],
        "args": []
      },
      {
        "name": "liquidate_pool_loan",
        "discriminator": [223, 179, 226, 125, 48, 46, 39, 74],
        "accounts": [
          { "name": "lender", "writable": true, "signer": true },
          { "name": "pool_account", "writable": true },
          { "name": "active_loan", "writable": true },
          { "name": "loan_vault", "writable": true },
          { "name": "collateral_mint" },
          { "name": "lender_collateral_ata", "writable": true },
          { "name": "pythPriceInfo" },
          { "name": "switchboardPriceInfo" },
          { "name": "tokenProgram" }
        ],
        "args": []
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
            { "name": "pool_bump", "type": "u8" },
            { "name": "loans_count", "type": "u64" }
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
            { "name": "bump", "type": "u8" },
            { "name": "loan_id", "type": "u64" }
          ]
        }
      }
    ]
  }), []);

  const fetchPoolsAndLoans = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const program = new Program(idl, provider);
      
      const [poolData, loanData] = await Promise.all([
        program.account.lendingPool.all(),
        program.account.activeLoan.all()
      ]);

      setPools(poolData as any);
      setMyLoans(loanData as any);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [provider, idl]);

  useEffect(() => { fetchPoolsAndLoans(); }, [fetchPoolsAndLoans]);

  const onRefresh = () => { setRefreshing(true); fetchPoolsAndLoans(); fetchBalances(); };

  const handleCreateLendingOrder = async () => {
    if (!provider || !publicKey) return;
    const amountNum = parseFloat(depositAmount);
    if (!amountNum) { Alert.alert("Error", "Enter a valid amount"); return; }

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

      const [poolAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), publicKey.toBuffer(), loanMint.toBuffer()],
        PROGRAM_ID
      );

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_vault"), poolAccount.toBuffer()],
        PROGRAM_ID
      );

      const method = program.methods.createPool || (program.methods as any).create_pool;
      await method(totalLiquidity, minBorrow, maxBorrow, interestRate)
        .accounts({
          lender: publicKey,
          loan_mint: loanMint,
          collateral_mint: collateralMint,
          lender_loan_ata: lenderLoanAta,
          pool_account: poolAccount,
          vault,
          token_program: TOKEN_PROGRAM_ID,
          system_program: SystemProgram.programId,
        } as any).rpc();

      Alert.alert("Success", "Liquidity Pool Created!");
      setShowCreateModal(false);
      fetchPoolsAndLoans();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBorrow = async () => {
    if (!provider || !publicKey || !selectedPool) return;
    const amount = parseFloat(borrowAmount);
    if (!amount) return;

    setLoading(true);
    try {
      const program = new Program(idl, provider);
      const { loanMint, collateralMint, loansCount } = selectedPool.account;
      
      const borrowerCollateralAta = await getAssociatedTokenAddress(collateralMint, publicKey);
      const borrowerLoanAta = await getAssociatedTokenAddress(loanMint, publicKey);
      
      const [poolVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_vault"), selectedPool.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [activeLoan] = PublicKey.findProgramAddressSync(
        [Buffer.from("active_loan"), publicKey.toBuffer(), selectedPool.publicKey.toBuffer(), loansCount.toArrayLike(Buffer, 'le', 8)],
        PROGRAM_ID
      );

      const [loanVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan_vault"), activeLoan.toBuffer()],
        PROGRAM_ID
      );

      const method = program.methods.takeLoan || (program.methods as any).take_loan;
      const decimals = loanMint.toBase58() === DEFAULT_USDC_TOKEN.address ? 1_000_000 : 1_000_000_000;

      await method(new anchor.BN(Math.floor(amount * decimals)))
        .accounts({
          borrower: publicKey,
          poolAccount: selectedPool.publicKey,
          poolVault,
          loanMint,
          collateralMint,
          borrowerCollateralAta,
          borrowerLoanAta,
          activeLoan,
          loanVault,
          pythPriceInfo: PYTH_SOL_USD,
          switchboardPriceInfo: SB_SOL_USD,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any).rpc();

      Alert.alert("Success", "Borrowed successfully!");
      setShowBorrowModal(false);
      fetchPoolsAndLoans();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async (loan: ActiveLoanAccount) => {
    if (!provider || !publicKey) return;
    setLoading(true);
    try {
      const program = new Program(idl, provider);
      const poolAccount = pools.find(p => p.publicKey.toBase58() === loan.account.pool.toBase58());
      if (!poolAccount) throw new Error("Pool not found");

      const [poolVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool_vault"), loan.account.pool.toBuffer()],
        PROGRAM_ID
      );

      const [loanVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan_vault"), loan.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const borrowerLoanAta = await getAssociatedTokenAddress(poolAccount.account.loanMint, publicKey);
      const borrowerCollateralAta = await getAssociatedTokenAddress(loan.account.collateralMint, publicKey);

      const method = program.methods.repayPoolLoan || (program.methods as any).repay_pool_loan;
      await method()
        .accounts({
          borrower: publicKey,
          poolAccount: loan.account.pool,
          poolVault,
          activeLoan: loan.publicKey,
          loanVault,
          loanMint: poolAccount.account.loanMint,
          collateralMint: loan.account.collateralMint,
          borrowerLoanAta,
          borrowerCollateralAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any).rpc();

      Alert.alert("Success", "Loan repaid successfully!");
      fetchPoolsAndLoans();
    } catch (err: any) {
      Alert.alert("Repayment Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidate = async (loan: ActiveLoanAccount) => {
    if (!provider || !publicKey) return;
    setLoading(true);
    try {
      const program = new Program(idl, provider);
      const [loanVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan_vault"), loan.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const lenderCollateralAta = await getAssociatedTokenAddress(loan.account.collateralMint, publicKey);

      const method = program.methods.liquidatePoolLoan || (program.methods as any).liquidate_pool_loan;
      await method()
        .accounts({
          lender: publicKey,
          poolAccount: loan.account.pool,
          activeLoan: loan.publicKey,
          loanVault,
          collateralMint: loan.account.collateralMint,
          lenderCollateralAta,
          pythPriceInfo: PYTH_SOL_USD,
          switchboardPriceInfo: SB_SOL_USD,
          tokenProgram: TOKEN_PROGRAM_ID,
        } as any).rpc();

      Alert.alert("Success", "Loan liquidated successfully!");
      fetchPoolsAndLoans();
    } catch (err: any) {
      Alert.alert("Liquidation Error", err.message);
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

  const filteredData = useMemo(() => {
    if (activeTab === 'MARKET') return pools.filter(p => p.account.lender.toBase58() !== address);
    if (activeTab === 'MY_OFFERS') return pools.filter(p => p.account.lender.toBase58() === address);
    return myLoans.filter(l => l.account.borrower.toBase58() === address || pools.find(p => p.publicKey.toBase58() === l.account.pool.toBase58())?.account.lender.toBase58() === address);
  }, [activeTab, pools, myLoans, address]);

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === 'MY_LOANS') {
      const loan = item as ActiveLoanAccount;
      const isBorrower = loan.account.borrower.toBase58() === address;
      const statusText = loan.account.status === 0 ? 'Active' : (loan.account.status === 1 ? 'Repaid' : 'Liquidated');
      
      return (
        <View style={styles.offerCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.lenderName}>{isBorrower ? 'Your Loan' : 'User Loan'}</Text>
            <View style={[styles.interestBadge, { backgroundColor: loan.account.status === 0 ? 'rgba(50, 212, 222, 0.1)' : 'rgba(255,255,255,0.05)' }]}>
              <Text style={styles.interestText}>{statusText}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statLabel}>Borrowed</Text>
              <Text style={styles.statValue}>{(loan.account.amountBorrowed.toNumber() / 1_000_000).toFixed(2)} USDC</Text>
            </View>
            <View>
              <Text style={[styles.statLabel, { textAlign: 'right' }]}>Collateral</Text>
              <Text style={[styles.statValue, { textAlign: 'right' }]}>{(loan.account.collateralAmount.toNumber() / 1_000_000_000).toFixed(2)} SKR</Text>
            </View>
          </View>
          
          {loan.account.status === 0 && isBorrower && (
            <TouchableOpacity style={styles.borrowButton} onPress={() => handleRepay(loan)}>
              <Text style={styles.borrowButtonText}>Repay Loan</Text>
            </TouchableOpacity>
          )}

          {loan.account.status === 0 && !isBorrower && (
            <TouchableOpacity style={[styles.borrowButton, { backgroundColor: COLORS.errorRed }]} onPress={() => handleLiquidate(loan)}>
              <Text style={[styles.borrowButtonText, { color: COLORS.white }]}>Check & Liquidate</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    const pool = item as LendingPoolAccount;
    const isUSDC = pool.account.loanMint.toBase58() === DEFAULT_USDC_TOKEN.address;
    const tokenSymbol = isUSDC ? 'USDC' : 'SOL';
    const decimals = isUSDC ? 1_000_000 : 1_000_000_000;

    return (
      <View style={styles.offerCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.lenderName}>{tokenSymbol} Pool by {pool.account.lender.toBase58().slice(0,4)}</Text>
          <View style={styles.interestBadge}>
            <Text style={styles.interestText}>{(pool.account.interestRate.toNumber() / 100).toFixed(1)}% APR</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statValue}>{(pool.account.remainingLiquidity.toNumber() / decimals).toFixed(2)} {tokenSymbol}</Text>
          </View>
          <View>
            <Text style={[styles.statLabel, { textAlign: 'right' }]}>Borrow Range</Text>
            <Text style={[styles.statValue, { textAlign: 'right' }]}>
              {(pool.account.minBorrow.toNumber() / decimals).toFixed(0)} - {(pool.account.maxBorrow.toNumber() / decimals).toFixed(0)} {tokenSymbol}
            </Text>
          </View>
        </View>
        {activeTab === 'MARKET' && (
          <TouchableOpacity style={styles.borrowButton} onPress={() => { setSelectedPool(pool); setShowBorrowModal(true); }}>
            <Text style={styles.borrowButtonText}>Borrow from Pool</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>P2P Lending</Text>
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'MARKET' && styles.activeTab]} onPress={() => setActiveTab('MARKET')}>
          <Text style={[styles.tabText, activeTab === 'MARKET' && styles.activeTabText]}>Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'MY_OFFERS' && styles.activeTab]} onPress={() => setActiveTab('MY_OFFERS')}>
          <Text style={[styles.tabText, activeTab === 'MY_OFFERS' && styles.activeTabText]}>Offers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'MY_LOANS' && styles.activeTab]} onPress={() => setActiveTab('MY_LOANS')}>
          <Text style={[styles.tabText, activeTab === 'MY_LOANS' && styles.activeTabText]}>Loans</Text>
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
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={item => item.publicKey.toBase58()}
        estimatedItemSize={180}
        ListHeaderComponent={<>{ListHeaderComponent && (typeof ListHeaderComponent === 'function' ? <ListHeaderComponent /> : ListHeaderComponent)}{renderHeader()}</>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandPrimary} />}
        ListEmptyComponent={() => <View style={styles.empty}><Text style={styles.emptyText}>Nothing to show here.</Text></View>}
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
