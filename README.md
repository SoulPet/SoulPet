<div align="center">
  <img src="public/logo.svg" alt="SoulPet Logo" width="200" height="200">
</div>

# SoulPet - Digital Pet Memorial Platform

A blockchain and AI-powered platform that provides emotional solace and permanent memorials for pet owners who have lost their beloved companions. We aim to help pets "live on" through technology while maintaining the emotional connection between pets and their owners.

## Official Channels

- Twitter: [SoulPet_AI](https://x.com/SoulPet_AI)

## Core Values

- Providing emotional support and permanent memorials through blockchain technology and AI
- Enabling pets to "live on" in new forms through technological innovation
- Contributing to animal welfare with a portion of proceeds supporting stray animal causes
- Building a compassionate community for pet owners to share memories and support each other

## Table of Contents

- [Core Modules](#core-modules)
- [Technical Architecture](#technical-architecture)
- [Development Roadmap](#development-roadmap)
- [Features](#features)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

## Current Version Status

Our current version is in the testing phase and may contain some bugs and instabilities. Our development team is continuously updating and debugging the platform, with plans to release more stable versions in the future.

We warmly welcome members of the open-source community to participate and help us identify potential issues. Every suggestion is valuable to us, and we are committed to carefully considering and actively implementing improvements. Let's work together to advance this project and contribute to promoting harmonious relationships between humans and their pets.

## Core Modules

### 1. Token System

- Ecosystem-driven token design
- Token holder privileges and benefits
- Phased feature unlocking
- Governance participation rights

### 2. Pet Digitalization

- Pet data collection (photos, videos, voice recordings, personality descriptions)
- Blockchain-based digital identity
- Commemorative NFT generation
- Virtual space display and sharing

### 3. AI Interaction System

- AI-powered pet personality reconstruction
- Personalized interaction models
- Continuous learning from user input
- Natural language processing for pet-like responses

### 4. 3D Modeling & Physical Representation

- 3D virtual pet model creation
- 3D printed figurine services
- AR/VR interaction experiences
- Customizable pet animations

### 5. Community Ecosystem

- Pet memorial community platform
- Story sharing and memory preservation
- Online/offline community events
- Animal welfare foundation support

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SoulPet Platform Core                     │
├──────────┬──────────┬─────────────┬────────────┬───────────┤
│  Token   │   NFT    │     AI      │    3D      │ Community │
│  System  │ Manager  │  Interface  │  Renderer  │  Portal   │
├──────────┼──────────┼─────────────┼────────────┼───────────┤
│ Blockchain Layer │ AI Processing │ 3D Engine │  Social Hub  │
└──────────────────┴──────────────┴───────────┴──────────────┘
```

### Core Services

```
src/
├── blockchain/
│   ├── contracts/              # Smart contracts
│   ├── token/                  # Token management
│   └── nft/                    # NFT implementation
├── ai/
│   ├── personality/            # Pet personality modeling
│   ├── interaction/            # Interactive responses
│   └── learning/              # Continuous learning
├── modeling/
│   ├── generator/             # 3D model generation
│   ├── renderer/              # Real-time rendering
│   └── ar-vr/                 # AR/VR experiences
└── community/
    ├── social/                # Social interactions
    ├── events/                # Event management
    └── foundation/            # Charity foundation
```

## Development Roadmap

### Phase 1: Foundation (Q1 2025)

- Token launch and ecosystem foundation
- Project vision and roadmap introduction
- Community building initiation
- Basic platform infrastructure

### Phase 2: NFT Integration (Q2 2025)

- Pet memorial NFT functionality
- Community NFT design voting
- Limited edition NFT privileges
- NFT marketplace launch

### Phase 3: AI Implementation (Q3 2025)

- AI pet interaction features
- Priority access for token holders
- Personalization services
- Advanced interaction models

### Phase 4: Extended Features (Q4 2025)

- 3D printing services
- AR/VR functionality
- Enhanced interaction methods
- Complete ecosystem integration

## Features

### Token Utilities

- Governance participation
- Feature access privileges
- Community rewards
- Charity contribution options

### Pet Memorialization

- Digital pet profiles
- Memory preservation
- Interactive experiences
- Community sharing

### AI Capabilities

- Personality reconstruction
- Natural interactions
- Learning algorithms
- Emotional response system

### Technical Features

- Blockchain security
- AI processing
- 3D rendering
- AR/VR integration

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Solidity >= 0.8.0
- MetaMask or other Web3 wallet
- MongoDB >= 5.0
- Solana CLI >= 1.16.0
- Anchor Framework >= 0.28.0
- Rust >= 1.70.0

### For Users

```bash
# Install SoulPet mobile app
1. Download from App Store or Google Play
2. Create account and connect wallet
3. Start creating your pet's digital memorial
```

### For Developers

```bash
# Clone the repository
git clone https://github.com/soulpet/platform.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development environment
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Configuration

1. Database Setup
```bash
# Update MongoDB connection string in .env
MONGODB_URI=your_mongodb_connection_string
```

2. Blockchain Configuration
```bash
# Configure Solana network in .env
SOLANA_NETWORK=mainnet-beta  # or devnet, testnet
SOLANA_RPC_URL=your_solana_rpc_url
PROGRAM_ID=your_program_id

# Configure wallet
SOLANA_WALLET_PATH=/path/to/your/wallet.json
```

3. AI Service Setup
```bash
# Set up AI service credentials in .env
AI_API_KEY=your_ai_service_api_key
```

### Deployment

1. Production Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

2. Docker Deployment
```bash
# Build Docker image
docker build -t soulpet .

# Run Docker container
docker run -p 3000:3000 soulpet
```

### Common Issues

1. **Wallet Connection Issues**
   - Ensure MetaMask or other Web3 wallet is properly installed
   - Check if you're connected to the correct network

2. **Smart Contract Interaction Errors**
   - Verify you have sufficient network tokens for gas fees
   - Ensure contract ABI is up to date

3. **Development Environment Setup**
   - Clear npm cache if dependencies fail to install
   - Check Node.js version compatibility

## Contributing

### Code Style Guidelines

- Follow the project's ESLint and Prettier configurations
- Write meaningful commit messages following [Conventional Commits](https://www.conventionalcommits.org/)
- Maintain consistent code formatting
- Add appropriate comments and documentation
- Write unit tests for new features

### Pull Request Process

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Ensure all tests pass (`npm test`)
5. Update documentation if needed
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request with detailed description

### Code Review Guidelines

- All code changes require review
- Address review comments promptly
- Maintain a respectful and constructive dialogue
- Ensure CI/CD checks pass

## Changelog

### [0.3.0] - 2025-01-29
- Enhanced AI interaction capabilities
- Improved 3D model rendering
- Added new NFT features

### [0.2.0] - 2025-01-15
- Implemented basic AI personality reconstruction
- Added NFT minting functionality
- Integrated blockchain wallet connection
- Enhanced user profile management

### [0.1.0] - 2024-12-01
- Initial release
- Basic platform structure
- User authentication system
- Simple pet memorial creation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
