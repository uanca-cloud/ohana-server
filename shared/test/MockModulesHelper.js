const mockFetch = (mockData, mockOk, mockStatus, mockText) => {
    jest.mock('node-fetch', () =>
        jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(mockData),
                ok: mockOk,
                status: mockStatus,
                text: () => Promise.resolve(mockText)
            })
        )
    );
};

module.exports = {
    mockFetch
};
