import addon from '../../../addon/main'

class WindowInspector {
    constructor(hwnd){
        this.hwnd = hwnd;
        this.screenshots = [];
        this.maxScreenshotHistory = 2;
    }

    appendScreenshot(shot){
        this.screenshots.unshift(shot);
        if(this.screenshots.length > this.maxScreenshotHistory) this.screenshots.pop();
    }

    getWindowLoc(){
        const rect = addon.GetWindowRect(this.hwnd)
        return {
            x: rect['left'],
            y: rect['top'],
            w: rect['right'] - rect['left'],
            h: rect['bottom'] - rect['top'],
        }
    }

    screenshot(){
        addon.
    }
}

hwnd = addon.GetForegroundWindow()
wi = WindowInspector(hwnd)
img1 = wi.screenshot()
img2 = wi.screenshot()
wi.compareScreenshots(img1, img2)