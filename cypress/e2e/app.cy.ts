describe('App', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('should navigate between pages', () => {
        // Check home page
        cy.url().should('include', '/');
        cy.contains('Welcome to SoulPet');

        // Navigate to pets page
        cy.get('[data-test="nav-pets"]').click();
        cy.url().should('include', '/pets');
        cy.contains('My Pets');

        // Navigate to marketplace
        cy.get('[data-test="nav-marketplace"]').click();
        cy.url().should('include', '/marketplace');
        cy.contains('Marketplace');
    });

    it('should handle wallet connection', () => {
        // Check initial state
        cy.get('[data-test="wallet-btn"]').should('contain', 'Connect Wallet');

        // Mock wallet connection
        cy.window().then((win) => {
            win.solana = {
                isPhantom: true,
                connect: cy.stub().resolves(),
            };
        });

        // Click connect button
        cy.get('[data-test="wallet-btn"]').click();

        // Verify connected state
        cy.get('[data-test="wallet-btn"]').should('not.contain', 'Connect Wallet');
    });

    it('should create a new pet', () => {
        // Navigate to create pet page
        cy.get('[data-test="create-pet-btn"]').click();
        cy.url().should('include', '/pets/create');

        // Fill out form
        cy.get('[data-test="pet-name-input"]').type('Test Pet');
        cy.get('[data-test="pet-type-select"]').select('Dog');
        cy.get('[data-test="pet-description-input"]').type(
            'A test pet description'
        );

        // Submit form
        cy.get('[data-test="submit-pet-btn"]').click();

        // Verify success
        cy.contains('Pet created successfully');
        cy.url().should('include', '/pets');
    });

    it('should handle errors gracefully', () => {
        // Force error state
        cy.intercept('POST', '/api/pets', {
            statusCode: 500,
            body: { error: 'Server error' },
        });

        // Attempt pet creation
        cy.get('[data-test="create-pet-btn"]').click();
        cy.get('[data-test="pet-name-input"]').type('Test Pet');
        cy.get('[data-test="submit-pet-btn"]').click();

        // Verify error message
        cy.contains('Error creating pet');
    });

    it('should search pets', () => {
        // Enter search term
        cy.get('[data-test="search-input"]').type('dog');

        // Verify filtered results
        cy.get('[data-test="pet-card"]')
            .should('have.length.gt', 0)
            .each(($card) => {
                cy.wrap($card).should('contain', 'dog');
            });
    });

    it('should filter marketplace items', () => {
        cy.get('[data-test="nav-marketplace"]').click();

        // Apply price filter
        cy.get('[data-test="price-filter"]').type('100');

        // Apply type filter
        cy.get('[data-test="type-filter"]').select('Dog');

        // Verify filtered results
        cy.get('[data-test="marketplace-item"]')
            .should('have.length.gt', 0)
            .each(($item) => {
                cy.wrap($item)
                    .find('[data-test="item-price"]')
                    .invoke('text')
                    .then(parseFloat)
                    .should('be.lte', 100);

                cy.wrap($item).should('contain', 'Dog');
            });
    });
});

describe('App E2E', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('should display the home page', () => {
        cy.get('h1').should('contain', 'SoulPet');
    });

    describe('Theme Switching', () => {
        it('should switch between light and dark themes', () => {
            // Open theme switcher menu
            cy.get('button[aria-label="Toggle theme"]').click();

            // Switch to dark theme
            cy.contains('Dark').click();
            cy.get('html').should('have.class', 'dark');

            // Switch to light theme
            cy.get('button[aria-label="Toggle theme"]').click();
            cy.contains('Light').click();
            cy.get('html').should('not.have.class', 'dark');
        });
    });

    describe('Navigation', () => {
        it('should navigate to different pages', () => {
            // Navigate to NFTs page
            cy.contains('NFTs').click();
            cy.url().should('include', '/nfts');

            // Navigate to activity history page
            cy.contains('Activity History').click();
            cy.url().should('include', '/activity');

            // Navigate to settings page
            cy.contains('Settings').click();
            cy.url().should('include', '/settings');
        });
    });

    describe('Error Handling', () => {
        it('should handle and display errors correctly', () => {
            // Mock network error
            cy.intercept('GET', '/api/**', {
                statusCode: 500,
                body: 'Server error',
            });

            // Visit page that requires API call
            cy.visit('/nfts');

            // Verify error message is displayed
            cy.contains('Error occurred').should('be.visible');
            cy.contains('Retry').click();
        });
    });

    describe('Wallet Connection', () => {
        it('should handle wallet connection', () => {
            // Click connect wallet button
            cy.contains('Connect Wallet').click();

            // Select Phantom wallet
            cy.contains('Phantom').click();

            // Verify connection status
            cy.get('[data-testid="wallet-address"]').should('exist');
        });
    });

    describe('Settings', () => {
        it('should handle settings changes', () => {
            // Visit settings page
            cy.visit('/settings');

            // Change theme
            cy.get('select#theme').select('dark');
            cy.get('html').should('have.class', 'dark');

            // Clear data
            cy.contains('Clear All Data').click();
            cy.contains('Data cleared').should('be.visible');
        });
    });
});
