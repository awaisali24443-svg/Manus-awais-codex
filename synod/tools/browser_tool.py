import os
import asyncio
from playwright.async_api import async_playwright, Page, Browser

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../workspace"))
SCREENSHOTS_DIR = os.path.join(WORKSPACE_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class BrowserTool:
    def __init__(self):
        self.playwright = None
        self.browser: Browser = None
        self.page: Page = None

    async def _ensure_browser(self):
        if not self.browser:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            self.page = await self.browser.new_page()

    async def browser_open(self, url: str) -> str:
        await self._ensure_browser()
        await self.page.goto(url)
        title = await self.page.title()
        screenshot_path = await self.browser_screenshot()
        return f"Opened {url}. Title: {title}. Screenshot saved to {screenshot_path}"

    async def browser_click(self, selector: str) -> bool:
        await self._ensure_browser()
        try:
            await self.page.click(selector, timeout=5000)
            return True
        except Exception:
            return False

    async def browser_extract(self, selector: str) -> str:
        await self._ensure_browser()
        try:
            element = await self.page.wait_for_selector(selector, timeout=5000)
            if element:
                return await element.inner_text()
            return ""
        except Exception:
            return ""

    async def browser_execute_js(self, script: str) -> str:
        await self._ensure_browser()
        try:
            result = await self.page.evaluate(script)
            return str(result)
        except Exception as e:
            return f"Error executing JS: {e}"

    async def browser_fill_form(self, selector: str, value: str) -> bool:
        await self._ensure_browser()
        try:
            await self.page.fill(selector, value, timeout=5000)
            return True
        except Exception:
            return False

    async def browser_screenshot(self) -> str:
        await self._ensure_browser()
        import uuid
        import glob
        filename = f"screenshot_{uuid.uuid4().hex[:8]}.png"
        path = os.path.join(SCREENSHOTS_DIR, filename)
        await self.page.screenshot(path=path)
        
        # Cleanup old screenshots, keep only the latest 5
        try:
            files = sorted(glob.glob(os.path.join(SCREENSHOTS_DIR, "screenshot_*.png")), key=os.path.getmtime, reverse=True)
            for old_file in files[5:]:
                os.remove(old_file)
        except Exception as e:
            pass # Ignore cleanup errors
            
        return path

    async def close(self):
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None


