const Jimp = require('jimp'),
    {jpgImage, pngImage} = require('./test/fixtures/MediaServiceFixtures'),
    {IMAGE_TYPES} = require('./constants');

describe('Given we want to get the mime type from a file', () => {
    describe('when mime type is image/jpeg', () => {
        it('then the correct value should be returned', async () => {
            const {getMimeType} = require('./MediaService');

            const result = getMimeType(jpgImage);

            expect(result).toBe(IMAGE_TYPES.JPG.mimeType);
        });
    });

    describe('when mime type is image/png', () => {
        it('then it should return unknown', () => {
            const {getMimeType} = require('./MediaService');
            const result = getMimeType(pngImage);

            expect(result).toBe(IMAGE_TYPES.UNKNOWN.mimeType);
        });
    });

    describe('when generating thumbnails', () => {
        it('then resize should be correct', async () => {
            const {generateThumbnailBuffer} = require('./MediaService');
            const originalImage = await Jimp.read(Buffer.from(jpgImage));
            const result = await generateThumbnailBuffer(Buffer.from(jpgImage));
            const thumbnail = await Jimp.read(result);

            expect(thumbnail.bitmap.width).toBe(originalImage.bitmap.width);
            expect(thumbnail.bitmap.height).toBe(originalImage.bitmap.height);
        });
    });
});
