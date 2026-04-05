/**
 * HomeScreen
 * Purpose: Main home screen showing dashboard and quick actions
 * Key interactions: Display summary stats, recent transactions, quick action buttons
 */

import React, { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native'
import { useTranslation } from '@hooks/useTranslation'
import { useAppStore } from '@store/appStore'
import {
  AppHeader,
  AppCard,
  AppButton,
  AppLoader,
  AppListItem,
  AppBadge,
  AppAlert,
  AppStatsCard,
  AppSection,
} from '@components/index'
import { customerService, ledgerService } from '@services/api.service'
import type { LedgerEntry, Customer } from '../types'


/**
 * HomeScreen: Main dashboard for vendor
 */
export const HomeScreen: React.FC = () => {
  const { t } = useTranslation()
  const { isOnline, isLoading, setLoading } = useAppStore()

  const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([])
  const [topCustomers, setTopCustomers] = useState<Customer[]>([])

  // Load data on mount
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setLoading(true)
      try {
        const entries = await ledgerService.getEntries()
        const customers = await customerService.getActive()

        // Get most recent entries
        setRecentEntries(entries.slice(-5).reverse())

        // Get top 3 customers
        setTopCustomers(customers.slice(0, 3))
      } catch (error) {
        console.error('Error loading home data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [setLoading])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F0F2F5',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    statsContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      marginVertical: 4,
      color: '#075E54',
    },
    sectionTitle: {
      marginTop: 16,
      marginBottom: 8,
      fontWeight: '600',
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
    },
    listContainer: {
      marginBottom: 16,
    },
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title={t('home.title')} />
        <AppLoader />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t('home.title')} showNotification notificationBadge={2} />

      {!isOnline && (
        <AppAlert
          type="offline"
          title={t('common.offline')}
          message={t('common.offline_message')}
        />
      )}

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <AppStatsCard
              //icon="wallet"
              label={t('ledger.outstanding')}
              value="₹8,500"
              badge="5 customers"
              badgeVariant="warning"
              containerStyle={{ flex: 1 }}
            />

            <AppStatsCard
              //icon="people"
              label={t('customer.title')}
              value="145"
              badge="Active"
              badgeVariant="success"
              containerStyle={{ flex: 1 }}
            />

            <AppStatsCard
              //icon="bar-chart"
              label={t('home.collection')}
              value="₹45K"
              badge="This month"
              badgeVariant="primary"
              containerStyle={{ flex: 1 }}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <AppButton
              label={t('ledger.add_credit')}
              onPress={() => {}}
              variant="primary"
              size="md"
              style={styles.actionButton}
            />
            <AppButton
              label={t('ledger.add_payment')}
              onPress={() => {}}
              variant="secondary"
              size="md"
              style={styles.actionButton}
            />
          </View>

          {/* Recent Transactions */}
          <AppSection title={t('home.recent')}>
            <AppCard style={styles.listContainer}>
              <FlatList
                data={recentEntries}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View>
                    <AppListItem
                      title={item.customerName}
                      subtitle={`${t('ledger.amount')}: ₹${item.amount}`}
                      rightContent={
                        <AppBadge
                          label={item.type}
                          variant={item.type === 'credit' ? 'warning' : 'success'}
                          size="sm"
                        />
                      }
                      showDivider={index < recentEntries.length - 1}
                    />
                  </View>
                )}
              />
            </AppCard>
          </AppSection>

          {/* Top Customers */}
          <AppSection title="Top Customers">
            <AppCard style={styles.listContainer}>
              <FlatList
                data={topCustomers}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => (
                  <View>
                    <AppListItem
                      title={item.name}
                      subtitle={item.phone}
                      avatar={item.name.charAt(0)}
                      showDivider={index < topCustomers.length - 1}
                    />
                  </View>
                )}
              />
            </AppCard>
          </AppSection>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default HomeScreen
