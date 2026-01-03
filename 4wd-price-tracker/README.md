# 4WD Supacentre Price Tracker

A Chrome/Edge browser extension that tracks historical prices for products on 4WD Supacentre, helping you know when to buy.

## Features

- **Track Any Product**: Click a button on any product page to start tracking
- **Price History**: See current, lowest, and highest prices at a glance
- **Local Storage**: All data stored locally on your browser
- **Export Data**: Export your tracked products and price history as JSON
- **Visual Indicators**: Clear visual feedback showing when prices are at their lowest

## Installation

### Load Unpacked Extension (Development)

1. Open Chrome/Edge
2. Navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `4wd-price-tracker` folder
6. The extension is now installed!

## Usage

### Tracking a Product

1. Visit any product page on https://www.4wdsupacentre.com.au/
2. Look for the "📈 Track This Price" button below the "Add to Cart" button
3. Click it to start tracking
4. The button will change to "📊 Tracking Price"
5. Price history will appear on the page

### Viewing All Tracked Products

1. Click the extension icon in your toolbar
2. See all tracked products with their price stats
3. Click "View Product" to open the product page
4. Click "Remove" to stop tracking a product

### Managing Data

- **Export Data**: Click "Export Data" in the popup to download your tracking data as JSON
- **Clear All**: Remove all tracked products at once

## How It Works

1. **Detection**: Content script detects when you're on a product page
2. **Extraction**: Scrapes product title, SKU, and current price
3. **Storage**: Saves data to Chrome's local storage
4. **Updates**: When you revisit a tracked product, it logs a new price point if the price has changed
5. **Display**: Shows price history and stats directly on the product page

## Data Structure

```json
{
  "trackedProducts": {
    "https://www.4wdsupacentre.com.au/product-url.html": {
      "title": "Product Name",
      "sku": "SKU123",
      "priceHistory": [
        {
          "price": 189.00,
          "timestamp": 1704326400000
        }
      ]
    }
  }
}
```

## Future Enhancements (Phase 2)

- Background script to check prices automatically
- Price drop notifications
- Price charts/graphs
- Shared price database (server-based)
- Price alerts when items reach target prices

## Technical Stack

- **Manifest V3**: Modern Chrome extension format
- **Vanilla JavaScript**: No dependencies
- **Chrome Storage API**: Local data persistence
- **Content Scripts**: DOM manipulation and scraping

## Contributing

Feel free to fork and improve! This is a community tool.

## License

MIT License - Do whatever you want with this!

## Notes

- Extension only works on 4wdsupacentre.com.au
- Prices are only updated when you visit the product page
- All data is stored locally - no cloud sync (for now)
- Works in Chrome, Edge, and other Chromium-based browsers

## Troubleshooting

**Button not appearing?**
- Make sure you're on a product page (not category/homepage)
- Refresh the page
- Check the browser console for errors

**Data not saving?**
- Check if the extension has storage permissions
- Try clearing browser cache and reloading the extension

**Want to reset everything?**
- Click "Clear All" in the extension popup
- Or go to `chrome://extensions/`, click "Details" on the extension, and "Clear storage"
