// FILE: src/components/Profile/ProfileTabs/ProfileTabs.tsx

import React, { memo, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { LinearGradient } from 'expo-linear-gradient';

import { styles, tabBarStyles, tabBarActiveColor, tabBarInactiveColor } from './ProfileTabs.style';
import ActionsPage from '../actions/ActionsPage'; // Keep for Actions tab

import COLORS from '@/assets/colors'; // Keep
import { ProfileTabsProps } from '../../types'; // Keep

// Only keep LoadingPlaceholder if needed elsewhere or by ActionsPage
const LoadingPlaceholder = memo(() => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={COLORS.brandPrimary} />
  </View>
));


/**
 * Actions tab wrapped in memo
 */
const ActionsTabContent = memo(({
  myActions,
  loadingActions,
  fetchActionsError,
}: {
  myActions: any[];
  loadingActions?: boolean;
  fetchActionsError?: string | null;
}) => (
  <ActionsPage
    myActions={myActions}
    loadingActions={loadingActions}
    fetchActionsError={fetchActionsError}
  />
));

/**
 * ProfileTabs - The main tab container that shows only Actions tab
 */
function ProfileTabs({
  myActions,
  loadingActions,
  fetchActionsError,
  // Removed: portfolioData, onRefreshPortfolio, refreshingPortfolio, onAssetPress
}: ProfileTabsProps) {
  // Tab navigation state - only one tab now
  const [index, setIndex] = useState<number>(0);
  const [routes] = useState([
    { key: 'actions', title: 'Actions' },
  ]);

  // Handle tab changes (no longer needed for multiple tabs, but keeping the structure)
  const handleIndexChange = useCallback((newIndex: number) => {
    setIndex(newIndex);
  }, []);

  // Memoize scene components
  const actionsSceneData = useMemo(() => ({
    myActions,
    loadingActions,
    fetchActionsError,
    // Removed: portfolioData, onRefreshPortfolio, refreshingPortfolio, onAssetPress
  }), [
    myActions,
    loadingActions,
    fetchActionsError,
  ]);

  const ActionsScene = useMemo(
    () => () => <ActionsTabContent {...actionsSceneData} />,
    [actionsSceneData]
  );

  // Scene map for the tab view - only one scene
  const renderScene = useMemo(
    () => SceneMap({
      actions: ActionsScene,
    }),
    [ActionsScene]
  );

  // Custom tab bar renderer - will render a single tab for "Actions"
  const renderTabBar = useCallback(
    (props: any) => (
      <View style={tabBarStyles.gradientContainer}>
        <TabBar
          {...props}
          style={tabBarStyles.tabBarContainer}
          labelStyle={tabBarStyles.label}
          activeColor={tabBarActiveColor}
          inactiveColor={tabBarInactiveColor}
          indicatorStyle={tabBarStyles.indicator}
          pressColor="transparent"
          pressOpacity={0.8}
        />
        <LinearGradient
          colors={['transparent', COLORS.lightBackground]}
          style={tabBarStyles.bottomGradient}
        />
      </View>
    ),
    [],
  );

  const initialLayout = useMemo(() => ({ width: 300, height: 300 }), []);

  return (
    <View style={styles.tabView}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={handleIndexChange}
        renderTabBar={renderTabBar}
        // Disable horizontal swipe
        swipeEnabled={false}
        lazy
        lazyPreloadDistance={0}
        renderLazyPlaceholder={() => <LoadingPlaceholder />}
        removeClippedSubviews={true}
        initialLayout={initialLayout}
      />
    </View>
  );
}

// Optimized re-renders with memoization and detailed prop comparison
const MemoizedProfileTabs = memo(ProfileTabs, (prevProps, nextProps) => {
  // Compare by reference for array props
  if (prevProps.myActions !== nextProps.myActions) return false;
  // Removed portfolioData comparison
  // if (prevProps.portfolioData !== nextProps.portfolioData) return false;

  // Simple equality for loading/error states
  if (prevProps.loadingActions !== nextProps.loadingActions) return false;
  if (prevProps.fetchActionsError !== nextProps.fetchActionsError) return false;
  // Removed refreshingPortfolio comparison
  // if (prevProps.refreshingPortfolio !== nextProps.refreshingPortfolio) return false;

  // Compare callbacks by reference
  // Removed onRefreshPortfolio and onAssetPress comparison
  // if (prevProps.onRefreshPortfolio !== nextProps.onRefreshPortfolio) return false;
  // if (prevProps.onAssetPress !== nextProps.onAssetPress) return false;

  return true;
});

export default MemoizedProfileTabs;