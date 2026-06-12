/**
 * Add Extra Charge route — /(app)/deliveries/add-extra-charge (US-006).
 * Thin wrapper rendering AddExtraChargeScreen (owner + staff with add_extra_charges).
 */

import AddExtraChargeScreen from '@modules/delivery/screens/AddExtraChargeScreen'

export default function AddExtraChargeRoute() {
  return <AddExtraChargeScreen />
}
