import type { Fund, Account, Transaction, AssetHolding, Fee } from '@prisma/client'

/**
 * Current backup format version
 * v1.0.0 - Original format without timezone
 * v2.0.0 - Added timezone field to fund
 */
export const BACKUP_VERSION = '2.0.0'

/**
 * Backup data structure
 */
export interface BackupData {
    version: string
    exportedAt: string
    fundName: string
    data: {
        fund: Fund
        accounts: Account[]
        transactions: Transaction[]
        assetHoldings: AssetHolding[]
        fees: Fee[]
    }
}

/**
 * Validate backup file structure
 */
export function validateBackupFile(data: any): { valid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Invalid backup file: Not a valid JSON object' }
    }

    if (!data.version || typeof data.version !== 'string') {
        return { valid: false, error: 'Invalid backup file: Missing or invalid version' }
    }

    if (!data.exportedAt || typeof data.exportedAt !== 'string') {
        return { valid: false, error: 'Invalid backup file: Missing or invalid exportedAt timestamp' }
    }

    if (!data.fundName || typeof data.fundName !== 'string') {
        return { valid: false, error: 'Invalid backup file: Missing or invalid fundName' }
    }

    if (!data.data || typeof data.data !== 'object') {
        return { valid: false, error: 'Invalid backup file: Missing or invalid data object' }
    }

    const requiredFields = ['fund', 'accounts', 'transactions', 'assetHoldings', 'fees']
    for (const field of requiredFields) {
        if (!data.data[field]) {
            return { valid: false, error: `Invalid backup file: Missing ${field} in data` }
        }
    }

    if (!data.data.fund.id || typeof data.data.fund.id !== 'string') {
        return { valid: false, error: 'Invalid backup file: Fund ID is missing or invalid' }
    }

    if (!Array.isArray(data.data.accounts)) {
        return { valid: false, error: 'Invalid backup file: accounts must be an array' }
    }

    if (!Array.isArray(data.data.transactions)) {
        return { valid: false, error: 'Invalid backup file: transactions must be an array' }
    }

    if (!Array.isArray(data.data.assetHoldings)) {
        return { valid: false, error: 'Invalid backup file: assetHoldings must be an array' }
    }

    if (!Array.isArray(data.data.fees)) {
        return { valid: false, error: 'Invalid backup file: fees must be an array' }
    }

    return { valid: true }
}

/**
 * Check if backup version is compatible with current version
 * Version 2.0 accepts both v1.x and v2.x backups
 */
export function checkBackupCompatibility(version: string): {
    compatible: boolean
    warning?: string
    needsTimezone?: boolean  // v1.x backups need timezone input
} {
    const backupMajor = parseInt(version.split('.')[0])

    // Accept v1.x and v2.x
    if (backupMajor === 1 || backupMajor === 2) {
        if (backupMajor === 1) {
            return {
                compatible: true,
                warning: `Backup phiên bản ${version} (cũ) sẽ được chuyển đổi sang phiên bản ${BACKUP_VERSION}`,
                needsTimezone: true
            }
        }
        return { compatible: true }
    }

    return {
        compatible: false,
        warning: `Backup version ${version} is not compatible with current version ${BACKUP_VERSION}.`
    }
}

/**
 * Download backup file to browser
 */
export function downloadBackupFile(data: BackupData, fundName: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `fundmanage-backup-${fundName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // Save timestamp to localStorage
    localStorage.setItem('lastBackupTimestamp', new Date().toISOString())
}

/**
 * Parse uploaded backup file
 */
export async function parseBackupFile(file: File): Promise<BackupData> {
    return new Promise((resolve, reject) => {
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            reject(new Error('File quá lớn. Kích thước tối đa là 10MB'))
            return
        }

        // Check file type
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            reject(new Error('File không đúng định dạng. Vui lòng chọn file JSON'))
            return
        }

        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const data = JSON.parse(content)
                resolve(data)
            } catch (error) {
                reject(new Error('Không thể đọc file JSON. File có thể bị hỏng hoặc không đúng định dạng'))
            }
        }

        reader.onerror = () => {
            reject(new Error('Lỗi khi đọc file'))
        }

        reader.readAsText(file)
    })
}

/**
 * Get last backup timestamp from localStorage
 */
export function getLastBackupTimestamp(): string | null {
    return localStorage.getItem('lastBackupTimestamp')
}

/**
 * Format timestamp for display
 */
export function formatBackupTimestamp(isoString: string): string {
    const date = new Date(isoString)
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}
