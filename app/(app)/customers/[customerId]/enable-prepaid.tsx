/**
 * Enable Prepaid route — /(app)/customers/[customerId]/enable-prepaid (US-012)
 * Owner-only. EnablePrepaidScreen handles the useRequireOwner() guard.
 */

import EnablePrepaidScreen from '@modules/credit/screens/EnablePrepaidScreen'

export default function EnablePrepaidRoute() {
  return <EnablePrepaidScreen />
}
