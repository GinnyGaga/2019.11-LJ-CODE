from selenium.webdriver.support.ui import WebDriverWait


# 自己定义的find_element方法
def find_element(driver, search_buttn):
    return WebDriverWait(driver, 10).until(lambda s: s.find_element(*search_buttn))