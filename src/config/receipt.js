// Receipt printer settings. Edit, then rebuild/redeploy for the POS to pick them up.
export const RECEIPT = {
  storeName: 'CourageD',
  // Up to 3 lines under the store name, e.g. address, phone, website. Leave '' to skip a line.
  headerLines: ['', '', ''],
  footer: 'Thank you! Keep your courage up.',
  paperWidth: 80, // 58 or 80 (mm), match the roll in the Xprinter
}
