/**
 * CustomersScreen
 * Purpose: Display list of customers with search and filter
 */

import React, { useEffect, useState } from 'react'
import {
  View,
  SafeAreaView,
  StyleSheet,
  FlatList,
} from 'react-native'
import { useTranslation } from '@hooks/useTranslation'
import { useAppStore } from '@store/appStore'
import {
  AppHeader,
  AppSearchBar,
  AppListItem,
  AppLoader,
  AppEmptyState,
} from '@components/index'
import { customerService } from '@services/api.service'
import type { Customer } from '../types'

/**
 * CustomersScreen: Display and manage customers
 */
export const CustomersScreen: React.FC = () => {
  const { t } = useTranslation()
  const { isLoading, setLoading } = useAppStore()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])

  // Load customers on mount
  useEffect(() => {
    const loadCustomers = async (): Promise<void> => {
      setLoading(true)
      try {
        const data = await customerService.getAll()
        setCustomers(data)
        setFilteredCustomers(data)
      } catch (error) {
        console.error('Error loading customers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [setLoading])

  // Handle search
  const handleSearch = async (query: string): Promise<void> => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = await customerService.search(query)
      setFilteredCustomers(results)
    } else {
      setFilteredCustomers(customers)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F0F2F5',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title={t('customer.title')} />
        <AppLoader />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={t('customer.title')}
        showMenu
        onMenuPress={() => {}}
      />

      <View style={styles.content}>
        <AppSearchBar
          placeholder={t('customer.name')}
          value={searchQuery}
          onChangeText={handleSearch}
          containerStyle={{ marginBottom: 16 }}
        />

        {filteredCustomers.length === 0 ? (
          <AppEmptyState
            icon="📭"
            title="No customers found"
            description="Try searching with different keywords or add a new customer"
          />
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View>
                <AppListItem
                  title={item.name}
                  subtitle={`${item.phone} • ${item.city}`}
                  avatar={item.name.charAt(0)}
                  onPress={() => {}}
                  showDivider={index < filteredCustomers.length - 1}
                />
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

export default CustomersScreen
