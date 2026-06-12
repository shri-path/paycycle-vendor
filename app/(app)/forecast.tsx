/**
 * Supply Forecast route — /(app)/forecast (US-010)
 * Owner-only drill-down. useRequireOwner() is called inside SupplyForecastScreen.
 */

import SupplyForecastScreen from '@modules/dashboard/screens/SupplyForecastScreen'

export default function ForecastRoute() {
  return <SupplyForecastScreen />
}
