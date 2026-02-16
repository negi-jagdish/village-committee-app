const { Jimp } = require('jimp');

async function testJimp() {
    try {
        const image = await Jimp.read('/Users/jagdishnegi/.gemini/antigravity/brain/e5183c87-5bb6-4d59-9bd4-bc9a3156cccb/media__1771246942463.jpg');
        console.log('Image loaded:', image.width, image.height);

        // Try resizing
        image.resize({ w: 100, h: 100 });
        console.log('Resized with object arg');

    } catch (error) {
        console.error('Error with object arg:', error);
        try {
            // Re-read for fresh instance
            const img2 = await Jimp.read('/Users/jagdishnegi/.gemini/antigravity/brain/e5183c87-5bb6-4d59-9bd4-bc9a3156cccb/media__1771246942463.jpg');
            img2.resize(100, 100);
            console.log('Resized with args');
        } catch (err2) {
            console.error('Error with args:', err2);
        }
    }
}

testJimp();
