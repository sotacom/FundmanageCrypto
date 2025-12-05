export interface Account {
    id: string
    fundId: string
    name: string
    type: AccountType
    platform?: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    balances?: {
        usdt: number
        btc: number
    }
}

export type AccountType = 'cex' | 'earn_lending' | 'cold_wallet' | 'other'

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
    cex: 'Sàn CEX',
    earn_lending: 'Earn/Lending',
    cold_wallet: 'Ví lạnh',
    other: 'Khác'
}

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
    { value: 'cex', label: 'Sàn CEX' },
    { value: 'earn_lending', label: 'Earn/Lending' },
    { value: 'cold_wallet', label: 'Ví lạnh' },
    { value: 'other', label: 'Khác' }
]
