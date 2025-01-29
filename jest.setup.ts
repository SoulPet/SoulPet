import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
        };
    },
    useSearchParams() {
        return {
            get: jest.fn(),
        };
    },
}));

// Mock next-themes
jest.mock('next-themes', () => ({
    useTheme() {
        return {
            theme: 'light',
            setTheme: jest.fn(),
        };
    },
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.crypto
const cryptoMock = {
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
};
global.crypto = cryptoMock as Crypto;

// Clean up all mocks
afterEach(() => {
    jest.clearAllMocks();
});
