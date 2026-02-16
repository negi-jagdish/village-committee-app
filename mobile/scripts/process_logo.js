const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

async function processLogo(inputPath) {
    console.log(`Processing: ${inputPath}`);
    try {
        const image = await Jimp.read(inputPath);
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const minDim = Math.min(width, height);

        // 1. CROP: Center square to fix Aspect Ratio (Oval issue)
        const cropX = (width - minDim) / 2;
        const cropY = (height - minDim) / 2;

        console.log(`Cropping center square: ${minDim}x${minDim} at ${cropX},${cropY}`);
        image.crop({ x: cropX, y: cropY, w: minDim, h: minDim });

        // 2. Base Logo (Circle) for processing
        // The source image likely has corners we want to remove for the "round" concept.
        // We'll use this 'baseRound' for legacy round icons and in-app logo.
        const baseRound = image.clone().circle();

        // --- Android Configuration ---
        const androidResDir = path.join(__dirname, '../android/app/src/main/res');

        // Adaptive Icon Configuration
        const androidSizes = [
            { folder: 'mipmap-mdpi', size: 48, foreground: 108 },
            { folder: 'mipmap-hdpi', size: 72, foreground: 162 },
            { folder: 'mipmap-xhdpi', size: 96, foreground: 216 },
            { folder: 'mipmap-xxhdpi', size: 144, foreground: 324 },
            { folder: 'mipmap-xxxhdpi', size: 192, foreground: 432 },
        ];

        // Ensure directories exist
        androidSizes.forEach(config => {
            const dir = path.join(androidResDir, config.folder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        // Create mipmap-anydpi-v26 for Adaptive Icons
        const anydpiDir = path.join(androidResDir, 'mipmap-anydpi-v26');
        if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

        // Update XMLs to use mipmap reference
        // Using @color/splash_background (#1a5f2a) for background.
        const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/splash_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveIconXml);
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveIconXml);
        console.log('Generated mipmap-anydpi-v26 XMLs');

        // Generate Android Icons
        console.log('Generating Android Icons...');
        for (const config of androidSizes) {
            const size = config.size;
            const iconPath = path.join(androidResDir, config.folder, 'ic_launcher.png');
            const roundIconPath = path.join(androidResDir, config.folder, 'ic_launcher_round.png');
            const foregroundPath = path.join(androidResDir, config.folder, 'ic_launcher_foreground.png');

            // 1. Legacy Square Icon
            // Current thought: User wants "Full Area". 
            // If we just resize the square crop, it fills the square.
            const squareIcon = image.clone().resize({ w: size, h: size });
            await squareIcon.write(iconPath);
            console.log(`  ${config.folder}/ic_launcher.png`);

            // 2. Legacy Round Icon
            // Resize and circle mask.
            const roundIcon = image.clone().resize({ w: size, h: size }).circle();
            await roundIcon.write(roundIconPath);
            console.log(`  ${config.folder}/ic_launcher_round.png`);

            // 3. Adaptive Foreground
            // User wants "Full Area" and "Circular".
            // We'll put the circular logo on the transparent foreground canvas.
            // Scale: 72dp is the safe zone diameter in a 108dp canvas. 72/108 = 0.66.
            // If we match 0.66, it fits perfectly in the mask.
            // User says "Full Area", so let's push it slightly to 0.75 or 0.8
            // 0.8 * 108 = 86.4dp. This will clip the edges of the circle if the mask is a strict circle (72dp).
            // But usually the mask is a squircle or circle.
            // Let's stick to a safe 0.70 to avoid clipping text/details, but fill most of the "icon" feel.
            // Wait, if users want "Full Area", they might hate the padding.
            // Let's try 0.80.

            const fgSize = config.foreground;
            const scaleFactor = 0.85; // Aggressive fill
            const logoSize = Math.floor(fgSize * scaleFactor);
            const margin = (fgSize - logoSize) / 2;

            const foregroundCanvas = new Jimp({ width: fgSize, height: fgSize, color: 0x00000000 }); // Transparent
            const logoResized = image.clone().resize({ w: logoSize, h: logoSize }).circle();

            foregroundCanvas.composite(logoResized, margin, margin);
            await foregroundCanvas.write(foregroundPath);
            console.log(`  ${config.folder}/ic_launcher_foreground.png`);
        }


        // --- iOS Configuration ---
        const iosIconDir = path.join(__dirname, '../ios/VillageCommitteeApp/Images.xcassets/AppIcon.appiconset');
        if (!fs.existsSync(iosIconDir)) fs.mkdirSync(iosIconDir, { recursive: true });

        // iOS Sizes
        const iosSizes = [
            { name: 'Icon-20x20@2x.png', size: 40 },
            { name: 'Icon-20x20@3x.png', size: 60 },
            { name: 'Icon-29x29@2x.png', size: 58 },
            { name: 'Icon-29x29@3x.png', size: 87 },
            { name: 'Icon-40x40@2x.png', size: 80 },
            { name: 'Icon-40x40@3x.png', size: 120 },
            { name: 'Icon-60x60@2x.png', size: 120 },
            { name: 'Icon-60x60@3x.png', size: 180 },
            { name: 'Icon-1024.png', size: 1024 },
        ];

        console.log('Generating iOS Icons...');
        for (const config of iosSizes) {
            const iconPath = path.join(iosIconDir, config.name);
            const icon = image.clone().resize({ w: config.size, h: config.size });
            await icon.write(iconPath);
            console.log(`  ${config.name}`);
        }

        // Update Contents.json
        const contentsJsonPath = path.join(iosIconDir, 'Contents.json');
        const contents = {
            "images": [
                { "size": "20x20", "idiom": "iphone", "filename": "Icon-20x20@2x.png", "scale": "2x" },
                { "size": "20x20", "idiom": "iphone", "filename": "Icon-20x20@3x.png", "scale": "3x" },
                { "size": "29x29", "idiom": "iphone", "filename": "Icon-29x29@2x.png", "scale": "2x" },
                { "size": "29x29", "idiom": "iphone", "filename": "Icon-29x29@3x.png", "scale": "3x" },
                { "size": "40x40", "idiom": "iphone", "filename": "Icon-40x40@2x.png", "scale": "2x" },
                { "size": "40x40", "idiom": "iphone", "filename": "Icon-40x40@3x.png", "scale": "3x" },
                { "size": "60x60", "idiom": "iphone", "filename": "Icon-60x60@2x.png", "scale": "2x" },
                { "size": "60x60", "idiom": "iphone", "filename": "Icon-60x60@3x.png", "scale": "3x" },
                { "size": "1024x1024", "idiom": "ios-marketing", "filename": "Icon-1024.png", "scale": "1x" }
            ],
            "info": { "version": 1, "author": "xcode" }
        };
        fs.writeFileSync(contentsJsonPath, JSON.stringify(contents, null, 2));


        // --- In-App Assets ---
        console.log('Generating In-App Assets...');
        const assetsDir = path.join(__dirname, '../src/assets');
        if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

        // Logo (Round)
        const logoPath = path.join(assetsDir, 'logo.png');
        await image.clone().resize({ w: 512, h: 512 }).circle().write(logoPath);
        console.log('  src/assets/logo.png');

        // Copy to Android Drawable for Splash (256x256)
        const androidDrawableDir = path.join(androidResDir, 'drawable');
        if (!fs.existsSync(androidDrawableDir)) fs.mkdirSync(androidDrawableDir, { recursive: true });
        const androidLogoPath = path.join(androidDrawableDir, 'logo.png');
        await image.clone().resize({ w: 256, h: 256 }).circle().write(androidLogoPath);
        console.log('  android/app/src/main/res/drawable/logo.png');

        console.log('Done!');

    } catch (error) {
        console.error('Error processing image:', error);
    }
}

const input = process.argv[2];
if (input) {
    processLogo(input);
} else {
    console.log('Please provide input image path');
}
