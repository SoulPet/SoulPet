import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        video: false,
        screenshotOnRunFailure: false,
        viewportWidth: 1280,
        viewportHeight: 720,
    },
    component: {
        devServer: {
            framework: 'next',
            bundler: 'webpack',
        },
        supportFile: 'cypress/support/component.ts',
        specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    },
}) 