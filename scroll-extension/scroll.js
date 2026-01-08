(function() {
    const scrollSettings = [
        {
            pattern: /meteoswiss\.admin\.ch\/local-forecasts\/zurich\/8001\.html/,
            pixels: 750
        },
        {
            pattern: /.meteoswiss\.admin\.ch/,
            pixels: 450
        },
        {
            pattern: /google\.com\/maps/,
            pixels: 600
        },
        {
            pattern: /zvv\.ch/,
            pixels: 400
        }
    ];

    const url = window.location.href;

    for (const setting of scrollSettings) {
        if (setting.pattern.test(url)) {
            console.log(`[AutoScroll] Scrolling ${setting.pixels}px for ${url}`);
            window.scrollTo({ top: setting.pixels, behavior: 'smooth' });

            // If you want it to scroll again (e.g., in case page loads more content)
            // setTimeout(() => {
            //     window.scrollTo({ top: setting.pixels, behavior: 'smooth' });
            // }, 3000);
            break;
        }
    }
})();
