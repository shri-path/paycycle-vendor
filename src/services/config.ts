/**
 * API Service Configuration
 * Purpose: Switch between mock and real API modes
 * Usage: Import and use API_MODE to determine which implementation to use
 */

/**
 * API Mode Configuration
 * 'mock': Use mock data for development
 * 'real': Use real API endpoints (requires backend)
 */
export const API_MODE = (process.env.REACT_APP_API_MODE || 'mock') as 'mock' | 'real'

/**
 * Check if using mock mode
 */
export const isMockMode = API_MODE === 'mock'

/**
 * API Configuration
 */
export const API_CONFIG = {
  mode: API_MODE,
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  mockDelay: 500, // Simulate network delay in mock mode
}

/**
 * Simulate network delay for realistic UX testing
 */
export const simulateNetworkDelay = async (): Promise<void> => {
  if (isMockMode) {
    return new Promise((resolve) => {
      setTimeout(resolve, API_CONFIG.mockDelay)
    })
  }
}

export default API_CONFIG
