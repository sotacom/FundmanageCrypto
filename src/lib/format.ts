/**
 * Format number theo chuẩn Việt Nam
 * - Dấu . phân cách ngàn
 * - Dấu , phân cách thập phân
 */

export function formatNumber(value: number, decimals: number = 2): string {
    return value.toLocaleString('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })
}

export function formatCurrency(amount: number, currency: string): string {
    if (currency === 'VND') {
        // VND: không có phần thập phân
        return `${formatNumber(amount, 0)} VND`
    } else if (currency === 'BTC') {
        // BTC: 8 chữ số thập phân
        return `${formatNumber(amount, 8)} BTC`
    } else if (currency === 'USDT') {
        // USDT: 2 chữ số thập phân
        return `${formatNumber(amount, 2)} USDT`
    } else {
        // Default: 2 chữ số thập phân
        return `${formatNumber(amount, 2)} ${currency}`
    }
}

export function formatPercentage(value: number, decimals: number = 2): string {
    return `${formatNumber(value, decimals)}%`
}
