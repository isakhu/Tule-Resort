export interface ResortBankAccount {
  code: string;
  name: string;
  accountNumber: string;
  accountHolder: string;
  accountSuffix?: string;
  type: 'Mobile Money' | 'Bank Transfer';
  color: string;
  badge: string;
}

export const RESORT_BANK_ACCOUNTS: Record<string, ResortBankAccount> = {
  telebirr: {
    code: 'telebirr',
    name: 'Telebirr (Ethio Telecom)',
    accountNumber: '0995781422',
    accountHolder: 'Yishak Tule Karesso',
    type: 'Mobile Money',
    color: '#0172BB',
    badge: 'Tb',
  },
  cbe_birr: {
    code: 'cbe_birr',
    name: 'CBE Birr',
    accountNumber: '0995781422',
    accountHolder: 'Yishak Tule Karesso',
    type: 'Mobile Money',
    color: '#8C2D85',
    badge: 'CBE',
  },
  cbebirr: {
    code: 'cbebirr',
    name: 'CBE Birr',
    accountNumber: '0995781422',
    accountHolder: 'Yishak Tule Karesso',
    type: 'Mobile Money',
    color: '#8C2D85',
    badge: 'CBE',
  },
  mpesa: {
    code: 'mpesa',
    name: 'Safaricom M-Pesa',
    accountNumber: '0710028022',
    accountHolder: 'Yishak Tule Karesso',
    type: 'Mobile Money',
    color: '#2CB34A',
    badge: 'M-Pesa',
  },
  cbe: {
    code: 'cbe',
    name: 'Commercial Bank of Ethiopia (CBE)',
    accountNumber: '1000575458711',
    accountHolder: 'Yishak Tule Karesso',
    accountSuffix: '58711',
    type: 'Bank Transfer',
    color: '#8C2D85',
    badge: 'CBE',
  },
  awash: {
    code: 'awash',
    name: 'Awash Bank',
    accountNumber: '01320687351800',
    accountHolder: 'Yishak Tule Karesso',
    accountSuffix: '351800',
    type: 'Bank Transfer',
    color: '#F7923A',
    badge: 'Awash',
  },
  boa: {
    code: 'boa',
    name: 'Bank of Abyssinia (BOA)',
    accountNumber: '138186512',
    accountHolder: 'Yishak Tule Karesso',
    accountSuffix: '86512',
    type: 'Bank Transfer',
    color: '#F5A400',
    badge: 'BOA',
  },
};

export function getResortAccount(bankCode?: string): ResortBankAccount | undefined {
  if (!bankCode) return undefined;
  const clean = bankCode.toLowerCase().replace(/[-\s]/g, '_');
  return RESORT_BANK_ACCOUNTS[clean];
}
