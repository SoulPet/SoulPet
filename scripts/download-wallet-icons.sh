#!/bin/bash

# Create wallets directory if it doesn't exist
mkdir -p public/wallets

# Download wallet icons
curl -o public/wallets/phantom.svg "https://raw.githubusercontent.com/phantom-labs/phantom-logo/master/phantom-logo.svg"
curl -o public/wallets/solflare.svg "https://raw.githubusercontent.com/solflare-wallet/solflare-logos/master/svg/solflare-logo.svg"
curl -o public/wallets/backpack.svg "https://raw.githubusercontent.com/coral-xyz/backpack/master/assets/backpack.svg"
curl -o public/wallets/coinbase.svg "https://www.coinbase.com/img/favicon/favicon.ico"
curl -o public/wallets/brave.svg "https://brave.com/static-assets/images/brave-logo-dark.svg"
curl -o public/wallets/exodus.svg "https://www.exodus.com/img/logos/exodus-logo.svg"
curl -o public/wallets/torus.svg "https://tor.us/images/torus-logo-blue.svg"

# Make script executable
chmod +x scripts/download-wallet-icons.sh

echo "Wallet icons downloaded successfully!" 