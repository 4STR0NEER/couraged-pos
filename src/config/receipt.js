// Receipt printer settings. Edit, then rebuild/redeploy for the POS to pick them up.
export const RECEIPT = {
  storeName: 'CourageD',
  logo: '/assets/logo.jpg', // '' to print without a logo
  // Up to 3 lines under the store name, e.g. address, phone, website. Leave '' to skip a line.
  headerLines: ['', '', ''],
  footerLines: ['Thank you!'],
  paperWidth: 58, // 58 or 80 (mm), match the roll in the Xprinter (XP-58IIH = 58)
  autoPrint: false, // true = print as soon as a sale is saved, without pressing Print receipt
}
