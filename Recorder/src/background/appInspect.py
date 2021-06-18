from win32gui import GetWindowRect, GetForegroundWindow

import mss          #screenshots
import mss.tools    #screenshots

import time

import numpy as np
import cv2
import imutils
from PIL import Image, ImageChops




class WindowInspector:
    def __init__(self, hwnd):
        self.hwnd = hwnd
        self.screenshots = []
        self.maxScreenshotHistory = 2

    def appendScreenshot(self, scrnsht):
        self.screenshots.insert(0, scrnsht)
        if len(self.screenshots) > self.maxScreenshotHistory:
            del self.screenshots[-(len(self.screenshots) - self.maxScreenshotHistory)]


    def getLoc(self):
        rect = GetWindowRect(self.hwnd)
        return {
            "x": rect[0],
            "y": rect[1],
            "w": rect[2] - rect[0],
            "h": rect[3] - rect[1],
        }

    def screenshot(self):
        loc = self.getLoc()
        with mss.mss() as sct:
            monitor = {'top': loc['y'], 'left': loc['x'], 'width': loc['w'], 'height': loc['h']}
            img = sct.grab(monitor)
            # mss.tools.to_png(img.rgb, img.size, output='images/0.png')
            pimg = Image.frombytes('RGB', img.size, img.rgb)
            self.appendScreenshot(pimg)
            return pimg

    def find_contours(self, img):
        img = np.array(img)*255
        cimg = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(cimg, 0.4, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        regions = []
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            regions.append((x,y,w,h))
        return regions

    def compareScreenshots(self, shot1, shot2):
        diff = ImageChops.difference(shot1, shot2)
        regions = self.find_contours(diff)
        diff = np.array(diff)
        for (x,y,w,h) in regions:
            print(x,y,w,h)
            #cv2.rectangle(diff, (x, y), (x + w, y + h), (0, 0, 255), 2)

        cv2.imshow("img", diff)
        cv2.waitKey()

            
            

hwnd = GetForegroundWindow()
wi = WindowInspector(hwnd)
print('screenshot1')
img1 = wi.screenshot()
time.sleep(2)
print('screenshot2')
img2 = wi.screenshot()
wi.compareScreenshots(img1, img2)
