/**
 * Auth Type Definitions
 * Purpose: DTOs aligned with paycycle_api auth module contracts
 */

export interface UserDto {
  id: string
  phone: string
  name: string | null
  email: string | null
  profilePhotoUrl: string | null
  preferredLanguage: string
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TokenDto {
  accessToken: string
  refreshToken: string
}

export interface VendorContextDto {
  vendorId: string
  vendorName: string
  role: string
}

export interface SignupResponseDto {
  user: UserDto
  tokens: TokenDto
  vendorContext: VendorContextDto
}

export interface LoginResponseDto {
  user: UserDto
  tokens: TokenDto
  vendorContexts: VendorContextDto[]
}

export interface RefreshResponseDto {
  accessToken: string
  refreshToken: string
}
